# Interaction API - Лента анкет и обработка свайпов

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import verify_token
from crud.interaction import get_user_feed, create_swipe, check_existing_swipe
from db.session import get_db
from schemas.user import UserResponse, Location
from schemas.interaction import SwipeCreate


router = APIRouter(prefix="/api", tags=["Feed & Swipes"])


# --- Response Schemas ---
class SwipeResponse(BaseModel):
    """Ответ на свайп"""
    success: bool
    is_match: bool


# --- Dependency: Get Current User ID ---
async def get_current_user_id(
    authorization: str = None,
) -> UUID:
    """
    Извлекает user_id из JWT токена.
    Упрощённая версия для демо.
    """
    # TODO: Implement proper token extraction from header
    # For now, accept user_id directly or use mock
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
@router.get("/feed", response_model=list[UserResponse])
async def get_feed(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    # current_user_id: UUID = Depends(get_current_user_id)  # Enable when auth ready
):
    """
    Получить ленту анкет для свайпа.
    
    Возвращает список пользователей, исключая:
    - Текущего пользователя
    - Уже просмотренных (свайпнутых) пользователей
    """
    # TODO: Get from auth when ready
    # For demo, use a mock user_id
    from uuid import uuid4
    current_user_id = uuid4()  # Replace with real auth
    
    users = await get_user_feed(db, current_user_id, limit)
    
    # Convert to response format
    result = []
    for user in users:
        location = None
        if user.latitude and user.longitude:
            location = Location(lat=user.latitude, lon=user.longitude)
        
        result.append(UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            age=user.age,
            gender=user.gender,
            bio=user.bio,
            photos=user.photos,
            interests=user.interests,
            location=location,
            is_vip=user.is_vip,
            created_at=user.created_at,
            is_active=user.is_active,
        ))
    
    return result


@router.post("/swipe", response_model=SwipeResponse)
async def swipe(
    swipe_data: SwipeCreate,
    db: AsyncSession = Depends(get_db),
    # current_user_id: UUID = Depends(get_current_user_id)  # Enable when auth ready
):
    """
    Обработка свайпа (лайк/дизлайк/суперлайк).
    
    Возвращает:
    - success: bool — успешно ли обработан свайп
    - is_match: bool — есть ли взаимный лайк (матч)
    
    Если is_match=true, фронтенд показывает анимацию матча.
    """
    # TODO: Get from auth when ready
    from uuid import uuid4
    current_user_id = uuid4()  # Replace with real auth
    
    # Check if already swiped
    existing = await check_existing_swipe(db, current_user_id, swipe_data.to_user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already swiped on this user"
        )
    
    # Create swipe and check for match
    swipe_obj, is_match = await create_swipe(db, current_user_id, swipe_data)
    
    return SwipeResponse(success=True, is_match=is_match)


@router.get("/matches")
async def get_matches(
    db: AsyncSession = Depends(get_db),
):
    """
    Получить список матчей текущего пользователя.
    """
    from crud.interaction import get_user_matches
    from uuid import uuid4
    
    # TODO: Get from auth
    current_user_id = uuid4()
    
    matches = await get_user_matches(db, current_user_id)
    
    return {
        "count": len(matches),
        "matches": [
            {
                "id": str(m.id),
                "user1_id": str(m.user1_id),
                "user2_id": str(m.user2_id),
                "created_at": m.created_at.isoformat(),
            }
            for m in matches
        ]
    }
