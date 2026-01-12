# Users API - Управление профилем пользователя и загрузка фото

from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.files import save_upload_file
from backend.core.security import verify_token
from backend.crud_pkg.user import get_user_by_id, add_user_photo, delete_user
from backend.db.session import get_db
from backend.schemas.user import UserResponse, Location
from backend.services.moderation import ModerationService


router = APIRouter(prefix="/users", tags=["Users"])


# --- Dependency: Get Current User ---
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


@router.post("/me/photo", response_model=UserResponse)
async def upload_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Загрузка фотографии в профиль пользователя.
    
    - Сохраняет файл локально в `static/uploads/`
    - Добавляет URL в список `photos` пользователя
    """

    # Save file
    file_url = save_upload_file(file)
    
    # Moderation Check
    # We allow the upload to proceed but log the result. 
    # Frontend can decide to hide "pending" or "flagged" photos if we added status to Photo model.
    # For now, we just log to Moderation Queue.
    await ModerationService.check_content(
        db, 
        user_id=current_user.id, 
        content=file_url, 
        content_type="image"
    )
    
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
        status=updated_user.status,
        subscription_tier=updated_user.subscription_tier,
        role=updated_user.role,
    )


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
    return


@router.get("/me/export")
async def export_my_data(
    current_user = Depends(get_current_user)
):
    """
    GDPR Data Export.
    Возвращает все данные пользователя в JSON.
    """
    return {
        "user_profile": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "telegram_id": current_user.telegram_id,
            "bio": current_user.bio,
            "interests": current_user.interests,
            "photos": current_user.photos,
            "location": {"lat": current_user.latitude, "lon": current_user.longitude} if current_user.latitude else None,
            "created_at": str(current_user.created_at),
            "status": current_user.status,
            "role": current_user.role,
            "subscription_tier": current_user.subscription_tier
        },
        "privacy_note": "This export contains your personal profile data stored on MambaX."
    }


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
