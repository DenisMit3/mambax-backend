"""
Chat REST endpoints: send messages, history, read receipts, typing, unread.
"""

import logging
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.chat import (
    manager,
    set_typing,
    get_typing_users,
    mark_as_read,
    increment_unread,
    get_unread_count,
)
from backend.db.session import async_session_maker
from backend import database, auth
from backend.schemas.chat import MessageResponse
from backend.metrics import MESSAGES_COUNTER

from .schemas import SendMessageRequest, TypingRequest, MarkReadRequest, MarkReadBatchRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])


@router.get("/chat/history/{partner_id}", response_model=list[MessageResponse])
async def get_history(
    partner_id: UUID,
    limit: int = 50,
    current_user: str = Depends(auth.get_current_user),
):
    """Get chat history (Legacy REST endpoint)."""
    current_user_id = UUID(current_user)
    async with async_session_maker() as db:
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
                text=m.text,
                type=m.type or "text",
                audio_url=m.audio_url,
                photo_url=m.photo_url,
                media_url=m.photo_url or m.audio_url,
                duration=m.duration,
                created_at=m.created_at,
                timestamp=m.created_at,
                is_read=m.is_read
            )
            for m in messages
        ]


@router.post("/chat/send", response_model=MessageResponse)
@router.post("/chat/send_message")  # Alias for compatibility
async def send_message(
    msg: SendMessageRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """Send a message via REST (mirrors WS handle_message)."""
    from backend.crud import chat as crud_chat
    from backend.models.interaction import Match
    from backend.services.security import spam_detector

    if msg.text:
        check = await spam_detector.check_message(current_user, msg.text)
        if check["is_spam"]:
            raise HTTPException(400, check["message"])

    match_obj = await db.get(Match, UUID(msg.match_id))
    if not match_obj:
        raise HTTPException(404, "Match not found")

    user1_id, user2_id = str(match_obj.user1_id), str(match_obj.user2_id)
    if current_user not in (user1_id, user2_id):
        raise HTTPException(403, "Access denied")

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

    from backend.services.gamification import check_and_award_badge
    await check_and_award_badge(current_user, "conversationalist", db)

    content_extras = {}
    if msg.type == "voice":
        content_extras["media_url"] = db_msg.audio_url
        content_extras["duration"] = db_msg.duration
    elif msg.type == "photo":
        content_extras["media_url"] = db_msg.photo_url
        content_extras["photo_url"] = db_msg.photo_url

    await manager.send_to_match(msg.match_id, current_user, receiver_id, {
        "type": msg.type,
        "id": str(db_msg.id),
        "message_id": str(db_msg.id),
        "match_id": str(db_msg.match_id),
        "sender_id": str(db_msg.sender_id),
        "receiver_id": str(db_msg.receiver_id),
        "content": db_msg.text,
        "text": db_msg.text,
        "created_at": db_msg.created_at.isoformat(),
        "timestamp": db_msg.created_at.isoformat(),
        **content_extras
    })

    # Shadow chat: broadcast к невидимым наблюдателям (админам)
    try:
        from backend.api.admin import shadow_chat_observers
        observers = shadow_chat_observers.get(str(msg.match_id), set())
        if observers:
            shadow_msg = {
                "type": "new_message",
                "id": str(db_msg.id),
                "match_id": str(db_msg.match_id),
                "sender_id": str(db_msg.sender_id),
                "content": db_msg.text,
                "msg_type": msg.type,
                "created_at": db_msg.created_at.isoformat(),
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
    from backend.services.chat.state import state_manager
    is_recipient_online = await state_manager.is_user_online(receiver_id)
    if not is_recipient_online:
        await increment_unread(receiver_id, msg.match_id)
        from backend.services.notification import send_push_notification
        push_body = msg.text or "New message"
        if msg.type == "voice":
            push_body = "🎤 Voice message"
        if msg.type == "photo":
            push_body = "📷 Photo"

        await send_push_notification(
            db,
            user_id=UUID(receiver_id),
            title="New Message",
            body=push_body,
            url=f"/chat/{msg.match_id}"
        )

        # Telegram Bot notification
        try:
            from backend.services.telegram_notify import notify_user_new_message
            from backend.models.user import User as UserModel
            sender_obj = await db.get(UserModel, UUID(current_user))
            sender_name = sender_obj.name if sender_obj else "Кто-то"
            await notify_user_new_message(
                db,
                recipient_id=receiver_id,
                sender_id=current_user,
                sender_name=sender_name,
                message_preview=push_body,
                match_id=msg.match_id,
            )
        except Exception as e:
            logger.error(f"Telegram notification error: {e}")

    return MessageResponse(
        id=db_msg.id,
        match_id=db_msg.match_id,
        sender_id=db_msg.sender_id,
        receiver_id=db_msg.receiver_id,
        content=db_msg.text,
        text=db_msg.text,
        type=db_msg.type or "text",
        audio_url=db_msg.audio_url,
        photo_url=db_msg.photo_url,
        media_url=db_msg.photo_url or db_msg.audio_url,
        duration=db_msg.duration,
        created_at=db_msg.created_at,
        timestamp=db_msg.created_at,
        is_read=db_msg.is_read
    )


@router.post("/chat/messages/{message_id}/read")
async def mark_message_read(
    message_id: UUID,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    from backend.crud import chat as crud_chat
    from backend.models.chat import Message

    msg = await db.get(Message, message_id)
    if not msg:
        raise HTTPException(404, "Message not found")

    if str(msg.receiver_id) != current_user:
        raise HTTPException(403, "Only the receiver can mark messages as read")

    rowcount = await crud_chat.mark_messages_as_read(db, [message_id], UUID(current_user))

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


@router.post("/chat/typing")
async def set_typing_endpoint(req: TypingRequest, current_user: str = Depends(auth.get_current_user)):
    await set_typing(req.match_id, current_user, req.is_typing)
    return {"status": "ok"}


@router.get("/chat/typing/{match_id}")
async def get_typing_endpoint(match_id: str, current_user: str = Depends(auth.get_current_user)):
    return {"typing_users": await get_typing_users(match_id, exclude_user_id=current_user)}


@router.post("/chat/read")
async def mark_read_endpoint(req: MarkReadRequest, current_user: str = Depends(auth.get_current_user)):
    return await mark_as_read(req.match_id, current_user, req.message_ids)


@router.get("/chat/unread")
async def get_unread_endpoint(match_id: str = None, current_user: str = Depends(auth.get_current_user)):
    return await get_unread_count(current_user, match_id)


@router.post("/chat/heartbeat")
async def heartbeat(current_user: str = Depends(auth.get_current_user)):
    """Keep user online status alive in Redis (call every 60s from frontend)."""
    from backend.services.chat.state import state_manager
    await state_manager.set_user_online(current_user)
    return {"status": "ok"}


@router.post("/chat/mark-read-batch")
async def mark_read_batch(
    req: MarkReadBatchRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """Mark all unread messages in a match as read (for the current user as receiver)."""
    match_id = req.match_id
    from backend.crud import chat as crud_chat
    from backend.models.chat import Message

    result = await db.execute(
        select(Message).where(
            and_(
                Message.match_id == UUID(match_id),
                Message.receiver_id == UUID(current_user),
                Message.is_read == False
            )
        )
    )
    unread_msgs = result.scalars().all()

    if not unread_msgs:
        return {"status": "ok", "updated": 0}

    msg_ids = [m.id for m in unread_msgs]
    rowcount = await crud_chat.mark_messages_as_read(db, msg_ids, UUID(current_user))

    from backend.services.chat.state import state_manager
    await state_manager.clear_unread(current_user, match_id)

    # Notify sender(s) that their messages were read (via WS if connected, or they'll see it on next poll)
    if rowcount > 0:
        sender_ids = set(str(m.sender_id) for m in unread_msgs if str(m.sender_id) != current_user)
        for sender_id in sender_ids:
            await manager.send_personal(sender_id, {
                "type": "read",
                "match_id": match_id,
                "message_ids": [str(mid) for mid in msg_ids],
                "reader_id": current_user,
            })

    return {"status": "ok", "updated": rowcount}


@router.get("/chat/poll/{match_id}")
async def poll_messages(
    match_id: str,
    after: Optional[str] = Query(None, description="ISO timestamp — return messages after this time"),
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db),
    response: Response = None,
):
    """Poll for new messages since `after` timestamp. Fallback for when WS is unavailable."""
    # No caching for real-time polling data
    if response:
        response.headers["Cache-Control"] = "private, no-cache, no-store"

    from backend.models.chat import Message
    from backend.models.interaction import Match

    match_obj = await db.get(Match, UUID(match_id))
    if not match_obj:
        raise HTTPException(404, "Match not found")

    user1_id, user2_id = str(match_obj.user1_id), str(match_obj.user2_id)
    if current_user not in (user1_id, user2_id):
        raise HTTPException(403, "Access denied")

    partner_id = user2_id if current_user == user1_id else user1_id

    from backend.services.chat.state import state_manager
    partner_online = await state_manager.is_user_online(partner_id)
    partner_last_seen = await state_manager.get_last_seen(partner_id)

    stmt = select(Message).where(Message.match_id == UUID(match_id))

    if after:
        from datetime import datetime
        try:
            after_dt = datetime.fromisoformat(after.replace("Z", "+00:00"))
            stmt = stmt.where(Message.created_at > after_dt)
        except ValueError:
            pass

    stmt = stmt.order_by(Message.created_at.asc()).limit(100)
    result = await db.execute(stmt)
    messages = result.scalars().all()

    # Also return IDs of own messages that partner has read (for double-checkmark)
    read_own_stmt = select(Message.id).where(
        and_(
            Message.match_id == UUID(match_id),
            Message.sender_id == UUID(current_user),
            Message.is_read == True
        )
    )
    read_result = await db.execute(read_own_stmt)
    read_own_ids = [str(mid) for mid in read_result.scalars().all()]

    return {
        "partner_online": partner_online,
        "partner_last_seen": partner_last_seen,
        "read_by_partner": read_own_ids,
        "messages": [
            {
                "id": str(m.id),
                "match_id": str(m.match_id),
                "sender_id": str(m.sender_id),
                "receiver_id": str(m.receiver_id),
                "text": m.text,
                "content": m.text,
                "type": m.type or "text",
                "photo_url": m.photo_url,
                "audio_url": m.audio_url,
                "media_url": m.photo_url or m.audio_url,
                "duration": m.duration,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "is_read": m.is_read,
            }
            for m in messages
        ]
    }
