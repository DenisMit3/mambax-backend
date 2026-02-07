# Interaction API - Лента анкет и обработка свайпов

import uuid
import json
from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from backend.core.security import verify_token
from backend.core.redis import redis_manager  # PERF-009: Redis caching
from backend.crud.interaction import (
    get_user_feed, 
    create_swipe, 
    check_existing_swipe, 
    get_user_matches
)
from backend.crud.chat import get_messages
from backend.models.user import User
from backend.models.interaction import Swipe, Match
from backend.services.pagination import get_profiles_paginated
from backend.services.swipe_limits import (
    get_swipe_status, 
    add_to_swipe_history, 
    can_use_undo, 
    pop_last_swipe_from_history,
    can_swipe,
    record_swipe,
    mark_undo_used
)

from backend.db.session import get_db
from backend.schemas.user import UserResponse, Location
from backend.schemas.interaction import SwipeCreate
from backend import crud, schemas, models
from backend.services.moderation import ModerationService
from backend.metrics import MATCHES_COUNTER




router = APIRouter(tags=["Feed & Swipes"])


# --- Response Schemas ---
class SwipeResponse(BaseModel):
    """Ответ на свайп"""
    success: bool
    is_match: bool


async def get_current_user_id(
    authorization: str = Header(None),
) -> UUID:
    """
    Извлекает user_id из JWT токена.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization required"
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        
        user_id = verify_token(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")


# --- Endpoints ---
@router.get("/feed")
async def get_feed(
    limit: int = 20,
    cursor: str = None,
    exclude_swiped: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    📱 Лента профилей с курсорной пагинацией (Infinite Scroll)
    PERF-009: Redis кэширование на 30 секунд
    """
    # PERF-009: Try cache first (short TTL for dating app freshness)
    cache_key = f"feed:{current_user_id}:{cursor}:{limit}:{exclude_swiped}"
    
    try:
        cached = await redis_manager.get_value(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass  # Cache miss or error, proceed to DB
    
    result = await get_profiles_paginated(
        db=db,
        current_user_id=str(current_user_id),
        limit=limit,
        cursor=cursor,
        exclude_swiped=exclude_swiped
    )
    
    data = result.dict()
    
    # PERF-009: Cache for 30 seconds
    try:
        await redis_manager.set_value(cache_key, json.dumps(data, default=str), expire=30)
    except Exception:
        pass  # Don't fail if cache write fails
    
    return data


@router.post("/swipe", response_model=SwipeResponse)
async def swipe(
    swipe_data: SwipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Обработка свайпа (лайк/дизлайк/суперлайк).
    """
    
    # Block Check
    from backend.services.security import is_blocked
    if await is_blocked(str(current_user_id), str(swipe_data.to_user_id)) or \
       await is_blocked(str(swipe_data.to_user_id), str(current_user_id)):
        raise HTTPException(status_code=403, detail="Interaction not allowed")

    # Check if already swiped
    existing = await check_existing_swipe(db, current_user_id, swipe_data.to_user_id)
    if existing:
        # Infinite feed: allow re-swiping (idempotent success)
        # Check if already matched
        from sqlalchemy import or_, and_
        match_stmt = select(Match).where(
            or_(
                and_(Match.user1_id == current_user_id, Match.user2_id == swipe_data.to_user_id),
                and_(Match.user1_id == swipe_data.to_user_id, Match.user2_id == current_user_id)
            )
        )
        match_obj = (await db.execute(match_stmt)).scalars().first()
        return SwipeResponse(success=True, is_match=match_obj is not None)
    
    # Swipe Limit Check
    allowed_status = await can_swipe(db, str(current_user_id))
    if not allowed_status["allowed"]:
        raise HTTPException(status_code=403, detail="Swipe limit reached")

    # Create swipe and check for match
    swipe_obj, is_match = await create_swipe(db, current_user_id, swipe_data)

    # Record usage
    await record_swipe(db, str(current_user_id), is_super=(swipe_data.action.value == 'superlike'))
    
    if is_match:
        MATCHES_COUNTER.inc()

    # Записать в историю для Undo
    await add_to_swipe_history(
        str(current_user_id),
        {
            "to_user_id": str(swipe_data.to_user_id),
            "action": swipe_data.action.value
        }
    )

    # Redis Persistence for AI (Comment 2)
    if swipe_data.action.value in ["like", "superlike"]:
        from backend.core.redis import redis_manager
        history_key = f"interactions:{current_user_id}:liked"
        await redis_manager.client.lpush(history_key, str(swipe_data.to_user_id))
        await redis_manager.client.ltrim(history_key, 0, 99)  # Keep last 100

    return SwipeResponse(success=True, is_match=is_match)


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
        # Determine partner (User object is now eager loaded via relationships)
        if m.user1_id == current_user_id:
            partner = m.user2
        else:
            partner = m.user1
            
        partner_data = None
        if partner:
            # Check if partner is online via WebSocket manager
            from backend.services.chat import manager
            is_online = manager.is_online(str(partner.id))
            
            # Basic profile info
            partner_data = {
                 "id": str(partner.id),
                 "name": partner.name,
                 "photos": partner.photos,
                 "is_online": is_online,
                 "last_seen": partner.last_seen.isoformat() if getattr(partner, 'last_seen', None) else None
            }

        response_matches.append({
            "id": str(m.id),
            "user1_id": str(m.user1_id),
            "user2_id": str(m.user2_id),
            "created_at": m.created_at.isoformat(),
            "user": partner_data 
        })

    return response_matches


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

    # Verify user belongs to this match
    if match.user1_id != current_user_id and match.user2_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Determine partner
    if match.user1_id == current_user_id:
        partner = match.user2
    else:
        partner = match.user1
        
    partner_data = None
    if partner:
        # Check if partner is online via WebSocket manager
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

    # Verify authorization
    stmt = select(Match).where(Match.id == match_id)
    result = await db.execute(stmt)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.user1_id != current_user_id and match.user2_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view messages for this match")

    messages = await get_messages(db, match_id)
    
    # Serialize to JSON-friendly format
    return [
        {
            "id": str(m.id),
            "match_id": str(m.match_id),
            "sender_id": str(m.sender_id),
            "receiver_id": str(m.receiver_id),
            "text": m.text,
            "content": m.text,  # Alias for compatibility
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


@router.post("/undo-swipe")
async def undo_last_swipe(
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    ↩️ Отменить последний свайп (доступно для VIP или за Stars).
    """
    # Проверка VIP статуса
    user = await db.get(models.User, current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # VIP имеют безлимитный Undo
    if not user.is_vip:
        # FREE пользователи могут использовать 1 раз в день или за Stars
        can_undo = await can_use_undo(db, str(current_user_id))
        if not can_undo["allowed"]:
            raise HTTPException(
                status_code=403, 
                detail="Undo not available. Upgrade to VIP or wait until tomorrow."
            )
    
    # Получить последний свайп из истории
    last_swipe_data = await pop_last_swipe_from_history(str(current_user_id))
    
    if not last_swipe_data:
        raise HTTPException(status_code=400, detail="No swipes to undo")
    
    # Удалить свайп из БД
    stmt = select(Swipe).where(
        and_(
            Swipe.from_user_id == current_user_id,
            Swipe.to_user_id == uuid.UUID(last_swipe_data["to_user_id"])
        )
    )
    swipe_obj = (await db.execute(stmt)).scalars().first()
    
    if swipe_obj:
        # Если был матч - удалить его
        if last_swipe_data["action"] in ["like", "superlike"]:
            match_stmt = select(Match).where(
                or_(
                    and_(Match.user1_id == current_user_id, Match.user2_id == swipe_obj.to_user_id),
                    and_(Match.user1_id == swipe_obj.to_user_id, Match.user2_id == current_user_id)
                )
            )
            match_obj = (await db.execute(match_stmt)).scalars().first()
            if match_obj:
                await db.delete(match_obj)
        
        await db.delete(swipe_obj)
        await db.commit()
    
    # Если пользователь не VIP - списать попытку Undo
    if not user.is_vip:
        await mark_undo_used(str(current_user_id))

    # Вернуть данные отмененного профиля для UI
    return {
        "success": True,
        "undone_profile_id": last_swipe_data["to_user_id"],
        "action": last_swipe_data["action"]
    }


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
    from sqlalchemy import or_, and_
    
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
    
    # Create new match to enable chat
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


@router.get("/swipe-status")
async def get_swipe_status_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get current swipe limits and status"""
    return await get_swipe_status(db, str(current_user))


@router.get("/likes/received")
async def get_received_likes_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    👀 Кто меня лайкнул (Premium функция)
    """
    # Получить профиль пользователя для проверки VIP статуса
    # Using simplistic crud usage from main.py
    user = await crud.get_user_profile(db, str(current_user))
    is_vip = user.is_vip if user else False
    
    return await crud.get_received_likes(db, str(current_user), is_vip=is_vip)


@router.get("/likes/count")
async def get_likes_count_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    🔢 Количество полученных лайков
    """
    count = await crud.get_likes_count(db, str(current_user))
    return {"count": count}

