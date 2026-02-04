# Users API - Управление профилем пользователя и загрузка фото

from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timezone
from sqlalchemy.future import select

from backend.services.storage import storage_service
from backend.core.security import verify_token
from backend.crud.user import get_user_by_id, add_user_photo, delete_user
from backend.db.session import get_db
from backend.schemas.user import UserResponse, Location, UserUpdate
from backend.services.moderation import ModerationService
from backend.services.geo import geo_service
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)


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


from backend.models.user_management import VerificationRequest

@router.post("/me/verification-photo", response_model=UserResponse)
async def upload_verification_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Secure Verification Upload (Private).
    
    - Saves photo ONLY for admin review
    - DOES NOT add to public profile
    - Sets status to PENDING
    - Creates Admin Queue Entry
    """
    # 1. Save file securely via StorageService
    file_url = await storage_service.save_verification_photo(file)
    
    # 2. Update User Verification Status
    current_user.verification_selfie = file_url
    current_user.is_verified = False # Reset status
    
    # 3. Create or Update Verification Request
    # Check for existing pending request
    result = await db.execute(
        select(VerificationRequest).where(
            VerificationRequest.user_id == current_user.id,
            VerificationRequest.status == "pending"
        )
    )
    existing_req = result.scalars().first()
    
    if existing_req:
        existing_req.submitted_photos = [file_url]
        existing_req.created_at = datetime.now(timezone.utc) # Bump timestamp
    else:
        new_req = VerificationRequest(
            user_id=current_user.id,
            submitted_photos=[file_url],
            status="pending",
            priority=1 # Standard priority
        )
        db.add(new_req)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    # Return response
    return UserResponse.model_validate(current_user)



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

    # Save file via StorageService
    file_url = await storage_service.save_user_photo(file)
    
    # Moderation Check
    try:
        is_safe = await ModerationService.check_content(
            db, 
            user_id=current_user.id, 
            content=file_url, 
            content_type="image"
        )
        
        if not is_safe:
            storage_service.delete_file(file_url)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image failed moderation policy"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Moderation check failed for {file_url}: {e}")
        # FAIL-SAFE: Block content if moderation service fails (in prod)
        # Import settings to check env
        from backend.config.settings import settings
        if settings.is_production:
            storage_service.delete_file(file_url)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Content moderation service unavailable. Please try again later."
            )
        else:
             logger.warning("Moderation service failed, but allowing in DEV mode.")
             pass
    
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
        is_complete=current_user.is_complete,
        verification_selfie=current_user.verification_selfie,
    )


@router.get("/me/likes-received")
async def get_likes_received(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get users who have liked the current user.
    Returns user profiles with isSuper flag.
    FIX: Single query with photos aggregated (no N+1)
    """
    from sqlalchemy import text
    
    user_id = str(current_user.id).replace('-', '')  # Remove dashes for CHAR(32) format
    logger.info(f"Getting likes for user_id: {user_id}")
    
    # FIX: Single query with photos aggregated using GROUP_CONCAT
    stmt = text("""
        SELECT 
            s.from_user_id, 
            s.action, 
            s.timestamp,
            u.name,
            u.age,
            u.is_active,
            GROUP_CONCAT(p.url) as photos
        FROM swipes s
        JOIN users u ON s.from_user_id = u.id
        LEFT JOIN user_photos p ON p.user_id = s.from_user_id
        WHERE s.to_user_id = :user_id 
        AND s.action IN ('like', 'superlike')
        GROUP BY s.from_user_id, s.action, s.timestamp, u.name, u.age, u.is_active
        ORDER BY s.timestamp DESC
        LIMIT :limit
    """)
    
    result = await db.execute(stmt, {"user_id": user_id, "limit": limit})
    rows = result.fetchall()
    logger.info(f"Found {len(rows)} likes for user {user_id}")
    
    # Build response - photos already included
    likes = []
    for row in rows:
        from_user_id, action, timestamp, name, age, is_active, photos_str = row
        if not is_active:
            continue
        
        # Parse photos from GROUP_CONCAT result
        photos = photos_str.split(',') if photos_str else []
        
        likes.append({
            "id": from_user_id,
            "name": name,
            "age": age,
            "photos": photos,
            "isSuper": action == 'superlike',
            "likedAt": timestamp if timestamp else None
        })
    
    return {"likes": likes, "total": len(likes)}


class AddStarsRequest(BaseModel):
    amount: int

@router.post("/me/add-stars-dev")
async def add_stars_dev(
    data: AddStarsRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    DEV ONLY: Add stars to balance without payment.
    """
    current_user.stars_balance += data.amount
    await db.commit()
    return {"status": "ok", "new_balance": current_user.stars_balance}


@router.post("/me/spend-stars-dev")
async def spend_stars_dev(
    data: AddStarsRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    DEV ONLY: Spend stars.
    """
    if current_user.stars_balance < data.amount:
        raise HTTPException(status_code=400, detail="Not enough stars")
        
    current_user.stars_balance -= data.amount
    await db.commit()
    return {"status": "ok", "new_balance": current_user.stars_balance}


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
