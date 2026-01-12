# Interaction API - Лента анкет и обработка свайпов

import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import verify_token
from backend.crud_pkg.interaction import get_user_feed, create_swipe, check_existing_swipe
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
    
    Параметры:
    - limit: количество профилей (default: 20)
    - cursor: курсор для следующей страницы
    - exclude_swiped: исключить уже просвайпанные (default: true)
    
    Ответ:
    - items: список профилей
    - next_cursor: курсор для следующей страницы
    - has_more: есть ли ещё профили
    """
    from backend.services.pagination import get_profiles_paginated
    
    result = await get_profiles_paginated(
        db=db,
        current_user_id=str(current_user_id),
        limit=limit,
        cursor=cursor,
        exclude_swiped=exclude_swiped
    )
    
    return result.dict()


@router.post("/swipe", response_model=SwipeResponse)
async def swipe(
    swipe_data: SwipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Обработка свайпа (лайк/дизлайк/суперлайк).
    
    Возвращает:
    - success: bool — успешно ли обработан свайп
    - is_match: bool — есть ли взаимный лайк (матч)
    
    Если is_match=true, фронтенд показывает анимацию матча.
    """
    
    # Check if already swiped
    existing = await check_existing_swipe(db, current_user_id, swipe_data.to_user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already swiped on this user"
        )
    
    # Create swipe and check for match
    swipe_obj, is_match = await create_swipe(db, current_user_id, swipe_data)
    
    if is_match:
        MATCHES_COUNTER.inc()

    
    return SwipeResponse(success=True, is_match=is_match)


@router.get("/matches")
async def get_matches(
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Получить список матчей текущего пользователя.
    """
    from backend.crud_pkg.interaction import get_user_matches
    from backend.models.user import User
    from sqlalchemy import select

    matches = await get_user_matches(db, current_user_id)
    
    # Collect partner IDs
    partner_ids = set()
    for m in matches:
        if m.user1_id != current_user_id:
            partner_ids.add(m.user1_id)
        else:
            partner_ids.add(m.user2_id)
            
    # Fetch partners
    partners_map = {}
    if partner_ids:
        stmt = select(User).where(User.id.in_(partner_ids))
        result = await db.execute(stmt)
        partners = result.scalars().all()
        for p in partners:
            partners_map[p.id] = p
            
    response_matches = []
    for m in matches:
        partner_id = m.user2_id if m.user1_id == current_user_id else m.user1_id
        partner = partners_map.get(partner_id)
        
        partner_data = None
        if partner:
            # Basic profile info
            partner_data = {
                 "id": str(partner.id),
                 "name": partner.name,
                 "photos": partner.photos,
                 "is_online": True, # Placeholder or fetch from manager
                 "last_seen": None
            }

        response_matches.append({
            "id": str(m.id),
            "user1_id": str(m.user1_id),
            "user2_id": str(m.user2_id),
            "created_at": m.created_at.isoformat(),
            "user": partner_data 
        })

    return response_matches


@router.get("/matches/{match_id}/messages")
async def get_match_messages(
    match_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Получить историю сообщений для матча.
    """
    from backend.crud_pkg.chat import get_messages
    from backend.models.interaction import Match
    from sqlalchemy import select, or_

    # Verify authorization
    stmt = select(Match).where(Match.id == match_id)
    result = await db.execute(stmt)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.user1_id != current_user_id and match.user2_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view messages for this match")

    return await get_messages(db, match_id)


@router.post("/rewind")
async def rewind_last_swipe(
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Undo the last swipe (like or dislike).
    Does not allow undoing if a match was formed (for simplicity, or we can cascading delete).
    For now: simple delete of last 'Swipe' record.
    """
    from backend.models.interaction import Swipe, Match
    from sqlalchemy import select

    # Find last swipe
    stmt = select(Swipe).where(
        Swipe.from_user_id == current_user_id
    ).order_by(Swipe.timestamp.desc()).limit(1)
    
    last_swipe = (await db.execute(stmt)).scalars().first()
    
    if not last_swipe:
        raise HTTPException(status_code=400, detail="No swipes to rewind")
        
    # Optional: Prevent rewinding matches (if business logic dictates)
    if last_swipe.action in ["like", "superlike"]:
         # Check if it was a match
         match_stmt = select(Match).where(
             ((Match.user1_id == current_user_id) & (Match.user2_id == last_swipe.to_user_id)) |
             ((Match.user1_id == last_swipe.to_user_id) & (Match.user2_id == current_user_id))
         )
         match_obj = (await db.execute(match_stmt)).scalars().first()
         if match_obj:
             # Delete match too
             await db.delete(match_obj)

    # Delete swipe
    await db.delete(last_swipe)
    await db.commit()
    
    return {"message": "Rewind successful"}


@router.get("/swipe-status")
async def get_swipe_status_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get current swipe limits and status"""
    from backend.services.swipe_limits import get_swipe_status
    return await get_swipe_status(db, str(current_user))


@router.get("/likes/received")
async def get_received_likes_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    👀 Кто меня лайкнул (Premium функция)
    
    Для VIP пользователей: полные профили тех, кто поставил лайк
    Для бесплатных: только количество и размытые превью
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

