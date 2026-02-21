# Matching Preferences Service - настройки поиска с dealbreakers

import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.profile_enrichment import UserPreference
from backend.models.user import User

logger = logging.getLogger(__name__)

# Доступные категории и ключи предпочтений
PREFERENCE_SCHEMA = {
    "basic": {
        "age": {"type": "range", "min": 18, "max": 100, "label": "Возраст"},
        "distance_km": {"type": "range", "min": 1, "max": 500, "label": "Расстояние (км)"},
        "gender": {"type": "select", "options": ["male", "female", "any"], "label": "Пол"},
    },
    "appearance": {
        "height": {"type": "range", "min": 140, "max": 220, "label": "Рост (см)"},
        "body_type": {"type": "multiselect", "options": ["slim", "athletic", "average", "curvy", "plus_size"], "label": "Телосложение"},
    },
    "lifestyle": {
        "smoking": {"type": "multiselect", "options": ["never", "socially", "regularly"], "label": "Курение"},
        "drinking": {"type": "multiselect", "options": ["never", "socially", "regularly"], "label": "Алкоголь"},
        "children": {"type": "multiselect", "options": ["no", "want", "have", "dont_want"], "label": "Дети"},
    },
    "values": {
        "religion": {"type": "multiselect", "options": ["christian", "muslim", "jewish", "buddhist", "hindu", "atheist", "other"], "label": "Религия"},
        "education": {"type": "multiselect", "options": ["high_school", "bachelor", "master", "phd"], "label": "Образование"},
        "looking_for": {"type": "multiselect", "options": ["casual", "relationship", "marriage", "friendship"], "label": "Цель знакомства"},
    }
}


