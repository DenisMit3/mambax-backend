# Interaction API - Матчи и чат

import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from backend.crud.interaction import get_user_matches
from backend.crud.chat import get_messages
from backend.models.interaction import Match
from backend.db.session import get_db
from backend.api.interaction.deps import get_current_user_id

router = APIRouter()


@router.get("/matches")
async def get_matches(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Получить список матчей текущего пользователя.
    """
    matches = await get_user_matches(db, current_user_id)
    
    # Batch: собираем все partner IDs и делаем один запрос в Redis
    partner_ids = []
    for m in matches:
        pid = str(m.user2.id if m.user1_id == current_user_id else m.user1.id) if (m.user2 if m.user1_id == current_user_id else m.user1) else None
        if pid:
            partner_ids.append(pid)
    
    from backend.services.chat.state import state_manager
    online_map = await state_manager.is_users_online_batch(partner_ids)
    last_seen_map = await state_manager.get_last_seen_batch(partner_ids)
    
    # Batch fetch last messages for all matches (N+1 → 2 запроса)
    from backend.models.chat import Message
    from sqlalchemy import func
    match_ids = [m.id for m in matches]
    if match_ids:
        last_msg_subq = (
            select(Message.match_id, func.max(Message.created_at).label("max_ts"))
            .where(Message.match_id.in_(match_ids))
            .group_by(Message.match_id)
            .subquery()
        )
        last_msgs_result = await db.execute(
            select(Message)
            .join(last_msg_subq, (Message.match_id == last_msg_subq.c.match_id) & (Message.created_at == last_msg_subq.c.max_ts))
        )
        last_msgs_map = {msg.match_id: msg for msg in last_msgs_result.scalars().all()}
    else:
        last_msgs_map = {}
    
    response_matches = []
    for m in matches:
        if m.user1_id == current_user_id:
            partner = m.user2
        else:
            partner = m.user1
            
        partner_data = None
        if partner:
            is_online = online_map.get(str(partner.id), False)
            redis_last_seen = last_seen_map.get(str(partner.id))
            last_seen = redis_last_seen or (partner.last_seen.isoformat() if getattr(partner, 'last_seen', None) else None)
            
            partner_data = {
                 "id": str(partner.id),
                 "name": partner.name,
                 "photos": partner.photos,
                 "is_online": is_online,
                 "online_status": "online" if is_online else "offline",
                 "last_seen": last_seen,
                 "age": getattr(partner, 'age', None),
                 "bio": getattr(partner, 'bio', None),
                 "is_verified": getattr(partner, 'is_verified', False),
                 "is_premium": getattr(partner, 'is_vip', False),
                 "city": getattr(partner, 'city', None),
            }

        # Получаем последнее сообщение из batch-запроса
        last_msg = last_msgs_map.get(m.id)
        last_message_data = None
        if last_msg:
            # Формируем превью текста для нетекстовых сообщений
            preview_text = last_msg.text
            if not preview_text:
                if last_msg.type == "voice":
                    preview_text = "🎤 Голосовое сообщение"
                elif last_msg.type == "photo":
                    preview_text = "📷 Фото"
                else:
                    preview_text = "Новое сообщение"

            last_message_data = {
                "id": str(last_msg.id),
                "text": preview_text,
                "type": last_msg.type or "text",
                "sender_id": str(last_msg.sender_id),
                "created_at": last_msg.created_at.isoformat() if last_msg.created_at else None,
            }

        response_matches.append({
            "id": str(m.id),
            "user1_id": str(m.user1_id),
            "user2_id": str(m.user2_id),
            "created_at": m.created_at.isoformat(),
            "user": partner_data,
            "last_message": last_message_data,
        })

    return {"matches": response_matches}


@router.get("/matches/{match_id}")
async def get_match_by_id(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Get a single match by ID.
    """
    from sqlalchemy.orm import selectinload
    stmt = select(Match).where(Match.id == match_id).options(
        selectinload(Match.user1),
        selectinload(Match.user2),
    )
    result = await db.execute(stmt)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.user1_id != current_user_id and match.user2_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if match.user1_id == current_user_id:
        partner = match.user2
    else:
        partner = match.user1
        
    partner_data = None
    if partner:
        from backend.services.chat.state import state_manager
        is_online = await state_manager.is_user_online(str(partner.id))
        redis_last_seen = await state_manager.get_last_seen(str(partner.id))
        # Prefer Redis last_seen (updated by heartbeat), fallback to DB
        last_seen = redis_last_seen or (partner.last_seen.isoformat() if partner.last_seen else None)
        
        partner_data = {
            "id": str(partner.id),
            "name": partner.name,
            "photos": partner.photos,
            "is_online": is_online,
            "last_seen": last_seen,
            "is_premium": getattr(partner, 'is_vip', False)
        }

    return {
        "id": str(match.id),
        "user1_id": str(match.user1_id),
        "user2_id": str(match.user2_id),
        "current_user_id": str(current_user_id),
        "created_at": match.created_at.isoformat(),
        "user": partner_data
    }


@router.get("/matches/{match_id}/messages")
async def get_match_messages(
    match_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Получить историю сообщений для матча.
    """
    stmt = select(Match).where(Match.id == match_id)
    result = await db.execute(stmt)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.user1_id != current_user_id and match.user2_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view messages for this match")

    messages = await get_messages(db, match_id)
    
    return [
        {
            "id": str(m.id),
            "match_id": str(m.match_id),
            "sender_id": str(m.sender_id),
            "receiver_id": str(m.receiver_id),
            "text": m.text,
            "content": m.text,
            "type": m.type,
            "audio_url": m.audio_url,
            "photo_url": m.photo_url,
            "media_url": m.photo_url or m.audio_url,
            "duration": m.duration,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_read": m.is_read
        }
        for m in messages
    ]


@router.post("/chat/start/{target_user_id}")
async def start_chat_with_user(
    target_user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    💬 Start a chat with a user.
    Returns existing match if found, or creates a new match to enable chat.
    """
    # Block Check
    from backend.services.security import is_blocked
    if await is_blocked(str(current_user_id), str(target_user_id)) or \
       await is_blocked(str(target_user_id), str(current_user_id)):
        raise HTTPException(status_code=403, detail="Interaction not allowed")
    
    # Check if match already exists
    match_stmt = select(Match).where(
        or_(
            and_(Match.user1_id == current_user_id, Match.user2_id == target_user_id),
            and_(Match.user1_id == target_user_id, Match.user2_id == current_user_id)
        )
    )
    existing_match = (await db.execute(match_stmt)).scalars().first()
    
    if existing_match:
        return {"match_id": str(existing_match.id), "is_new": False}
    
    from backend.models.interaction import Swipe
    from backend.schemas.interaction import SwipeAction
    
    mutual_like_stmt = select(Swipe).where(
        and_(
            Swipe.from_user_id == target_user_id,
            Swipe.to_user_id == current_user_id,
            Swipe.action == SwipeAction.LIKE
        )
    )
    mutual_like = (await db.execute(mutual_like_stmt)).scalars().first()
    
    if not mutual_like:
        raise HTTPException(status_code=400, detail="Cannot start chat without mutual like")
    
    new_match = Match(
        id=uuid.uuid4(),
        user1_id=current_user_id,
        user2_id=target_user_id,
        is_active=True
    )
    db.add(new_match)
    await db.commit()
    await db.refresh(new_match)
    
    return {"match_id": str(new_match.id), "is_new": True}
