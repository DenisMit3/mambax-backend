"""
Chat WebSocket endpoint and WS event handlers.
"""

import json
import asyncio
import logging
import random
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.core.security import verify_token
from backend.core.config import settings
from backend.core.redis import redis_manager
from backend.services.chat import (
    manager,
    set_typing,
    add_reaction,
    remove_reaction,
    initiate_call,
    answer_call,
    end_call,
    send_webrtc_signal,
    increment_unread,
)
from backend.db.session import async_session_maker
from backend.metrics import ACTIVE_USERS_GAUGE, MESSAGES_COUNTER

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@router.websocket("/chat/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    🔌 Unified WebSocket for Chat, Calls, and Real-time events.
    Path: /chat/ws

    FIX (SEC-005): Token is now sent via first message instead of URL path
    to prevent token leakage in server logs.

    First message must be: {"type": "auth", "token": "..."}
    """
    await websocket.accept()

    try:
        try:
            data = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            auth_msg = json.loads(data)

            if auth_msg.get("type") != "auth" or not auth_msg.get("token"):
                await websocket.close(code=4001, reason="First message must be auth")
                return

            token = auth_msg["token"]
            user_id = verify_token(token)
            if not user_id:
                await websocket.close(code=4001, reason="Invalid token")
                return

        except asyncio.TimeoutError:
            await websocket.close(code=4001, reason="Auth timeout")
            return
        except json.JSONDecodeError:
            await websocket.close(code=4001, reason="Invalid auth message")
            return

    except Exception:
        await websocket.close(code=4001, reason="Auth failed")
        return

    await manager.connect(websocket, user_id)
    ACTIVE_USERS_GAUGE.inc()

    await websocket.send_json({"type": "auth_success", "user_id": user_id})

    try:
        while True:
            data = await websocket.receive_text()

            if not await redis_manager.rate_limit(f"chat:ws:{user_id}", limit=5, period=1):
                await websocket.send_json({"type": "error", "message": "Rate limit exceeded. Slow down."})
                continue

            try:
                message = json.loads(data)
                event_type = message.get("type", "message")

                if event_type == "message":
                    await _handle_message(websocket, user_id, message)

                elif event_type == "photo":
                    message["type"] = "message"
                    message["msg_type"] = "photo"
                    await _handle_message(websocket, user_id, message)

                elif event_type == "voice":
                    message["type"] = "message"
                    message["msg_type"] = "voice"
                    await _handle_message(websocket, user_id, message)

                elif event_type == "typing":
                    if "receiver_id" in message and "match_id" not in message:
                        message["recipient_id"] = message.get("receiver_id")
                    await _handle_typing(user_id, message)

                elif event_type == "read":
                    await _handle_read(user_id, message)

                elif event_type == "reaction":
                    await _handle_reaction(user_id, message)

                elif event_type == "gift_read":
                    await _handle_gift_read(user_id, message, websocket)

                elif event_type == "call":
                    await _handle_call(user_id, message)

                elif event_type == "offer":
                    await _handle_webrtc_offer(user_id, message)

                elif event_type == "answer":
                    await _handle_webrtc_answer(user_id, message)

                elif event_type == "candidate":
                    await _handle_webrtc_candidate(user_id, message)

                elif event_type == "call_end":
                    await _handle_webrtc_end(user_id, message)

                elif event_type == "ping":
                    await websocket.send_json({"type": "pong"})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except Exception as e:
                logger.error(f"WS Error: {e}")
                await websocket.send_json({"type": "error", "message": "Internal error"})

    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WS unexpected error for user {user_id}: {e}")
    finally:
        ACTIVE_USERS_GAUGE.dec()
        manager.disconnect(websocket, user_id)

        try:
            from backend.models.user import User
            async with async_session_maker() as db:
                user = await db.get(User, UUID(user_id))
                if user:
                    user.last_seen = datetime.now(timezone.utc)
                    await db.commit()
        except Exception as e:
            logger.error(f"Failed to update last_seen: {e}")


# ============================================================================
# WS HANDLERS (private)
# ============================================================================

async def _handle_message(websocket: WebSocket, sender_id: str, data: dict):
    match_id = data.get("match_id")
    text = data.get("content") or data.get("text")
    msg_type = data.get("msg_type") or data.get("type", "text")

    if msg_type == "message":
        msg_type = "text"

    if not match_id:
        return

    from backend.services.security import spam_detector
    if text:
        check = await spam_detector.check_message(sender_id, text)
        if check["is_spam"]:
            await websocket.send_json({
                "type": "error",
                "detail": check["message"],
                "reason": check["reason"]
            })
            return

    from backend.crud import chat as crud_chat
    from backend.models.interaction import Match

    async with async_session_maker() as db:
        match_obj = await db.get(Match, UUID(match_id))
        if not match_obj:
            await websocket.send_json({"type": "error", "message": "Match not found"})
            return

        recipient_id = str(match_obj.user2_id) if str(match_obj.user1_id) == sender_id else str(match_obj.user1_id)

        if str(match_obj.user1_id) != sender_id and str(match_obj.user2_id) != sender_id:
            return

        msg_data = {
            "receiver_id": UUID(recipient_id),
            "text": text,
            "type": msg_type,
            "audio_url": data.get("media_url") if msg_type == "voice" else None,
            "duration": data.get("duration"),
            "photo_url": data.get("media_url") if msg_type == "photo" else None
        }

        db_msg = await crud_chat.create_message(db, UUID(match_id), UUID(sender_id), msg_data)
        MESSAGES_COUNTER.inc()

        from backend.services.gamification import check_and_award_badge
        await check_and_award_badge(sender_id, "conversationalist", db)

        content_extras = {}
        if msg_type == "voice":
            content_extras["media_url"] = db_msg.audio_url
            content_extras["duration"] = db_msg.duration
        elif msg_type == "photo":
            content_extras["media_url"] = db_msg.photo_url
            content_extras["photo_url"] = db_msg.photo_url

        ws_msg = {
            "id": str(db_msg.id),
            "message_id": str(db_msg.id),
            "match_id": str(db_msg.match_id),
            "sender_id": str(db_msg.sender_id),
            "receiver_id": str(db_msg.receiver_id),
            "content": db_msg.text,
            "text": db_msg.text,
            "type": msg_type,
            "created_at": db_msg.created_at.isoformat(),
            "timestamp": db_msg.created_at.isoformat(),
            **content_extras
        }

        await manager.send_to_match(match_id, sender_id, recipient_id, {
            "type": msg_type,
            **ws_msg
        })

        # Shadow chat: broadcast к невидимым наблюдателям (админам)
        try:
            from backend.api.admin import shadow_chat_observers
            observers = shadow_chat_observers.get(str(match_id), set())
            if observers:
                shadow_msg = {
                    "type": "new_message",
                    "id": str(db_msg.id),
                    "match_id": str(db_msg.match_id),
                    "sender_id": str(db_msg.sender_id),
                    "content": db_msg.text,
                    "msg_type": msg_type,
                    "created_at": db_msg.created_at.isoformat(),
                    **content_extras,
                }
                dead = set()
                for obs_ws in observers:
                    try:
                        await obs_ws.send_json(shadow_msg)
                    except Exception:
                        dead.add(obs_ws)
                observers -= dead
        except Exception:
            pass

        # Push Notification if offline
        push_body = text or "New message"
        if msg_type == "voice":
            push_body = "🎤 Voice message"
        if msg_type == "photo":
            push_body = "📷 Photo"

        if not await manager.is_online_async(recipient_id):
            await increment_unread(recipient_id, match_id)
            
            # Create in-app notification + push
            try:
                from backend.services.notify import notify_new_message
                from backend.models.user import User as UserModel
                sender = await db.get(UserModel, UUID(sender_id))
                sender_name = sender.name if sender else "Кто-то"
                await notify_new_message(
                    db,
                    recipient_id=recipient_id,
                    sender_id=sender_id,
                    sender_name=sender_name,
                    message_preview=push_body,
                    match_id=match_id,
                )
            except Exception as e:
                logger.error(f"Notification error on message: {e}")
                # Fallback to direct push
                from backend.services.notification import send_push_notification
                await send_push_notification(
                    db,
                    user_id=UUID(recipient_id),
                    title="New Message",
                    body=push_body,
                    url=f"/chat/{match_id}"
                )

            # Telegram Bot notification (always for offline users)
            try:
                from backend.services.telegram_notify import notify_user_new_message
                from backend.models.user import User as UserModel
                if not sender_name or sender_name == "Кто-то":
                    sender_obj = await db.get(UserModel, UUID(sender_id))
                    sender_name = sender_obj.name if sender_obj else "Кто-то"
                await notify_user_new_message(
                    db,
                    recipient_id=recipient_id,
                    sender_id=sender_id,
                    sender_name=sender_name,
                    message_preview=push_body,
                    match_id=match_id,
                )
            except Exception as e:
                logger.error(f"Telegram notification error: {e}")

        # AUTO-RESPONDER BOT (DEVELOPMENT ONLY)
        if settings.ENVIRONMENT == "development":
            BOT_RESPONSES = [
                "Привет! 👋",
                "Интересно! Расскажи подробнее 😊",
                "О, круто! А ты чем занимаешься?",
                "Хаха, смешно 😂",
                "Согласна! 💯",
                "Ммм, надо подумать... 🤔",
                "Классно! А что ещё любишь?",
                "Ого, вот это да!",
                "А давай как-нибудь встретимся? ☕",
                "Мне тоже нравится! 🥰"
            ]

            _match_id = match_id
            _sender_id = sender_id
            _recipient_id = recipient_id

            async def send_bot_reply():
                try:
                    await asyncio.sleep(random.uniform(1.5, 3.0))
                    bot_text = random.choice(BOT_RESPONSES)
                    bot_msg_data = {
                        "receiver_id": UUID(_sender_id),
                        "text": bot_text,
                        "type": "text",
                        "audio_url": None,
                        "duration": None,
                        "photo_url": None
                    }
                    async with async_session_maker() as bot_db:
                        bot_db_msg = await crud_chat.create_message(
                            bot_db, UUID(_match_id), UUID(_recipient_id), bot_msg_data
                        )
                        bot_ws_msg = {
                            "type": "text",
                            "id": str(bot_db_msg.id),
                            "message_id": str(bot_db_msg.id),
                            "match_id": str(bot_db_msg.match_id),
                            "sender_id": str(bot_db_msg.sender_id),
                            "receiver_id": str(bot_db_msg.receiver_id),
                            "content": bot_db_msg.text,
                            "text": bot_db_msg.text,
                            "created_at": bot_db_msg.created_at.isoformat(),
                            "timestamp": bot_db_msg.created_at.isoformat()
                        }
                        await manager.send_personal(_sender_id, bot_ws_msg)
                        logger.info(f"Bot replied to {_sender_id[:8]}...: {bot_text}")
                except Exception as e:
                    logger.error(f"Bot reply error: {e}")

            asyncio.create_task(send_bot_reply())


async def _handle_typing(user_id: str, data: dict):
    match_id = data.get("match_id")
    is_typing = data.get("is_typing", False)

    if match_id:
        await set_typing(match_id, user_id, is_typing)
        recipient_id = data.get("recipient_id") or data.get("receiver_id")
        if recipient_id:
            await manager.send_personal(recipient_id, {
                "type": "typing",
                "match_id": match_id,
                "user_id": user_id,
                "is_typing": is_typing
            })


async def _handle_read(user_id: str, data: dict):
    match_id = data.get("match_id")
    message_ids = data.get("message_ids")
    sender_id = data.get("sender_id")

    if match_id and message_ids:
        from backend.crud import chat as crud_chat
        from backend.models.chat import Message
        from sqlalchemy import select

        async with async_session_maker() as db:
            valid_message_ids = []
            original_sender_id = None

            # Bulk-запрос вместо N отдельных get (N+1 fix)
            try:
                uuids = [UUID(mid) for mid in message_ids]
            except ValueError as e:
                logger.warning(f"Invalid UUID in message_ids: {e}")
                return

            result = await db.execute(
                select(Message).where(Message.id.in_(uuids))
            )
            msgs = result.scalars().all()

            for msg in msgs:
                if str(msg.receiver_id) == user_id:
                    valid_message_ids.append(msg.id)
                    if not original_sender_id:
                        original_sender_id = str(msg.sender_id)

            if not valid_message_ids:
                return

            rowcount = await crud_chat.mark_messages_as_read(db, valid_message_ids, UUID(user_id))

            if rowcount > 0:
                broadcast_ids = [str(mid) for mid in valid_message_ids]
                # Determine who to notify: explicit recipient_id/sender_id, or auto-detect from message
                recipient_id = data.get("recipient_id") or sender_id or original_sender_id
                if recipient_id and broadcast_ids:
                    await manager.send_personal(recipient_id, {
                        "type": "read",
                        "match_id": match_id,
                        "reader_id": user_id,
                        "message_ids": broadcast_ids
                    })


async def _handle_reaction(user_id: str, data: dict):
    message_id = data.get("message_id")
    emoji = data.get("emoji")
    recipient_id = data.get("recipient_id") or data.get("receiver_id")

    if emoji:
        event = await add_reaction(message_id, user_id, emoji)
    else:
        event = await remove_reaction(message_id, user_id)

    if recipient_id:
        await manager.send_personal(recipient_id, event)


async def _handle_gift_read(user_id: str, data: dict, websocket: WebSocket):
    transaction_id = data.get("transaction_id")
    if transaction_id:
        try:
            from backend.models.monetization import GiftTransaction
            async with async_session_maker() as db:
                tx = await db.get(GiftTransaction, UUID(transaction_id))
                if tx and str(tx.receiver_id) == user_id and not tx.is_read:
                    tx.is_read = True
                    tx.read_at = datetime.now(timezone.utc)
                    await db.commit()
                    await websocket.send_json({
                        "type": "gift_read_ack",
                        "transaction_id": transaction_id,
                        "status": "success"
                    })
        except Exception as e:
            logger.error(f"Error marking gift as read: {e}")


async def _handle_call(user_id: str, data: dict):
    action = data.get("action")
    if action == "initiate":
        match_id = data.get("match_id")
        callee_id = data.get("callee_id")
        call_type = data.get("call_type", "video")
        await initiate_call(match_id, user_id, callee_id, call_type)
    elif action == "answer":
        await answer_call(data.get("call_id"), user_id, data.get("accept", False))
    elif action == "end":
        await end_call(data.get("call_id"), user_id)
    elif action == "signal":
        await send_webrtc_signal(
            data.get("call_id"), user_id, data.get("to_user"),
            data.get("signal_type"), data.get("signal_data")
        )


async def _handle_webrtc_offer(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "offer",
            "offer": data.get("offer"),
            "caller_id": user_id,
            "match_id": data.get("match_id")
        })


async def _handle_webrtc_answer(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "answer",
            "answer": data.get("answer"),
            "answerer_id": user_id,
            "match_id": data.get("match_id")
        })


async def _handle_webrtc_candidate(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "candidate",
            "candidate": data.get("candidate"),
            "from_user": user_id,
            "match_id": data.get("match_id")
        })


async def _handle_webrtc_end(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "call_end",
            "from_user": user_id,
            "match_id": data.get("match_id")
        })
