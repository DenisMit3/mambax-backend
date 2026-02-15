from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from backend import crud, schemas, auth, database
from backend.services.moderation import ModerationService
from backend.services.geo import geo_service
from backend.services.storage import storage_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Discovery & Profiles"])


@router.post("/profile", response_model=schemas.ProfileResponse)
async def create_profile(
    profile: schemas.ProfileCreate, 
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """Обновление профиля текущего пользователя (обратная совместимость)"""
    return await crud.update_profile(db, current_user, profile)

@router.get("/profiles", response_model=list[schemas.ProfileResponse])
async def get_profiles(
    skip: int = 0, 
    limit: int = 20, 
    current_user: str = Depends(auth.get_current_user), 
    db: AsyncSession = Depends(database.get_db)
):
    """Простой список профилей (обратная совместимость)"""
    from uuid import UUID
    return await crud.get_user_feed(db, UUID(current_user), limit=limit)


@router.get("/me", response_model=schemas.ProfileResponse)
async def get_my_profile(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    profile = await crud.get_user_profile(db, current_user)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("/profile", response_model=schemas.ProfileResponse)
async def update_profile(
    profile_update: schemas.ProfileUpdate,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Moderate content
    if profile_update.name and not ModerationService.check_text(profile_update.name):
        raise HTTPException(status_code=400, detail="Name contains inappropriate content")
    
    if profile_update.bio:
        profile_update.bio = ModerationService.sanitize_text(profile_update.bio)
    
    if profile_update.interests:
        # Sanitize each interest tag
        profile_update.interests = [ModerationService.sanitize_text(tag) for tag in profile_update.interests]

    updated_profile = await crud.update_profile(db, current_user, profile_update)
    if not updated_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    # Sync metadata to Redis if user has location
    if updated_profile.latitude and updated_profile.longitude:
        try:
             await geo_service.update_location(
                str(updated_profile.id), 
                updated_profile.latitude, 
                updated_profile.longitude,
                metadata={"name": updated_profile.name or "", "age": updated_profile.age or 0}
            )
        except Exception as e:
            logger.error(f"Failed to sync metadata to Redis for user {current_user}: {e}")

    return updated_profile

@router.post("/location")
async def update_location(
    loc: dict, 
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # Rate Limit: max 1 request per 10 seconds per user
    from backend.core.redis import redis_manager
    is_allowed = await redis_manager.rate_limit(f"loc_update:{current_user}", limit=1, period=10)
    if not is_allowed:
        raise HTTPException(
            status_code=429, 
            detail="Location updates are too frequent. Please wait a few seconds."
        )

    profile = await crud.get_user_profile(db, current_user)
    if profile:
        profile.latitude = loc.get("lat")
        profile.longitude = loc.get("lon")
        await db.commit()
        
        # Sync to High-Performance Redis Geo Index
        try:
            await geo_service.update_location(
                current_user, 
                profile.latitude, 
                profile.longitude,
                metadata={"name": profile.name or "", "age": profile.age or 0}
            )
        except Exception as e:
            logger.error(f"Failed to sync location to Redis for user {current_user}: {e}")
            
    return {"status": "ok"}

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(database.get_db),
    current_user: str = Depends(auth.get_current_user)
):
    """
    Unified Secure Upload for Discovery/Profile.
    Uses StorageService for cross-platform consistency.
    """
    # 1. Save file via unified storage service (returns DB URL)
    file_url = await storage_service.save_user_photo(file, db)
    
    # 2. Real Moderation Check on the actual file content
    try:
        is_safe = await ModerationService.check_content(
            db, 
            user_id=uuid.UUID(current_user), 
            content=file_url, 
            content_type="image"
        )
        
        if not is_safe:
            # DELETE the bad file immediately
            await storage_service.delete_photo(file_url, db)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Image failed moderation policy"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Moderation CRITICAL error for {file_url}: {e}")
        # FAIL-CLOSE: Delete the file if we can't verify its safety
        await storage_service.delete_photo(file_url, db)
        raise HTTPException(status_code=500, detail="Moderation temporary unavailable. Please try later.")

    # URL already includes CDN prefix from storage_service.save_user_photo()
    return {"url": file_url}
