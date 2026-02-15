# Auth API - Регистрация

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from backend.core.security import create_access_token
from backend.db.session import get_db
from backend.schemas.user import UserCreate, UserResponse, Location
from backend.crud.user import create_user, get_user_by_email
from backend.services.geo import geo_service
from backend.api.auth.schemas import RegisterResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Регистрация нового пользователя.
    """
    if user_data.email:
        existing_user = await get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    db_user = await create_user(db, user_data)
    access_token = create_access_token(db_user.id)
    
    if db_user.latitude and db_user.longitude:
        try:
            await geo_service.update_location(
                str(db_user.id),
                db_user.latitude,
                db_user.longitude,
                metadata={"name": db_user.name or "", "age": db_user.age or 0}
            )
        except Exception as e:
            logger.error(f"Failed to sync new user location to Redis: {e}")
    
    location = None
    if db_user.latitude and db_user.longitude:
        location = Location(lat=db_user.latitude, lon=db_user.longitude)
    
    user_response = UserResponse(
        id=db_user.id,
        email=db_user.email,
        name=db_user.name,
        age=db_user.age,
        gender=db_user.gender,
        bio=db_user.bio,
        photos=db_user.photos,
        interests=db_user.interests,
        location=location,
        is_vip=db_user.is_vip,
        created_at=db_user.created_at,
        is_active=db_user.is_active,
    )
    
    return RegisterResponse(
        user=user_response,
        access_token=access_token,
        token_type="bearer"
    )
