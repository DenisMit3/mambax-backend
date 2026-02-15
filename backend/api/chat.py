"""
Chat API & WebSocket
===============================
Unified endpoints for real-time messaging, calling, and interactions.
"""

import json
from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, File, UploadFile, Header, Query
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.core.security import verify_token
from backend.core.redis import redis_manager
# Use the advanced service manager instead of the core one
from backend.services.chat import (
    manager,
    set_typing,
    get_typing_users,
    mark_as_read,
    add_reaction,
    remove_reaction,
    search_gifs,
    get_trending_gifs,
    initiate_call,
    answer_call,
    end_call,
    send_webrtc_signal,
    create_ephemeral_message,
    mark_ephemeral_viewed,
    get_unread_count,
    increment_unread,
    get_online_status,
    format_last_seen,
    ChatEvent,
    AVAILABLE_REACTIONS,
    create_text_message,
    create_photo_message,
    create_voice_message
)
from backend.db.session import async_session_maker
from backend import database, auth, crud, models
from backend.schemas.chat import MessageResponse
from backend.metrics import ACTIVE_USERS_GAUGE, MESSAGES_COUNTER



# Explicitly no prefix on the router itself, so we can control paths manually (e.g. /chat/...)
# or we could add prefix="/chat" but we need to match legacy /chat/history endpoints.
# The user asked for clean merge.
router = APIRouter(tags=["Chat"])

# ============================================================================
# SCHEMAS
# ============================================================================

class SendMessageRequest(BaseModel):
    match_id: str
    text: Optional[str] = None
    type: str = "text"
    media_url: Optional[str] = None
    photo_url: Optional[str] = None # Backwards compatibility
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    gif_id: Optional[str] = None
    reply_to_id: Optional[str] = None
    is_ephemeral: bool = False
    ephemeral_seconds: int = 10

class TypingRequest(BaseModel):
    match_id: str
    is_typing: bool

class MarkReadRequest(BaseModel):
    match_id: str
    message_ids: Optional[List[str]] = None

class ReactionRequest(BaseModel):
    message_id: str
    emoji: Optional[str] = None  # None = remove reaction

class CallRequest(BaseModel):
    match_id: str
    call_type: str = "video"  # "audio" or "video"

class AnswerCallRequest(BaseModel):
    call_id: str
    accept: bool

class WebRTCSignalRequest(BaseModel):
    call_id: str
    to_user: str
    signal_type: str  # "offer", "answer", "ice-candidate"
    signal_data: dict


class QOTDAnswerRequest(BaseModel):
    match_id: str
    answer: str


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
    # Accept connection first, then wait for auth message
    await websocket.accept()
    
    try:
        # Wait for auth message (timeout 10 seconds)
        import asyncio
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
    
    # Connect with verified user_id
    await manager.connect(websocket, user_id)
    ACTIVE_USERS_GAUGE.inc()
    
    # Send auth success confirmation
    await websocket.send_json({"type": "auth_success", "user_id": user_id})
    ACTIVE_USERS_GAUGE.inc()

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            
            # Redis-based Rate Limiting (5 msgs per second)
            if not await redis_manager.rate_limit(f"chat:ws:{user_id}", limit=5, period=1):
                 await websocket.send_json({"type": "error", "message": "Rate limit exceeded. Slow down."})
                 continue


            try:
                message = json.loads(data)
                event_type = message.get("type", "message")
                
                # --- Message Handling ---
                if event_type == "message":
                    await handle_message(websocket, user_id, message)
                
                elif event_type == "photo":
                    message["type"] = "message"
                    message["msg_type"] = "photo"
                    await handle_message(websocket, user_id, message)
                
                elif event_type == "voice":
                    message["type"] = "message"
                    message["msg_type"] = "voice"
                    await handle_message(websocket, user_id, message)
                
                # --- Typing ---
                elif event_type == "typing":
                    if "receiver_id" in message and "match_id" not in message:
                         message["recipient_id"] = message.get("receiver_id")
                    await handle_typing(user_id, message)
                
                # --- Read Receipts ---
                elif event_type == "read":
                    await handle_read(user_id, message)
                
                # --- Reactions ---
                elif event_type == "reaction":
                    await handle_reaction(user_id, message)

                # --- Gift Notifications ---
                elif event_type == "gift_read":
                    await handle_gift_read(user_id, message, websocket)
                
                # --- Calls & WebRTC ---
                elif event_type == "call":
                    await handle_call(user_id, message)
                
                elif event_type == "offer":
                    await handle_webrtc_offer(user_id, message)
                
                elif event_type == "answer":
                    await handle_webrtc_answer(user_id, message)
                
                elif event_type == "candidate":
                    await handle_webrtc_candidate(user_id, message)
                
                elif event_type == "call_end":
                    await handle_webrtc_end(user_id, message)
                
                elif event_type == "ping":
                    await websocket.send_json({"type": "pong"})
            
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except Exception as e:
                print(f"WS Error: {e}")
                await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        ACTIVE_USERS_GAUGE.dec()
        await manager.broadcast_online_status(user_id, False)
        
        # Update last_seen in database
        try:
            from backend.models.user import User
            async with async_session_maker() as db:
                user = await db.get(User, UUID(user_id))
                if user:
                    user.last_seen = datetime.utcnow()
                    await db.commit()
        except Exception as e:
            print(f"Failed to update last_seen: {e}")


