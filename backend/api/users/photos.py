# Users API - Загрузка фото и верификация

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from backend.services.storage import storage_service
from backend.crud.user import add_user_photo
from backend.db.session import get_db
from backend.schemas.user import UserResponse, Location
from backend.services.moderation import ModerationService
from backend.config.settings import settings
import logging

from backend.api.users.profile import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


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
    file_url = await storage_service.save_verification_photo(file, db)
    
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


@router.get("/debug/photo-check")
async def debug_photo_check():
    """Diagnostic: check if photo upload dependencies are available."""
    result = {"pillow": False, "storage_dir": False, "writable": False}
    try:
        from PIL import Image
        result["pillow"] = True
        result["pillow_version"] = Image.__version__
    except ImportError as e:
        result["pillow_error"] = str(e)
    
    try:
        from pathlib import Path
        static_dir = Path(__file__).parent.parent.parent / "static" / "uploads"
        result["storage_dir"] = static_dir.exists()
        result["storage_path"] = str(static_dir)
        # Try creating dir
        static_dir.mkdir(exist_ok=True, parents=True)
        result["writable"] = True
        # Try writing a test file
        test_file = static_dir / "_test.txt"
        test_file.write_text("ok")
        test_file.unlink()
        result["write_test"] = "ok"
    except Exception as e:
        result["storage_error"] = str(e)
    
    return result


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
    
    # FIX (SEC-006): Validate file type and size
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Check content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_TYPES)}"
        )
    
    # Check file size (read first chunk to verify)
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Validate magic bytes (file signature)
    MAGIC_BYTES = {
        b'\xff\xd8\xff': 'image/jpeg',      # JPEG
        b'\x89PNG': 'image/png',             # PNG
        b'RIFF': 'image/webp',               # WebP (starts with RIFF)
        b'GIF8': 'image/gif',                # GIF
    }
    
    is_valid_signature = False
    for magic, mime in MAGIC_BYTES.items():
        if contents[:len(magic)] == magic:
            is_valid_signature = True
            break
    
    if not is_valid_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file content. File signature does not match allowed image types."
        )
    
    # Reset file position for storage service
    await file.seek(0)

    # Save file via StorageService
    file_url = await storage_service.save_user_photo(file, db)
    
    # Moderation Check
    try:
        is_safe = await ModerationService.check_content(
            db, 
            user_id=current_user.id, 
            content=file_url, 
            content_type="image"
        )
        
        if not is_safe:
            await storage_service.delete_photo(file_url, db)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image failed moderation policy"
            )
    except HTTPException:
        raise
    except Exception as e:
        # FAIL-OPEN: Allow photo if moderation service fails (MVP stage)
        logger.warning(f"Moderation check failed for {file_url}, allowing (fail-open): {e}")
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
