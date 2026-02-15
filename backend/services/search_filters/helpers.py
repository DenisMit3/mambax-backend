"""
Search Filters - Helpers
========================
Утилитарные функции: haversine, interests_match, profile_to_dict, get_all_filter_options.
"""

from typing import List, Dict, Any
from math import radians, cos, sin, asin, sqrt

from backend import models
from backend.services.search_filters.schemas import (
    GENDER_OPTIONS, SMOKING_OPTIONS, DRINKING_OPTIONS,
    EDUCATION_OPTIONS, LOOKING_FOR_OPTIONS, CHILDREN_OPTIONS,
    INTEREST_SUGGESTIONS,
)


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


def get_all_filter_options() -> Dict[str, Any]:
    """Получить все опции фильтров для UI"""
    return {
        "gender": [opt.model_dump() for opt in GENDER_OPTIONS],
        "smoking": [opt.model_dump() for opt in SMOKING_OPTIONS],
        "drinking": [opt.model_dump() for opt in DRINKING_OPTIONS],
        "education": [opt.model_dump() for opt in EDUCATION_OPTIONS],
        "looking_for": [opt.model_dump() for opt in LOOKING_FOR_OPTIONS],
        "children": [opt.model_dump() for opt in CHILDREN_OPTIONS],
        "interests": INTEREST_SUGGESTIONS,
        "age": {"min": 18, "max": 100},
        "height": {"min": 100, "max": 250},
        "distance": {"min": 1, "max": 500, "default": 50}
    }