# ============================================================================
# WS HANDLERS
# ============================================================================

async def handle_message(websocket: WebSocket, sender_id: str, data: dict):
    match_id = data.get("match_id")
    text = data.get("content") or data.get("text")
    msg_type = data.get("msg_type") or data.get("type", "text")
    
    if msg_type == "message": msg_type = "text"

    # Quick validation
    if not match_id:
        return # Skip invalid

    # Anti-spam check for WebSocket
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

    # Use DB for persistence
    from backend.crud import chat as crud_chat
    from backend.models.interaction import Match

    async with async_session_maker() as db:
        match_obj = await db.get(Match, UUID(match_id))
        if not match_obj:
             await websocket.send_json({"type": "error", "message": "Match not found"})
             return
             
        # Determine recipient
        recipient_id = str(match_obj.user2_id) if str(match_obj.user1_id) == sender_id else str(match_obj.user1_id)
        
        # Access Check
        if str(match_obj.user1_id) != sender_id and str(match_obj.user2_id) != sender_id:
             return

        # Prepare payload
        msg_data = {
            "receiver_id": UUID(recipient_id),
            "text": text,
            "type": msg_type,
            "audio_url": data.get("media_url") if msg_type == "voice" else None,
            "duration": data.get("duration"),
            # Photo handling
            "photo_url": data.get("media_url") if msg_type == "photo" else None
        }

        # Create
        db_msg = await crud_chat.create_message(
            db,
            UUID(match_id),
            UUID(sender_id),
            msg_data
        )
        MESSAGES_COUNTER.inc()

        from backend.services.gamification import check_and_award_badge
        await check_and_award_badge(sender_id, "conversationalist", db)

        # Broadcast payload
        content_extras = {}
        if msg_type == "voice":
            content_extras["media_url"] = db_msg.audio_url
            content_extras["duration"] = db_msg.duration
        elif msg_type == "photo":
            content_extras["media_url"] = db_msg.photo_url
            content_extras["photo_url"] = db_msg.photo_url

        ws_msg = {
            "id": str(db_msg.id),
            "message_id": str(db_msg.id), # Compassionate for old frontend
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

        # Send to Recipient
        await manager.send_to_match(match_id, sender_id, recipient_id, {
            "type": msg_type, # Or "message"
            **ws_msg
        })

        # Push Notification if offline
        if not manager.is_online(recipient_id):
            increment_unread(recipient_id, match_id)
            from backend.services.notification import send_push_notification
            push_body = text or "New message"
            if msg_type == "voice": push_body = "🎤 Voice message"
            if msg_type == "photo": push_body = "📷 Photo"
            
            await send_push_notification(
                db,
                user_id=UUID(recipient_id),
                title="New Message",
                body=push_body,
                url=f"/chat/{match_id}"
            )

        # ============================================================
        # AUTO-RESPONDER BOT (for testing - DEVELOPMENT ONLY)
        # ============================================================
        # PERF-015: Only run in development to avoid production load
        if settings.ENVIRONMENT == "development":
            # Simulates a partner response after a short delay
            import asyncio
            import random
            
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
            
            # Capture values for the async task
            _match_id = match_id
            _sender_id = sender_id
            _recipient_id = recipient_id
            
            async def send_bot_reply():
                try:
                    await asyncio.sleep(random.uniform(1.5, 3.0))  # Random delay
                    
                    bot_text = random.choice(BOT_RESPONSES)
                    bot_msg_data = {
                        "receiver_id": UUID(_sender_id),
                        "text": bot_text,
                        "type": "text",
                        "audio_url": None,
                        "duration": None,
                        "photo_url": None
                    }
                    
                    # Create NEW database session for async task
                    async with async_session_maker() as bot_db:
                        # Save bot message to database
                        bot_db_msg = await crud_chat.create_message(
                            bot_db,
                            UUID(_match_id),
                            UUID(_recipient_id),  # Bot sends from their ID
                            bot_msg_data
                        )
                        
                        # Send via WebSocket to original sender
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
                        print(f"🤖 Bot replied to {_sender_id[:8]}...: {bot_text}")
                except Exception as e:
                    print(f"❌ Bot reply error: {e}")
            
            # Run bot reply in background (fire and forget)
            asyncio.create_task(send_bot_reply())

async def handle_typing(user_id: str, data: dict):
    match_id = data.get("match_id")
    is_typing = data.get("is_typing", False)
    
    if match_id:
        await set_typing(match_id, user_id, is_typing)
        # Broadcast to partner
        # We need recipient ID.
        recipient_id = data.get("recipient_id") or data.get("receiver_id")
        if recipient_id:
            await manager.send_personal(recipient_id, {
                "type": "typing", # Frontend expects "typing"
                "match_id": match_id,
                "user_id": user_id,
                "is_typing": is_typing
            })

async def handle_read(user_id: str, data: dict):
    match_id = data.get("match_id")
    message_ids = data.get("message_ids")
    sender_id = data.get("sender_id") # Legacy
    
    if match_id and message_ids:
        # FIX: Verify user is the receiver and only broadcast if something was updated
        from backend.crud import chat as crud_chat
        from backend.models.chat import Message
        
        async with async_session_maker() as db:
            # Verify at least one message belongs to this user as receiver
            valid_message_ids = []
            for mid in message_ids:
                try:
                    msg = await db.get(Message, UUID(mid))
                    if msg and str(msg.receiver_id) == user_id:
                        valid_message_ids.append(UUID(mid))
                except:
                    pass
            
            if not valid_message_ids:
                return  # No valid messages to mark as read
            
            rowcount = await crud_chat.mark_messages_as_read(db, valid_message_ids, UUID(user_id))
            
            # Only broadcast if something was actually updated
            if rowcount > 0:
                broadcast_ids = [str(mid) for mid in valid_message_ids]
                
                # Notify sender
                recipient_id = data.get("recipient_id") or sender_id
                if recipient_id and broadcast_ids:
                    await manager.send_personal(recipient_id, {
                        "type": "read",
                        "match_id": match_id,
                        "reader_id": user_id,
                        "message_ids": broadcast_ids
                    })

async def handle_reaction(user_id: str, data: dict):
    message_id = data.get("message_id")
    emoji = data.get("emoji")
    recipient_id = data.get("recipient_id") or data.get("receiver_id")
    
    if emoji:
        event = await add_reaction(message_id, user_id, emoji)
    else:
        event = await remove_reaction(message_id, user_id)
    
    if recipient_id:
        await manager.send_personal(recipient_id, event)

async def handle_gift_read(user_id: str, data: dict, websocket: WebSocket):
    transaction_id = data.get("transaction_id")
    if transaction_id:
        try:
            from backend.models.monetization import GiftTransaction
            async with async_session_maker() as db:
                tx = await db.get(GiftTransaction, UUID(transaction_id))
                if tx and str(tx.receiver_id) == user_id and not tx.is_read:
                    tx.is_read = True
                    tx.read_at = datetime.utcnow()
                    await db.commit()
                    await websocket.send_json({
                        "type": "gift_read_ack",
                        "transaction_id": transaction_id,
                        "status": "success"
                    })
        except Exception as e:
            print(f"Error marking gift as read: {e}")

# --- Call Handlers ---
async def handle_call(user_id: str, data: dict):
    action = data.get("action")
    if action == "initiate":
        match_id = data.get("match_id")
        callee_id = data.get("callee_id") 
        call_type = data.get("call_type", "video")
        call = await initiate_call(match_id, user_id, callee_id, call_type)
        # Notify caller handled in initiate_call for callee, here we ack caller?
    elif action == "answer":
         await answer_call(data.get("call_id"), user_id, data.get("accept", False))
    elif action == "end":
         await end_call(data.get("call_id"), user_id)
    elif action == "signal":
         await send_webrtc_signal(data.get("call_id"), user_id, data.get("to_user"), data.get("signal_type"), data.get("signal_data"))

async def handle_webrtc_offer(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "offer",
            "offer": data.get("offer"),
            "caller_id": user_id,
            "match_id": data.get("match_id")
        })

