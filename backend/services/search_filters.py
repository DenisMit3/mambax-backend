"""
Search Filters Service
=======================
Расширенные фильтры поиска для дискавери.

Все фильтры доступны бесплатно:
- Возраст (min-max)
- Пол
- Дистанция
- Рост
- Интересы
- Образование
- Привычки (курение, алкоголь)
- Цель знакомства
- Дети
- Только верифицированные
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from math import radians, cos, sin, asin, sqrt
from backend import models
import logging
from backend.services.geo import geo_service

logger = logging.getLogger(__name__)

# ============================================================================
# SCHEMAS
# ============================================================================

class SearchFilters(BaseModel):
    """Фильтры поиска профилей"""
    
    # Базовые фильтры (бесплатно)
    age_min: Optional[int] = Field(18, ge=18, le=100, description="Минимальный возраст")
    age_max: Optional[int] = Field(100, ge=18, le=100, description="Максимальный возраст")
    gender: Optional[str] = Field(None, description="Пол: male, female, other")
    distance_km: Optional[int] = Field(50, ge=1, le=500, description="Радиус поиска в км")
    
    # Расширенные фильтры (Premium)
    height_min: Optional[int] = Field(None, ge=100, le=250, description="Минимальный рост (см)")
    height_max: Optional[int] = Field(None, ge=100, le=250, description="Максимальный рост (см)")
    interests: Optional[List[str]] = Field(None, description="Интересы для совпадения")
    smoking: Optional[List[str]] = Field(None, description="Курение: never, sometimes, regularly")
    drinking: Optional[List[str]] = Field(None, description="Алкоголь: never, socially, regularly")
    education: Optional[List[str]] = Field(None, description="Образование: high_school, bachelor, master, phd")
    looking_for: Optional[List[str]] = Field(None, description="Цель: relationship, friendship, casual, not_sure")
    children: Optional[List[str]] = Field(None, description="Дети: have, want, dont_want, maybe")
    verified_only: Optional[bool] = Field(False, description="Только верифицированные профили")
    with_photos_only: Optional[bool] = Field(True, description="Только с фото")
    online_recently: Optional[bool] = Field(False, description="Был онлайн недавно (24ч)")


class FilterOption(BaseModel):
    """Опция фильтра для UI"""
    value: str
    label: str
    emoji: Optional[str] = None


# ============================================================================
# FILTER OPTIONS (для отображения в UI)
# ============================================================================

GENDER_OPTIONS = [
    FilterOption(value="male", label="Мужчина", emoji="👨"),
    FilterOption(value="female", label="Женщина", emoji="👩"),
    FilterOption(value="other", label="Другое", emoji="🧑"),
]

SMOKING_OPTIONS = [
    FilterOption(value="never", label="Не курю", emoji="🚭"),
    FilterOption(value="sometimes", label="Иногда", emoji="🚬"),
    FilterOption(value="regularly", label="Регулярно", emoji="🚬"),
]

DRINKING_OPTIONS = [
    FilterOption(value="never", label="Не пью", emoji="🚫"),
    FilterOption(value="socially", label="По праздникам", emoji="🍷"),
    FilterOption(value="regularly", label="Регулярно", emoji="🍺"),
]

EDUCATION_OPTIONS = [
    FilterOption(value="high_school", label="Среднее", emoji="🏫"),
    FilterOption(value="bachelor", label="Бакалавр", emoji="🎓"),
    FilterOption(value="master", label="Магистр", emoji="📚"),
    FilterOption(value="phd", label="Аспирантура/PhD", emoji="🎯"),
]

LOOKING_FOR_OPTIONS = [
    FilterOption(value="relationship", label="Серьёзные отношения", emoji="💑"),
    FilterOption(value="friendship", label="Дружба", emoji="🤝"),
    FilterOption(value="casual", label="Свидания", emoji="☕"),
    FilterOption(value="not_sure", label="Не определился", emoji="🤷"),
]

CHILDREN_OPTIONS = [
    FilterOption(value="have", label="Есть дети", emoji="👶"),
    FilterOption(value="want", label="Хочу детей", emoji="🍼"),
    FilterOption(value="dont_want", label="Не хочу детей", emoji="🚫"),
    FilterOption(value="maybe", label="Может быть", emoji="🤔"),
]

INTEREST_SUGGESTIONS = [
    "Путешествия", "Спорт", "Музыка", "Кино", "Книги", "Фотография",
    "Кулинария", "Йога", "Танцы", "Искусство", "Технологии", "Природа",
    "Животные", "Игры", "Фитнес", "Походы", "Велосипед", "Бег",
    "Плавание", "Горы", "Море", "Кофе", "Вино", "Рестораны"
]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Вычисление расстояния между двумя точками на Земле (в км).
    Формула гаверсинусов.
    """
    R = 6371  # Радиус Земли в км
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c


def interests_match(user_interests: List[str], filter_interests: List[str]) -> bool:
    """Проверка совпадения хотя бы одного интереса"""
    if not filter_interests:
        return True
    
    user_set = set(i.lower() for i in (user_interests or []))
    filter_set = set(i.lower() for i in filter_interests)
    
    return bool(user_set & filter_set)