async def get_matching_preferences(
    db: AsyncSession,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Получить все настройки поиска пользователя.
    
    Returns:
        {
            "preferences": {
                "age_min": 18,
                "age_max": 50,
                ...
            },
            "dealbreakers": ["smoking", "children"],
            "schema": {...}
        }
    """
    # Получаем все предпочтения пользователя
    stmt = select(UserPreference).where(UserPreference.user_id == user_id)
    result = await db.execute(stmt)
    prefs = result.scalars().all()
    
    # Формируем словарь предпочтений
    preferences = {}
    dealbreakers = []
    
    for pref in prefs:
        key = pref.key
        value = pref.value
        
        # Для range типов разворачиваем в min/max
        if isinstance(value, dict) and "min" in value:
            preferences[f"{key}_min"] = value.get("min")
            preferences[f"{key}_max"] = value.get("max")
        else:
            preferences[key] = value
        
        if pref.is_dealbreaker:
            dealbreakers.append(key)
    
    # Добавляем дефолтные значения для отсутствующих
    defaults = _get_default_preferences()
    for key, value in defaults.items():
        if key not in preferences and f"{key}_min" not in preferences:
            if isinstance(value, dict) and "min" in value:
                preferences[f"{key}_min"] = value.get("min")
                preferences[f"{key}_max"] = value.get("max")
            else:
                preferences[key] = value
    
    return {
        "preferences": preferences,
        "dealbreakers": dealbreakers,
        "schema": PREFERENCE_SCHEMA
    }


async def update_matching_preferences(
    db: AsyncSession,
    user_id: uuid.UUID,
    preferences: Dict[str, Any],
    dealbreakers: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Обновить настройки поиска.
    
    Args:
        preferences: Словарь предпочтений
        dealbreakers: Список ключей, которые являются dealbreakers
    
    Returns:
        {"success": bool, "message": str, "updated": list}
    """
    dealbreakers = dealbreakers or []
    updated_keys = []
    
    # Группируем min/max в range
    grouped = _group_range_preferences(preferences)
    
    for key, value in grouped.items():
        # Валидация
        if not _validate_preference(key, value):
            continue
        
        # Определяем категорию
        category = _get_preference_category(key)
        
        # Ищем существующую запись
        stmt = select(UserPreference).where(
            UserPreference.user_id == user_id,
            UserPreference.key == key
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        is_dealbreaker = key in dealbreakers
        
        if existing:
            existing.value = value
            existing.is_dealbreaker = is_dealbreaker
            existing.category = category
            existing.updated_at = datetime.utcnow()
        else:
            pref = UserPreference(
                user_id=user_id,
                category=category,
                key=key,
                value=value,
                is_dealbreaker=is_dealbreaker
            )
            db.add(pref)
        
        updated_keys.append(key)
    
    await db.commit()
    
    logger.info(f"User {user_id} updated preferences: {updated_keys}")
    
    return {
        "success": True,
        "message": "Настройки сохранены",
        "updated": updated_keys
    }


async def set_dealbreaker(
    db: AsyncSession,
    user_id: uuid.UUID,
    key: str,
    is_dealbreaker: bool
) -> Dict[str, Any]:
    """
    Установить/снять флаг dealbreaker для предпочтения.
    """
    stmt = select(UserPreference).where(
        UserPreference.user_id == user_id,
        UserPreference.key == key
    )
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()
    
    if not pref:
        return {"success": False, "message": "Предпочтение не найдено"}
    
    pref.is_dealbreaker = is_dealbreaker
    pref.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"Dealbreaker {'установлен' if is_dealbreaker else 'снят'}"
    }


async def reset_preferences(
    db: AsyncSession,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Сбросить все предпочтения к дефолтным.
    """
    # Удаляем все предпочтения
    await db.execute(
        delete(UserPreference).where(UserPreference.user_id == user_id)
    )
    await db.commit()
    
    logger.info(f"User {user_id} reset preferences to defaults")
    
    return {"success": True, "message": "Настройки сброшены"}


async def get_preference_suggestions(
    db: AsyncSession,
    user_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Получить рекомендации по настройке предпочтений.
    """
    user = await db.get(User, user_id)
    if not user:
        return []
    
    suggestions = []
    
    # Получаем текущие предпочтения
    prefs_data = await get_matching_preferences(db, user_id)
    prefs = prefs_data["preferences"]
    
    # Проверяем возрастной диапазон
    age_min = prefs.get("age_min", 18)
    age_max = prefs.get("age_max", 100)
    
    if age_max - age_min > 30:
        suggestions.append({
            "key": "age",
            "message": "Сузь возрастной диапазон для более точных результатов",
            "priority": "medium"
        })
    
    # Проверяем расстояние
    distance = prefs.get("distance_km_max", 500)
    if distance > 100:
        suggestions.append({
            "key": "distance_km",
            "message": "Уменьши радиус поиска для встреч вживую",
            "priority": "low"
        })
    
    # Рекомендуем установить dealbreakers
    dealbreakers = prefs_data["dealbreakers"]
    if not dealbreakers:
        suggestions.append({
            "key": "dealbreakers",
            "message": "Установи важные критерии как обязательные (dealbreakers)",
            "priority": "high"
        })
    
    return suggestions


def _get_default_preferences() -> Dict[str, Any]:
    """Дефолтные значения предпочтений."""
    return {
        "age": {"min": 18, "max": 50},
        "distance_km": {"min": 0, "max": 50},
        "gender": "any",
        "show_verified_only": False,
        "show_with_photo_only": True
    }


def _group_range_preferences(prefs: Dict[str, Any]) -> Dict[str, Any]:
    """Группировать _min/_max в range объекты."""
    grouped = {}
    processed = set()
    
    for key, value in prefs.items():
        if key in processed:
            continue
        
        if key.endswith("_min"):
            base_key = key[:-4]
            max_key = f"{base_key}_max"
            grouped[base_key] = {
                "min": value,
                "max": prefs.get(max_key, value)
            }
            processed.add(key)
            processed.add(max_key)
        elif key.endswith("_max"):
            base_key = key[:-4]
            min_key = f"{base_key}_min"
            if min_key not in prefs:
                grouped[base_key] = {
                    "min": 0,
                    "max": value
                }
            processed.add(key)
        else:
            grouped[key] = value
            processed.add(key)
    
    return grouped


def _validate_preference(key: str, value: Any) -> bool:
    """Валидация значения предпочтения."""
    # Базовая валидация
    if value is None:
        return False
    
    # Range валидация
    if isinstance(value, dict) and "min" in value:
        if value.get("min", 0) > value.get("max", 0):
            return False
    
    return True


def _get_preference_category(key: str) -> str:
    """Определить категорию предпочтения."""
    for category, keys in PREFERENCE_SCHEMA.items():
        if key in keys:
            return category
    return "basic"
