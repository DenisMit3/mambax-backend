from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
import httpx
import os
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from backend import crud, schemas, auth, database, models
from backend.services.moderation import ModerationService
from backend.services.search_filters import SearchFilters, get_filtered_profiles, get_all_filter_options
from backend.services.pagination import get_matches_paginated, get_messages_paginated

router = APIRouter(tags=["Discovery & Profiles"])

# In-memory mock store for local development (Moved from main.py)
MOCK_USER_STORE = {
    "00000000-0000-0000-0000-000000000000": {
        "id": "00000000-0000-0000-0000-000000000000",
        "user_id": "00000000-0000-0000-0000-000000000000",
        "name": "Local Demo User",
        "age": 25,
        "gender": "robot",
        "photos": [],
        "interests": ["Coding", "Debugging"],
        "bio": "I am a local simulation."
    }
}

@router.post("/profile", response_model=schemas.ProfileResponse)
async def create_profile(
    profile: schemas.ProfileCreate, 
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.create_profile(db, profile, current_user)

@router.get("/profiles", response_model=list[schemas.ProfileResponse])
async def get_profiles(
    skip: int = 0, 
    limit: int = 20, 
    current_user: str = Depends(auth.get_current_user), 
    db: AsyncSession = Depends(database.get_db)
):
    """Простой список профилей (обратная совместимость)"""
    return await crud.get_profiles(db, skip, limit, exclude_user_id=current_user)


@router.post("/discover")
async def discover_profiles(
    skip: int = 0,
    limit: int = 20,
    age_min: int = 18,
    age_max: int = 100,
    gender: str = None,
    distance_km: int = 50,
    height_min: int = None,
    height_max: int = None,
    interests: str = None,  # comma-separated
    smoking: str = None,  # comma-separated
    drinking: str = None,  # comma-separated
    education: str = None,  # comma-separated
    looking_for: str = None,  # comma-separated
    children: str = None,  # comma-separated
    verified_only: bool = False,
    with_photos_only: bool = True,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🔍 Поиск профилей с расширенными фильтрами
    
    Базовые фильтры (бесплатно): возраст, пол, дистанция
    Расширенные фильтры (Premium): рост, интересы, привычки, образование
    """
    
    # Получаем VIP статус
    user = await crud.get_user_profile(db, current_user)
    is_vip = user.is_vip if user else False
    
    # Парсим списки из comma-separated строк
    def parse_list(s):
        return [x.strip() for x in s.split(",")] if s else None
    
    filters = SearchFilters(
        age_min=age_min,
        age_max=age_max,
        gender=gender,
        distance_km=distance_km,
        height_min=height_min,
        height_max=height_max,
        interests=parse_list(interests),
        smoking=parse_list(smoking),
        drinking=parse_list(drinking),
        education=parse_list(education),
        looking_for=parse_list(looking_for),
        children=parse_list(children),
        verified_only=verified_only,
        with_photos_only=with_photos_only
    )
    
    return await get_filtered_profiles(
        db=db,
        current_user_id=current_user,
        filters=filters,
        skip=skip,
        limit=limit,
        is_vip=is_vip
    )


@router.get("/filters/options")
async def get_filter_options_endpoint():
    """
    📋 Получить все опции фильтров для UI
    """
    return get_all_filter_options()


# ============================================================================
# CURSOR PAGINATION ENDPOINTS (Infinite Scroll)
# ============================================================================

@router.get("/matches/paginated")
async def get_matches_paginated_endpoint(
    limit: int = 20,
    cursor: str = None,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    💬 Матчи с курсорной пагинацией
    """
    result = await get_matches_paginated(
        db=db,
        user_id=current_user,
        limit=limit,
        cursor=cursor
    )
    
    return result.dict()


@router.get("/matches/{match_id}/messages/paginated")
async def get_messages_paginated_endpoint(
    match_id: str,
    limit: int = 50,
    cursor: str = None,
    direction: str = "older",
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    📨 Сообщения с курсорной пагинацией
    """
    result = await get_messages_paginated(
        db=db,
        match_id=match_id,
        limit=limit,
        cursor=cursor,
        direction=direction
    )
    
    return result.dict()

@router.get("/me", response_model=schemas.ProfileResponse)
async def get_my_profile(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    if current_user == "00000000-0000-0000-0000-000000000000":
        return schemas.ProfileResponse(**MOCK_USER_STORE[current_user])

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
    if current_user == "00000000-0000-0000-0000-000000000000":
        data = MOCK_USER_STORE[current_user]
        if profile_update.name: 
            if not ModerationService.check_text(profile_update.name):
                raise HTTPException(status_code=400, detail="Name contains inappropriate content")
            data["name"] = profile_update.name
        if profile_update.bio:
            data["bio"] = ModerationService.sanitize_text(profile_update.bio)
        if profile_update.gender: data["gender"] = profile_update.gender
        if profile_update.interests: data["interests"] = profile_update.interests
        if profile_update.photos: data["photos"] = profile_update.photos
        if profile_update.age: data["age"] = profile_update.age
        
        return schemas.ProfileResponse(**data)

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
    return updated_profile

@router.post("/location")
async def update_location(
    loc: dict, 
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    profile = await crud.get_user_profile(db, current_user)
    if profile:
        profile.latitude = loc.get("lat")
        profile.longitude = loc.get("lon")
        await db.commit()
        
        # Sync to High-Performance Redis Geo Index
        try:
            from backend.services.geo import geo_service
            await geo_service.update_location(
                current_user, 
                profile.latitude, 
                profile.longitude,
                metadata={"name": profile.name or "", "age": profile.age or 0}
            )
        except Exception as e:
            print(f"Redis Sync Error: {e}")
            
    return {"status": "ok"}

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: str = Depends(auth.get_current_user)
):
    """Upload file to Vercel Blob Storage with mock fallback for local development"""
    
    # Read file content
    content = await file.read()
    
    # Moderate image (Placeholder)
    # In real world, send bytes to external service
    if not ModerationService.check_image("placeholder_url"):
         raise HTTPException(status_code=400, detail="Image contains inappropriate content")
         
    filename = f"{uuid.uuid4()}-{file.filename}"
    
    # Get Vercel Blob token from environment
    blob_token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    
    if not blob_token:
        # Mock fallback for local development when BLOB_READ_WRITE_TOKEN not configured
        print("BLOB_READ_WRITE_TOKEN not configured. Using mock avatar.")
        mock_id = str(uuid.uuid4())[:8]
        return {"url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={mock_id}"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"https://blob.vercel-storage.com/{filename}",
                content=content,
                headers={
                    "Authorization": f"Bearer {blob_token}",
                    "x-api-version": "7",
                    "Content-Type": file.content_type or "application/octet-stream"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Blob upload failed: {response.text}")
            
            result = response.json()
            return {"url": result.get("url")}
            
    except Exception as e:
        # Fallback to mock avatar on any upload failure
        print(f"Upload failed: {e}. Returning mock avatar.")
        mock_id = str(uuid.uuid4())[:8]
        return {"url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={mock_id}"}

