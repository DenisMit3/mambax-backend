"""
Chat REST endpoints: send messages, history, read receipts, typing, unread.
"""

import logging
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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

from .schemas import SendMessageRequest, TypingRequest, MarkReadRequest

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
                created_at=m.created_at,
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

    await manager.send_to_match(msg.match_id, current_user, receiver_id, {
        "type": msg.type,
        "message_id": str(db_msg.id),
        "match_id": str(db_msg.match_id),
        "sender_id": str(db_msg.sender_id),
        "content": db_msg.text,
        "timestamp": db_msg.created_at.isoformat()
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
    if not manager.is_online(receiver_id):
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

    return MessageResponse(
        id=db_msg.id,
        match_id=db_msg.match_id,
        sender_id=db_msg.sender_id,
        receiver_id=db_msg.receiver_id,
        content=db_msg.text,
        created_at=db_msg.created_at,
        is_read=db_msg.is_read
    )


@router.post("/messages/{message_id}/read")
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
