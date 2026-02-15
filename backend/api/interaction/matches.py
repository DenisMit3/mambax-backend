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
    
    response_matches = []
    for m in matches:
        if m.user1_id == current_user_id:
            partner = m.user2
        else:
            partner = m.user1
            
        partner_data = None
        if partner:
            from backend.services.chat import manager
            is_online = manager.is_online(str(partner.id))
            
            partner_data = {
                 "id": str(partner.id),
                 "name": partner.name,
                 "photos": partner.photos,
                 "is_online": is_online,
                 "online_status": "online" if is_online else "offline",
                 "last_seen": partner.last_seen.isoformat() if getattr(partner, 'last_seen', None) else None,
                 "age": getattr(partner, 'age', None),
                 "bio": getattr(partner, 'bio', None),
                 "is_verified": getattr(partner, 'is_verified', False),
                 "city": getattr(partner, 'city', None),
            }

        response_matches.append({
            "id": str(m.id),
            "user1_id": str(m.user1_id),
            "user2_id": str(m.user2_id),
            "created_at": m.created_at.isoformat(),
            "user": partner_data 
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
    stmt = select(Match).where(Match.id == match_id)
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
        from backend.services.chat import manager
        is_online = manager.is_online(str(partner.id))
        
        partner_data = {
            "id": str(partner.id),
            "name": partner.name,
            "photos": partner.photos,
            "is_online": is_online,
            "last_seen": partner.last_seen.isoformat() if partner.last_seen else None,
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
