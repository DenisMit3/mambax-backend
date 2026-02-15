# Users API - Профиль пользователя (get/update/delete)

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.security import verify_token
from backend.crud.user import get_user_by_id, delete_user
from backend.db.session import get_db
from backend.schemas.user import UserResponse, Location, UserUpdate
from backend.services.geo import geo_service
from backend.config.settings import settings
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Dependency: Get Current User ---
async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает текущего пользователя по токену.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization required"
        )
    
    try:
        if " " not in authorization:
             raise HTTPException(status_code=401, detail="Invalid auth format")
             
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
            
        user_id_str = verify_token(token)
        if not user_id_str:
             raise HTTPException(status_code=401, detail="Invalid token")
             
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    """
    Получить данные текущего пользователя.
    """
    location = None
    if current_user.latitude and current_user.longitude:
        location = Location(lat=current_user.latitude, lon=current_user.longitude)
        
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        age=current_user.age,
        gender=current_user.gender,
        bio=current_user.bio,
        photos=current_user.photos,
        interests=current_user.interests,
        location=location,
        is_vip=current_user.is_vip,
        created_at=current_user.created_at,
        is_active=current_user.is_active,
        stars_balance=getattr(current_user, "stars_balance", 0),
        status=current_user.status,
        subscription_tier=current_user.subscription_tier,
        role=current_user.role,
        is_complete=current_user.is_complete,
        verification_selfie=current_user.verification_selfie,
        ux_preferences=current_user.ux_preferences,
        achievements=getattr(current_user, "achievements", None) or [],
    )


@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update current user profile.
    """
    from backend.crud.user import update_profile
    
    updated_user = await update_profile(db, str(current_user.id), user_data)
    if not updated_user:
        raise HTTPException(status_code=400, detail="Update failed")
        
    # Build response location
    location = None
    if updated_user.latitude and updated_user.longitude:
        location = Location(lat=updated_user.latitude, lon=updated_user.longitude)

    return UserResponse(
        id=updated_user.id,
        email=updated_user.email,
        name=updated_user.name,
        age=updated_user.age,
        gender=updated_user.gender,
        bio=updated_user.bio,
        photos=updated_user.photos,
        interests=updated_user.interests,
        location=location,
        is_vip=updated_user.is_vip,
        created_at=updated_user.created_at,
        is_active=updated_user.is_active,
        stars_balance=getattr(updated_user, "stars_balance", 0),
        status=updated_user.status,
        subscription_tier=updated_user.subscription_tier,
        role=updated_user.role,
        is_complete=updated_user.is_complete,
        verification_selfie=updated_user.verification_selfie,
        ux_preferences=updated_user.ux_preferences,
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Удаление аккаунта текущего пользователя.
    """
    deleted = await delete_user(db, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Remove from Redis Geo Index
    try:
        await geo_service.remove_user(str(current_user.id))
    except Exception as e:
        logger.error(f"Failed to remove user {current_user.id} from Redis: {e}")
        
    return


@router.get("/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get public profile of another user.
    """
    from sqlalchemy import func, select
    from backend.models.monetization import GiftTransaction
    
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Count gifts received by this user
    gifts_count_result = await db.execute(
        select(func.count(GiftTransaction.id)).where(
            GiftTransaction.receiver_id == user_id
        )
    )
    gifts_received_count = gifts_count_result.scalar() or 0
        
    location = None
    if user.latitude and user.longitude:
        location = Location(lat=user.latitude, lon=user.longitude)

    # Return safe public data
    return UserResponse(
        id=user.id,
        email=None, 
        phone=None,
        telegram_id=None,
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
        stars_balance=0,  # Hidden
        gifts_received=gifts_received_count,
        # status, role, subscription_tier will use defaults (ACTIVE, FREE, USER) for privacy
    )
