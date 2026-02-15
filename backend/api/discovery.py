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
from backend.services.geo import geo_service
from backend.services.storage import storage_service
from backend.services.ai import ai_service
from backend.core.redis import redis_manager
from datetime import date
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


def _hash_filters(filters: SearchFilters, skip: int, limit: int) -> str:
    """Generate hash for cache key based on filter parameters"""
    import hashlib
    filter_str = f"{filters.age_min}:{filters.age_max}:{filters.gender}:{filters.distance_km}:" \
                 f"{filters.height_min}:{filters.height_max}:{filters.verified_only}:{filters.with_photos_only}:" \
                 f"{sorted(filters.interests or [])}:{sorted(filters.smoking or [])}:" \
                 f"{sorted(filters.drinking or [])}:{sorted(filters.education or [])}:" \
                 f"{sorted(filters.looking_for or [])}:{sorted(filters.children or [])}:" \
                 f"{skip}:{limit}"
    return hashlib.md5(filter_str.encode()).hexdigest()[:16]


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
    verified_only: bool = False,
    with_photos_only: bool = True,
    # Use standard FastAPI List[str] Query handling
    interests: Optional[List[str]] = Query(None),
    smoking: Optional[List[str]] = Query(None),
    drinking: Optional[List[str]] = Query(None),
    education: Optional[List[str]] = Query(None),
    looking_for: Optional[List[str]] = Query(None),
    children: Optional[List[str]] = Query(None),
    
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🔍 Поиск профилей с расширенными фильтрами
    PERF: Redis кэширование на 5 минут
    """
    
    filters = SearchFilters(
        age_min=age_min,
        age_max=age_max,
        gender=gender,
        distance_km=distance_km,
        height_min=height_min,
        height_max=height_max,
        interests=interests,
        smoking=smoking,
        drinking=drinking,
        education=education,
        looking_for=looking_for,
        children=children,
        verified_only=verified_only,
        with_photos_only=with_photos_only
    )
    
    # PERF: Redis cache for /discover endpoint (TTL 5 minutes)
    cache_key = f"discover:{current_user}:{_hash_filters(filters, skip, limit)}"
    
    try:
        cached = await redis_manager.get_json(cache_key)
        if cached:
            return {"profiles": cached.get("profiles", []), "total": cached.get("total", 0), "cached": True}
    except Exception as e:
        logger.warning(f"Redis cache read error: {e}")
    
    # Получаем VIP статус
    user = await crud.get_user_profile(db, current_user)
    is_vip = user.is_vip if user else False

    res = await get_filtered_profiles(
        db=db,
        current_user_id=current_user,
        filters=filters,
        skip=skip,
        limit=limit,
        is_vip=is_vip
    )

    # AI Personalization: Add compatibility score and common interests
    user_profile = await crud.get_user_profile(db, current_user)
    if user_profile:
        current_interests = set(user_profile.interests)
        for profile in res.get("profiles", []):
            p_interests = set(profile.get("interests", []))
            profile["common_interests"] = list(p_interests & current_interests)
            profile["compatibility_score"] = ai_service.calculate_compatibility(user_profile, profile)
    
    # PERF: Cache result for 5 minutes
    try:
        await redis_manager.set_json(cache_key, res, expire=300)
    except Exception as e:
        logger.warning(f"Redis cache write error: {e}")
            
    return res


@router.get("/discover/prefetch")
async def prefetch_profiles(
    limit: int = 10,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🚀 Prefetch следующих профилей для оптимизации UX.
    Возвращает до 10 профилей с минимальными данными.
    """
    from backend.crud.interaction import get_user_feed
    from uuid import UUID
    
    profiles = await get_user_feed(db, UUID(current_user), limit=limit)
    
    # Минимальный набор данных для prefetch
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "age": p.age,
            "photos": p.photos[:1] if p.photos else [],  # Только первое фото
            "distance": getattr(p, 'distance_km', 0),
            "is_verified": p.is_verified
        }
        for p in profiles
    ]


@router.get("/discover/daily-picks")
async def get_daily_picks(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🌟 AI Daily Picks - персональная подборка на сегодня
    Кэшируется на 24 часа
    """
    cache_key = f"daily_picks:{current_user}:{date.today().isoformat()}"
    
    # Проверить кэш
    cached = await redis_manager.get_json(cache_key)
    if cached:
        return {"picks": cached, "cached": True}
    
    # Генерация новой подборки
    picks = await ai_service.generate_daily_picks(current_user, db, limit=5)
    
    # Кэшировать на 24 часа
    await redis_manager.set_json(cache_key, picks, expire=86400)
    
    # Send Notification (Comment 3)
    from backend.services.notification import send_daily_picks_notification
    await send_daily_picks_notification(db, current_user)
    
    return {"picks": picks, "cached": False}


@router.post("/discover/daily-picks/refresh")
async def refresh_daily_picks(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🔄 Обновить Daily Picks (доступно 1 раз в день для FREE, безлимит для VIP)
    """
    user = await crud.get_user_profile(db, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверка лимита обновлений
    refresh_key = f"daily_picks_refresh:{current_user}:{date.today().isoformat()}"
    refresh_count = await redis_manager.get_value(refresh_key) or "0"
    
    if not user.is_vip and int(refresh_count) >= 1:
        raise HTTPException(
            status_code=429, 
            detail="Daily picks refresh limit reached. Upgrade to VIP for unlimited refreshes."
        )
    
    # Инвалидировать кэш и сгенерировать новую подборку
    cache_key = f"daily_picks:{current_user}:{date.today().isoformat()}"
    await redis_manager.delete(cache_key)
    
    picks = await ai_service.generate_daily_picks(current_user, db, limit=5)
    await redis_manager.set_json(cache_key, picks, expire=86400)
    
    # Send Notification (Comment 3)
    from backend.services.notification import send_daily_picks_notification
    await send_daily_picks_notification(db, current_user)
    
    # Увеличить счетчик обновлений
    await redis_manager.set_value(refresh_key, str(int(refresh_count) + 1), expire=86400)
    
    return {"picks": picks, "refreshed": True}


@router.get("/discover/smart-filters")
async def get_smart_filters(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🧠 Smart Filters - автоматические предложения фильтров на основе предпочтений
    """
    filters = await ai_service.suggest_smart_filters(current_user, db)
    return filters


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

