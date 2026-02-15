"""
Search Filters - Main filter logic
===================================
Основная функция get_filtered_profiles.
"""

from typing import Dict, Any
from uuid import UUID

from sqlalchemy import exists
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging

from backend import models
from backend.models.user import UserPhoto
from backend.services.geo import geo_service
from backend.services.search_filters.schemas import SearchFilters
from backend.services.search_filters.helpers import (
    haversine_distance,
    interests_match,
    profile_to_dict,
)

logger = logging.getLogger(__name__)


async def get_filtered_profiles(
    db: AsyncSession,
    current_user_id: str,
    filters: SearchFilters,
    skip: int = 0,
    limit: int = 20,
    is_vip: bool = False
) -> Dict[str, Any]:
    """
    Получить профили с применением фильтров.
    
    Args:
        db: Сессия БД
        current_user_id: ID текущего пользователя
        filters: Параметры фильтрации
        skip: Пропустить N профилей (пагинация)
        limit: Максимум профилей
        is_vip: VIP статус (для расширенных фильтров)
    
    Returns:
        {"profiles": [...], "total": int, "filters_applied": [...]}
    """
    # CAST ID TO UUID
    try:
        u_id = UUID(current_user_id) if isinstance(current_user_id, str) else current_user_id
    except ValueError:
        return {"profiles": [], "total": 0, "error": "Invalid User ID"}

    # Получаем текущего пользователя для определения его геолокации
    current_user = await db.execute(
        select(models.User).where(models.User.id == u_id)
    )
    current_user = current_user.scalars().first()
    
    if not current_user:
        return {"profiles": [], "total": 0, "error": "User not found"}
    
    # Начинаем запрос
    query = select(models.User).where(
        models.User.id != u_id,
        models.User.is_complete == True,
        models.User.is_active == True
    )

    # EXCLUDE ALREADY SEEN (Swipes & Blocks)
    swiped_subq = select(models.Swipe.to_user_id).where(models.Swipe.from_user_id == u_id)
    blocked_subq = select(models.Block.blocked_id).where(models.Block.blocker_id == u_id)
    
    query = query.where(
        models.User.id.not_in(swiped_subq),
        models.User.id.not_in(blocked_subq)
    )
    
    filters_applied = []
    
    # ========================================
    # ULTRA-SCALE GEO FILTER (Redis)
    # ========================================
    if filters.distance_km and current_user.latitude and current_user.longitude:
        try:
            nearby_users = await geo_service.search_nearby_users(
                current_user.latitude, 
                current_user.longitude, 
                filters.distance_km,
                count=limit * 10 
            )
            
            if nearby_users:
                nearby_ids = [UUID(u['user_id']) for u in nearby_users if str(u['user_id']) != str(current_user_id)]
                
                if nearby_ids:
                    query = query.where(models.User.id.in_(nearby_ids))
                    filters_applied.append(f"geo_radius <= {filters.distance_km}km (Redis)")
                else:
                    return {"profiles": [], "total": 0, "filters_applied": ["distance (0 found)"]}
            else:
                 return {"profiles": [], "total": 0, "filters_applied": ["distance (0 found)"]}
                 
        except Exception as e:
            logger.error(f"Redis Geo Search Failed: {e}. Falling back to Python-based filtering.")
            pass

    # ========================================
    # БАЗОВЫЕ ФИЛЬТРЫ (бесплатно)
    # ========================================
    
    if filters.age_min:
        query = query.where(models.User.age >= filters.age_min)
        filters_applied.append(f"age >= {filters.age_min}")
    
    if filters.age_max:
        query = query.where(models.User.age <= filters.age_max)
        filters_applied.append(f"age <= {filters.age_max}")
    
    if filters.gender:
        query = query.where(models.User.gender == filters.gender)
        filters_applied.append(f"gender = {filters.gender}")
    
    if filters.with_photos_only:
        query = query.where(exists(select(UserPhoto.id).where(UserPhoto.user_id == models.User.id)))
        filters_applied.append("has_photos")
    
    # ========================================
    # ВСЕ ФИЛЬТРЫ ДОСТУПНЫ БЕСПЛАТНО
    # ========================================
    
    if filters.height_min:
        query = query.where(models.User.height >= filters.height_min)
        filters_applied.append(f"height >= {filters.height_min}")
    
    if filters.height_max:
        query = query.where(models.User.height <= filters.height_max)
        filters_applied.append(f"height <= {filters.height_max}")
    
    if filters.smoking:
        query = query.where(models.User.smoking.in_(filters.smoking))
        filters_applied.append(f"smoking in {filters.smoking}")
    
    if filters.drinking:
        query = query.where(models.User.drinking.in_(filters.drinking))
        filters_applied.append(f"drinking in {filters.drinking}")
    
    if filters.education:
        query = query.where(models.User.education.in_(filters.education))
        filters_applied.append(f"education in {filters.education}")
    
    if filters.looking_for:
        query = query.where(models.User.looking_for.in_(filters.looking_for))
        filters_applied.append(f"looking_for in {filters.looking_for}")
    
    if filters.children:
        query = query.where(models.User.children.in_(filters.children))
        filters_applied.append(f"children in {filters.children}")
    
    if filters.verified_only:
        query = query.where(models.User.is_verified == True)
        filters_applied.append("verified_only")
    
    # SORTING strategy: VIPs first, then Newest members
    query = query.order_by(
        models.User.is_vip.desc().nullslast(),
        models.User.created_at.desc()
    )

    result = await db.execute(query.offset(skip).limit(limit * 2))
    profiles_raw = result.scalars().all()
    
    # ========================================
    # ПОСТ-ФИЛЬТРАЦИЯ (геолокация, интересы)
    # ========================================
    
    profiles = []
    
    # PERF-006: Batch проверка shadowban вместо N+1 запросов
    from backend.services.security import get_shadowbanned_ids_batch
    profile_ids = [str(p.id) for p in profiles_raw]
    shadowbanned_ids = await get_shadowbanned_ids_batch(profile_ids)
    
    for profile in profiles_raw:
        if str(profile.id) in shadowbanned_ids:
            continue

        if filters.distance_km and current_user.latitude and current_user.longitude:
            if profile.latitude and profile.longitude:
                dist = haversine_distance(
                    current_user.latitude, current_user.longitude,
                    profile.latitude, profile.longitude
                )
                if dist > filters.distance_km:
                    continue
                profile_dict = profile_to_dict(profile)
                profile_dict["distance_km"] = round(dist, 1)
            else:
                profile_dict = profile_to_dict(profile)
                profile_dict["distance_km"] = None
        else:
            profile_dict = profile_to_dict(profile)
            profile_dict["distance_km"] = None
        
        if filters.interests:
            if not interests_match(profile.interests, filters.interests):
                continue
            user_set = set(i.lower() for i in (profile.interests or []))
            filter_set = set(i.lower() for i in filters.interests)
            profile_dict["matching_interests"] = list(user_set & filter_set)
        
        profiles.append(profile_dict)
        
        if len(profiles) >= limit:
            break
    
    return {
        "profiles": profiles,
        "total": len(profiles),
        "filters_applied": filters_applied
    }