async def handle_webrtc_answer(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "answer",
            "answer": data.get("answer"),
            "answerer_id": user_id,
            "match_id": data.get("match_id")
        })

async def handle_webrtc_candidate(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "candidate",
            "candidate": data.get("candidate"),
            "from_user": user_id,
            "match_id": data.get("match_id")
        })

async def handle_webrtc_end(user_id: str, data: dict):
    receiver_id = data.get("receiver_id")
    if receiver_id:
        await manager.send_personal(receiver_id, {
            "type": "call_end",
            "from_user": user_id,
            "match_id": data.get("match_id")
        })

# ============================================================================
# REST ENDPOINTS
# ============================================================================

@router.get("/chat/history/{partner_id}", response_model=list[MessageResponse])
async def get_history(
    partner_id: UUID,
    limit: int = 50,
    current_user: str = Depends(auth.get_current_user),
):
    """
    Get chat history (Legacy REST endpoint)
    """
    current_user_id = UUID(current_user)
    async with async_session_maker() as db:
        # Verify Match
        from backend.models.interaction import Match
        from backend.models.chat import Message
        
        result = await db.execute(
             select(Match).where(
                and_(Match.is_active == True,
                     or_(
                        and_(Match.user1_id == current_user_id, Match.user2_id == partner_id),
                        and_(Match.user1_id == partner_id, Match.user2_id == current_user_id)
                     ))
             )
        )
        match = result.scalar_one_or_none()
        if not match:
            raise HTTPException(status_code=403, detail="Conversation not found")

        # Fetch messages using optimize match_id index
        stmt = (
            select(Message)
            .where(Message.match_id == match.id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        messages = list(result.scalars().all())
        messages.reverse()
        
        return [
            MessageResponse(
                id=m.id,
                match_id=m.match_id,
                sender_id=m.sender_id,
                receiver_id=m.receiver_id,
                content=m.text,
                created_at=m.created_at,
                is_read=m.is_read
            )
            for m in messages
        ]


@router.get("/chat/reactions")
async def get_reactions_endpoint():
    return {"reactions": AVAILABLE_REACTIONS}


@router.get("/chat/icebreakers")
async def get_icebreakers(
    match_id: str = Query(..., description="Match ID"),
    refresh: bool = Query(False, description="Bypass cache"),
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Get AI-generated icebreakers for a match (cached 24h)."""
    from backend.models.interaction import Match
    from backend.services.ai import ai_service

    match_obj = await db.get(Match, UUID(match_id))
    if not match_obj:
        raise HTTPException(status_code=404, detail="Match not found")
    u1, u2 = str(match_obj.user1_id), str(match_obj.user2_id)
    if current_user not in (u1, u2):
        raise HTTPException(status_code=403, detail="Access denied")

    cache_key = f"icebreakers:{match_id}"
    if not refresh:
        cached = await redis_manager.get_json(cache_key)
        if cached and isinstance(cached, list) and len(cached) > 0:
            return {"icebreakers": cached}

    icebreakers = await ai_service.generate_icebreakers(u1, u2, db, count=3)
    await redis_manager.set_json(cache_key, icebreakers, expire=86400)
    return {"icebreakers": icebreakers}


@router.post("/chat/icebreakers/used")
async def record_icebreaker_used(
    match_id: str = Query(..., description="Match ID"),
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Record that user used an icebreaker (for badge progress)."""
    from backend.models.interaction import Match
    from backend.services.gamification import check_and_award_badge

    match_obj = await db.get(Match, UUID(match_id))
    if not match_obj:
        raise HTTPException(status_code=404, detail="Match not found")
    if current_user not in (str(match_obj.user1_id), str(match_obj.user2_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    r = await redis_manager.get_redis()
    if r:
        key = f"icebreaker_used_count:{current_user}"
        try:
            await r.incr(key)
            await r.expire(key, 86400 * 365)
        except Exception:
            pass
    await check_and_award_badge(current_user, "icebreaker_master", db)
    return {"status": "ok"}


@router.get("/chat/conversation-prompts")
async def get_conversation_prompts(
    match_id: str = Query(..., description="Match ID"),
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Get prompts to restart a stalled conversation (if last message > 24h)."""
    from backend.models.interaction import Match
    from backend.models.chat import Message
    from backend.services.ai import ai_service
    from datetime import datetime, timedelta

    match_obj = await db.get(Match, UUID(match_id))
    if not match_obj:
        raise HTTPException(status_code=404, detail="Match not found")
    if current_user not in (str(match_obj.user1_id), str(match_obj.user2_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    stmt = (
        select(Message)
        .where(Message.match_id == match_obj.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    last_msg = result.scalar_one_or_none()
    threshold = datetime.utcnow() - timedelta(hours=24)
    stalled = last_msg is None or (last_msg.created_at.replace(tzinfo=None) < threshold)

    if not stalled:
        return {"prompts": [], "stalled": False}

    cache_key = f"conversation_prompts:{match_id}"
    cached = await redis_manager.get_json(cache_key)
    if cached and isinstance(cached, list) and len(cached) > 0:
        return {"prompts": cached, "stalled": True}

    prompts = await ai_service.generate_conversation_prompts(match_id, db, count=3)
    await redis_manager.set_json(cache_key, prompts, expire=3600)
    return {"prompts": prompts, "stalled": True}


@router.get("/chat/question-of-day")
async def get_question_of_day(current_user: str = Depends(auth.get_current_user)):
    """Get today's question of the day (cached 24h globally)."""
    from backend.services.ai import ai_service
    from datetime import date
    question = await ai_service.get_question_of_the_day()
    return {"question": question, "date": date.today().isoformat()}


@router.post("/chat/question-of-day/answer")
async def post_question_of_day_answer(
    req: QOTDAnswerRequest,
    current_user: str = Depends(auth.get_current_user),
):
    """Save QOTD answer and notify if both partners answered."""
    from backend.models.interaction import Match
    from datetime import date

    today = date.today().isoformat()
    async with async_session_maker() as db:
        match_obj = await db.get(Match, UUID(req.match_id))
        if not match_obj:
            raise HTTPException(status_code=404, detail="Match not found")
        u1, u2 = str(match_obj.user1_id), str(match_obj.user2_id)
        if current_user not in (u1, u2):
            raise HTTPException(status_code=403, detail="Access denied")
        partner_id = u2 if current_user == u1 else u1

    key_me = f"qotd_answer:{req.match_id}:{current_user}:{today}"
    key_partner = f"qotd_answer:{req.match_id}:{partner_id}:{today}"
    await redis_manager.set_json(key_me, {"answer": req.answer}, expire=86400)
    partner_answered = await redis_manager.get_json(key_partner) is not None

    r = await redis_manager.get_redis()
    if r:
        count_key = f"qotd_answer_count:{current_user}"
        try:
            await r.incr(count_key)
            await r.expire(count_key, 86400 * 365)
        except Exception:
            pass
    from backend.services.gamification import check_and_award_badge
    async with async_session_maker() as db:
        await check_and_award_badge(current_user, "daily_questioner", db)

    if partner_answered:
        await manager.send_personal(current_user, {"type": "qotd_both_answered", "match_id": req.match_id})
        await manager.send_personal(partner_id, {"type": "qotd_both_answered", "match_id": req.match_id})

    return {"status": "saved", "partner_answered": partner_answered}

@router.post("/chat/call/initiate")
async def initiate_call_endpoint(
    req: CallRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Determine callee logic (simplified)
    # Ideally should fetch match and get other user
    from backend.models.interaction import Match
    match_obj = await db.get(Match, UUID(req.match_id))
    if not match_obj: raise HTTPException(404, "Match not found")
    
    user1, user2 = str(match_obj.user1_id), str(match_obj.user2_id)
    callee_id = user2 if current_user == user1 else user1
    
    call = await initiate_call(req.match_id, current_user, callee_id, req.call_type)
    return {"call": call.model_dump()}

@router.post("/chat/call/answer")
async def answer_call_endpoint(req: AnswerCallRequest, current_user: str = Depends(auth.get_current_user)):
    return await answer_call(req.call_id, current_user, req.accept)

@router.post("/chat/call/end")
async def end_call_endpoint(call_id: str = Query(...), current_user: str = Depends(auth.get_current_user)):
    # Note: frontend might send in body or query, adapting to query based on signature in realtime_chat
    # Original used: async def end_call_api(call_id: str, ...)
    # If it was a POST, usually body unless specified. But FastAPI handles Query params in POST too if no body model matches.
    # Let's support Body if needed, but original code:
    # @router.post("/call/end") async def end_call_api(call_id: str, ...)
    # This implies query param in FastAPI for POST unless Body is used.
    # We'll stick to query or maybe Body? The Safe bet is Body.
    # Let's use a small model or just Query to match original.
    return await end_call(call_id, current_user)

@router.post("/chat/call/signal")
async def send_signal_endpoint(req: WebRTCSignalRequest, current_user: str = Depends(auth.get_current_user)):
    return await send_webrtc_signal(req.call_id, current_user, req.to_user, req.signal_type, req.signal_data)

@router.post("/chat/ephemeral/send")
async def send_ephemeral_endpoint(
    match_id: str,
    media_url: Optional[str] = None,
    text: Optional[str] = None,
    seconds: int = 10,
    current_user: str = Depends(auth.get_current_user)
):
    msg = await create_ephemeral_message(match_id, current_user, text, media_url, seconds)
    return {"message": msg.model_dump()}

@router.post("/chat/ephemeral/viewed/{message_id}")
async def viewed_ephemeral_endpoint(message_id: str, current_user: str = Depends(auth.get_current_user)):
    return await mark_ephemeral_viewed(message_id)

@router.get("/chat/online")
async def get_online_users_list():
    # Helper to get count
    # Note: manager from services/chat.py doesn't have get_online_count helper directly exposed as public valid method
    # It has active_connections dict.
    return {"online_count": len(manager.active_connections)}

@router.get("/chat/online/{user_id}")
async def check_online_status_endpoint(user_id: str):
    return get_online_status(user_id)

@router.post("/chat/upload")
async def upload_chat_media(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(database.get_db),
    current_user: str = Depends(auth.get_current_user)
):
    from backend.services.storage import storage_service
    url = await storage_service.save_gift_image(file, db)
    return {"url": url, "type": file.content_type}

@router.post("/chat/voice")
async def upload_voice_message(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(database.get_db),
    current_user: str = Depends(auth.get_current_user)
):
    from backend.services.storage import storage_service
    url, duration = await storage_service.save_voice_message(file, db)
    return {"url": url, "duration": duration}

@router.post("/messages/{message_id}/read")
async def mark_message_read(
    message_id: UUID,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    from backend.crud import chat as crud_chat
    from backend.models.chat import Message
    
    # Verify/Get sender to notify
    msg = await db.get(Message, message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    
    # FIX: Verify current_user is the receiver of this message
    if str(msg.receiver_id) != current_user:
        raise HTTPException(403, "Only the receiver can mark messages as read")
        
    rowcount = await crud_chat.mark_messages_as_read(db, [message_id], UUID(current_user))
    
    # FIX: Only broadcast when update count > 0
    if rowcount > 0:
        sender_id = str(msg.sender_id)
        if sender_id != current_user:
             await manager.send_personal(sender_id, {
                "type": "read",
                "message_ids": [str(message_id)],
                "reader_id": current_user,
                "match_id": str(msg.match_id)
             })
         
    return {"status": "ok", "message_id": str(message_id), "updated": rowcount > 0}

@router.post("/chat/send", response_model=MessageResponse)
@router.post("/chat/send_message") # Alias for compatibility
async def send_message(
    msg: SendMessageRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Logic similar to WS handle_message but for REST
    from backend.crud import chat as crud_chat
    from backend.models.interaction import Match
    from backend.services.security import spam_detector
    
    if msg.text:
         check = await spam_detector.check_message(current_user, msg.text)
         if check["is_spam"]: raise HTTPException(400, check["message"])

    match_obj = await db.get(Match, UUID(msg.match_id))
    if not match_obj: raise HTTPException(404, "Match not found")
    
    user1_id, user2_id = str(match_obj.user1_id), str(match_obj.user2_id)
    if current_user not in (user1_id, user2_id): raise HTTPException(403, "Access denied")
    
    receiver_id = user2_id if current_user == user1_id else user1_id
    
    msg_data = {
        "receiver_id": UUID(receiver_id),
        "text": msg.text,
        "type": msg.type,
        "audio_url": msg.media_url if msg.type == "voice" else None,
        "duration": msg.duration,
        "photo_url": msg.media_url if msg.type == "photo" else (msg.photo_url or msg.media_url)
    }
    
    db_msg = await crud_chat.create_message(db, UUID(msg.match_id), UUID(current_user), msg_data)
    MESSAGES_COUNTER.inc()

    # Award conversationalist badge for REST message sends (mirroring WS handler)
    from backend.services.gamification import check_and_award_badge
    await check_and_award_badge(current_user, "conversationalist", db)
    
    # Try notify WS
    await manager.send_to_match(msg.match_id, current_user, receiver_id, {
        "type": msg.type,
        "message_id": str(db_msg.id),
        "match_id": str(db_msg.match_id),
        "sender_id": str(db_msg.sender_id),
        "content": db_msg.text,
        "timestamp": db_msg.created_at.isoformat()
    })

    # Push Notification if offline
    if not manager.is_online(receiver_id):
        increment_unread(receiver_id, msg.match_id)
        from backend.services.notification import send_push_notification
        push_body = msg.text or "New message"
        if msg.type == "voice": push_body = "🎤 Voice message"
        if msg.type == "photo": push_body = "📷 Photo"

        await send_push_notification(
            db,
            user_id=UUID(receiver_id),
            title="New Message",
            body=push_body,
            url=f"/chat/{msg.match_id}"
        )
    
    return MessageResponse(
        id=db_msg.id,
        match_id=db_msg.match_id,
        sender_id=db_msg.sender_id,
        receiver_id=db_msg.receiver_id,
        content=db_msg.text,
        created_at=db_msg.created_at,
        is_read=db_msg.is_read
    )

@router.post("/chat/typing")
async def set_typing_endpoint(req: TypingRequest, current_user: str = Depends(auth.get_current_user)):
    await set_typing(req.match_id, current_user, req.is_typing)
    return {"status": "ok"}

@router.get("/chat/typing/{match_id}")
async def get_typing_endpoint(match_id: str, current_user: str = Depends(auth.get_current_user)):
    return {"typing_users": get_typing_users(match_id, exclude_user_id=current_user)}

@router.post("/chat/read")
async def mark_read_endpoint(req: MarkReadRequest, current_user: str = Depends(auth.get_current_user)):
    return await mark_as_read(req.match_id, current_user, req.message_ids)

@router.get("/chat/unread")
async def get_unread_endpoint(match_id: str = None, current_user: str = Depends(auth.get_current_user)):
    return get_unread_count(current_user, match_id)

@router.post("/chat/reaction")
async def reaction_endpoint(req: ReactionRequest, current_user: str = Depends(auth.get_current_user)):
    if req.emoji:
        return await add_reaction(req.message_id, current_user, req.emoji)
    else:
        return await remove_reaction(req.message_id, current_user)

@router.get("/chat/gifs/search")
async def search_gifs_endpoint(q: str, limit: int = 20, offset: int = 0):
    return await search_gifs(q, limit, offset)

@router.get("/chat/gifs/trending")
async def trending_gifs_endpoint(limit: int = 20):
    return await get_trending_gifs(limit)