# ============================================================================
# MAIN FILTER FUNCTION
# ============================================================================

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
    from uuid import UUID
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
    # Critical for dating apps: don't show same person twice
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
            # Search larger radius candidates to allow for other filter narrowing
            nearby_users = await geo_service.search_nearby_users(
                current_user.latitude, 
                current_user.longitude, 
                filters.distance_km,
                count=limit * 10 
            )
            
            if nearby_users:
                nearby_ids = [u['user_id'] for u in nearby_users if str(u['user_id']) != str(current_user_id)]
                
                if nearby_ids:
                    # Filter SQL query to only include these users
                    # This dramatically reduces DB load from Full Table Scan to ID Lookup
                    query = query.where(models.User.id.in_(nearby_ids))
                    filters_applied.append(f"geo_radius <= {filters.distance_km}km (Redis)")
                else:
                    return {"profiles": [], "total": 0, "filters_applied": ["distance (0 found)"]}
            else:
                 # No users found in Redis index
                 return {"profiles": [], "total": 0, "filters_applied": ["distance (0 found)"]}
                 
        except Exception as e:
            logger.error(f"Redis Geo Search Failed: {e}. Falling back to Python-based filtering.")
            # Fallback will occur naturally in post-processing loop below
            pass

    # ========================================
    # БАЗОВЫЕ ФИЛЬТРЫ (бесплатно)
    # ========================================
    
    # Возраст
    if filters.age_min:
        query = query.where(models.User.age >= filters.age_min)
        filters_applied.append(f"age >= {filters.age_min}")
    
    if filters.age_max:
        query = query.where(models.User.age <= filters.age_max)
        filters_applied.append(f"age <= {filters.age_max}")
    
    # Пол
    if filters.gender:
        query = query.where(models.User.gender == filters.gender)
        filters_applied.append(f"gender = {filters.gender}")
    
    # Только с фото
    if filters.with_photos_only:
        # JSON array not empty check (зависит от БД)
        # Для PostgreSQL/SQLite с JSON
        query = query.where(models.User.photos != None)
        filters_applied.append("has_photos")
    
    # ========================================
    # ВСЕ ФИЛЬТРЫ ДОСТУПНЫ БЕСПЛАТНО
    # ========================================
    
    # Рост
    if filters.height_min:
        query = query.where(models.User.height >= filters.height_min)
        filters_applied.append(f"height >= {filters.height_min}")
    
    if filters.height_max:
        query = query.where(models.User.height <= filters.height_max)
        filters_applied.append(f"height <= {filters.height_max}")
    
    # Курение
    if filters.smoking:
        query = query.where(models.User.smoking.in_(filters.smoking))
        filters_applied.append(f"smoking in {filters.smoking}")
    
    # Алкоголь
    if filters.drinking:
        query = query.where(models.User.drinking.in_(filters.drinking))
        filters_applied.append(f"drinking in {filters.drinking}")
    
    # Образование
    if filters.education:
        query = query.where(models.User.education.in_(filters.education))
        filters_applied.append(f"education in {filters.education}")
    
    # Цель знакомства
    if filters.looking_for:
        query = query.where(models.User.looking_for.in_(filters.looking_for))
        filters_applied.append(f"looking_for in {filters.looking_for}")
    
    # Дети
    if filters.children:
        query = query.where(models.User.children.in_(filters.children))
        filters_applied.append(f"children in {filters.children}")
    
    # Только верифицированные
    if filters.verified_only:
        query = query.where(models.User.is_verified == True)
        filters_applied.append("verified_only")
    
    # SORTING strategy: VIPs first, then Newest members
    query = query.order_by(
        models.User.is_vip.desc().nullslast(),
        models.User.created_at.desc()
    )

    # Выполняем запрос
    result = await db.execute(query.offset(skip).limit(limit * 2))  # Берём больше для пост-фильтрации
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
        # Skip shadowbanned users (теперь O(1) lookup в set)
        if str(profile.id) in shadowbanned_ids:
            continue

        # Фильтр по дистанции
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
        
        # Фильтр по интересам
        if filters.interests:
            if not interests_match(profile.interests, filters.interests):
                continue
            # Считаем совпадения
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


def profile_to_dict(profile: models.User) -> Dict[str, Any]:
    """Конвертация профиля в словарь"""
    return {
        "id": str(profile.id),
        "name": profile.name,
        "age": profile.age,
        "gender": profile.gender,
        "bio": profile.bio,
        "photos": profile.photos or [],
        "interests": profile.interests or [],
        "height": getattr(profile, 'height', None),
        "smoking": getattr(profile, 'smoking', None),
        "drinking": getattr(profile, 'drinking', None),
        "education": getattr(profile, 'education', None),
        "looking_for": getattr(profile, 'looking_for', None),
        "children": getattr(profile, 'children', None),
        "is_verified": getattr(profile, 'is_verified', False),
        "is_vip": profile.is_vip
    }


# ============================================================================
# API HELPER
# ============================================================================

def get_all_filter_options() -> Dict[str, Any]:
    """Получить все опции фильтров для UI"""
    return {
        "gender": [opt.dict() for opt in GENDER_OPTIONS],
        "smoking": [opt.dict() for opt in SMOKING_OPTIONS],
        "drinking": [opt.dict() for opt in DRINKING_OPTIONS],
        "education": [opt.dict() for opt in EDUCATION_OPTIONS],
        "looking_for": [opt.dict() for opt in LOOKING_FOR_OPTIONS],
        "children": [opt.dict() for opt in CHILDREN_OPTIONS],
        "interests": INTEREST_SUGGESTIONS,
        "age": {"min": 18, "max": 100},
        "height": {"min": 100, "max": 250},
        "distance": {"min": 1, "max": 500, "default": 50}
    }
