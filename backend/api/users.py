# Users API - Управление профилем пользователя и загрузка фото

from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.files import save_upload_file
from core.security import verify_token
from crud.user import get_user_by_id, add_user_photo
from db.session import get_db
from schemas.user import UserResponse, Location


router = APIRouter(prefix="/users", tags=["Users"])


# --- Dependency: Get Current User ---
async def get_current_user(
    token: str = Depends(verify_token),  # TODO: Proper auth dependency
    db: AsyncSession = Depends(get_db)
):
    """
    Получает текущего пользователя по токену.
    """
    # Temporary: extract token manually if needed or assume token is passed
    # For now, verify_token returns user_id if valid
    
    # Needs full implementation with OAuth2Scheme
    # This is a placeholder logic
    if not token:
         # For demo, generate mock user or fail
         # raise HTTPException(status_code=401, detail="Not authenticated")
         from uuid import uuid4
         user_id = uuid4() # Mock
    else:
        user_id = UUID(token)
    
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/me/photo", response_model=UserResponse)
async def upload_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(get_current_user) # When auth is ready
):
    """
    Загрузка фотографии в профиль пользователя.
    
    - Сохраняет файл локально в `static/uploads/`
    - Добавляет URL в список `photos` пользователя
    """
    # TODO: Get real user
    # For demo: try to find the mock user or first user
    from sqlalchemy import select
    from models.user import User
    result = await db.execute(select(User).limit(1))
    current_user = result.scalars().first()
    
    if not current_user:
         raise HTTPException(status_code=404, detail="No users found to attach photo")

    # Save file
    file_url = save_upload_file(file)
    
    # Update user in DB
    updated_user = await add_user_photo(db, current_user, file_url)
    
    # Return response
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
    )
