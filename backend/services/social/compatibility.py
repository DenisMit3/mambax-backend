# Compatibility Service - расчёт совместимости между пользователями

import uuid
import logging
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.user import User
from backend.models.profile_enrichment import UserPreference
from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)

# Ключ для кэша совместимости
COMPATIBILITY_CACHE_KEY = "compatibility:{user1}:{user2}"
COMPATIBILITY_CACHE_TTL = 86400  # 24 часа


async def calculate_compatibility(
    db: AsyncSession,
    user1_id: uuid.UUID,
    user2_id: uuid.UUID,
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Рассчитать совместимость между двумя пользователями.
    
    Факторы:
    1. Интересы (общие теги)
    2. Возраст (близость)
    3. Локация (расстояние)
    4. Предпочтения (dealbreakers)
    5. Активность (похожие паттерны)
    
    Returns:
        {
            "score": int (0-100),
            "breakdown": {
                "interests": int,
                "lifestyle": int,
                "values": int,
                "location": int,
                "age": int
            },
            "common_interests": list,
            "compatibility_level": str,
            "tips": list
        }
    """
    # Нормализуем порядок ID для кэша
    id1, id2 = sorted([str(user1_id), str(user2_id)])
    cache_key = COMPATIBILITY_CACHE_KEY.format(user1=id1, user2=id2)
    
    # Проверяем кэш
    if use_cache:
        cached = await redis_manager.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except:
                pass
    
    # Получаем данные пользователей
    user1 = await db.get(User, user1_id)
    user2 = await db.get(User, user2_id)
    
    if not user1 or not user2:
        return {"error": "Пользователь не найден", "score": 0}
    
    # Расчёт по категориям
    interests_score = _calculate_interests_score(user1, user2)
    lifestyle_score = _calculate_lifestyle_score(user1, user2)
    values_score = _calculate_values_score(user1, user2)
    location_score = _calculate_location_score(user1, user2)
    age_score = _calculate_age_score(user1, user2)
    
    # Общие интересы
    common_interests = _find_common_interests(user1, user2)
    
    # Проверяем dealbreakers
    dealbreaker_penalty = await _check_dealbreakers(db, user1_id, user2_id, user1, user2)
    
    # Взвешенный итоговый балл
    weights = {
        "interests": 0.30,
        "lifestyle": 0.20,
        "values": 0.25,
        "location": 0.15,
        "age": 0.10
    }
    
    total_score = (
        interests_score * weights["interests"] +
        lifestyle_score * weights["lifestyle"] +
        values_score * weights["values"] +
        location_score * weights["location"] +
        age_score * weights["age"]
    )
    
    # Применяем штраф за dealbreakers
    total_score = max(0, total_score - dealbreaker_penalty)
    total_score = min(100, int(total_score))
    
    # Определяем уровень совместимости
    if total_score >= 80:
        level = "excellent"
        level_text = "Отличная совместимость!"
    elif total_score >= 60:
        level = "good"
        level_text = "Хорошая совместимость"
    elif total_score >= 40:
        level = "moderate"
        level_text = "Средняя совместимость"
    else:
        level = "low"
        level_text = "Низкая совместимость"
    
    # Генерируем советы
    tips = _generate_tips(
        interests_score, lifestyle_score, values_score,
        common_interests, user1, user2
    )
    
    result = {
        "score": total_score,
        "breakdown": {
            "interests": int(interests_score),
            "lifestyle": int(lifestyle_score),
            "values": int(values_score),
            "location": int(location_score),
            "age": int(age_score)
        },
        "common_interests": common_interests[:5],  # Топ 5
        "compatibility_level": level,
        "compatibility_text": level_text,
        "tips": tips[:3],  # Топ 3 совета
        "calculated_at": datetime.utcnow().isoformat()
    }
    
    # Сохраняем в кэш
    if use_cache:
        await redis_manager.setex(cache_key, COMPATIBILITY_CACHE_TTL, json.dumps(result))
    
    return result


def _calculate_interests_score(user1: User, user2: User) -> float:
    """Расчёт совместимости по интересам."""
    interests1 = set(user1.interests or [])
    interests2 = set(user2.interests or [])
    
    if not interests1 or not interests2:
        return 50  # Нейтральный балл если нет данных
    
    # Коэффициент Жаккара
    intersection = len(interests1 & interests2)
    union = len(interests1 | interests2)
    
    if union == 0:
        return 50
    
    jaccard = intersection / union
    
    # Масштабируем до 0-100
    return min(100, jaccard * 100 + 20)  # +20 базовый бонус


def _calculate_lifestyle_score(user1: User, user2: User) -> float:
    """Расчёт совместимости по образу жизни."""
    score = 50  # Базовый балл
    
    # Сравниваем поля lifestyle если есть
    lifestyle1 = getattr(user1, 'lifestyle', {}) or {}
    lifestyle2 = getattr(user2, 'lifestyle', {}) or {}
    
    if isinstance(lifestyle1, dict) and isinstance(lifestyle2, dict):
        # Курение
        if lifestyle1.get('smoking') == lifestyle2.get('smoking'):
            score += 15
        elif lifestyle1.get('smoking') == 'never' and lifestyle2.get('smoking') == 'regularly':
            score -= 20
        
        # Алкоголь
        if lifestyle1.get('drinking') == lifestyle2.get('drinking'):
            score += 10
        
        # Дети
        if lifestyle1.get('children') == lifestyle2.get('children'):
            score += 15
    
    return min(100, max(0, score))


def _calculate_values_score(user1: User, user2: User) -> float:
    """Расчёт совместимости по ценностям."""
    score = 50
    
    # Цель знакомства
    goal1 = getattr(user1, 'looking_for', None)
    goal2 = getattr(user2, 'looking_for', None)
    
    if goal1 and goal2:
        if goal1 == goal2:
            score += 30
        elif (goal1 in ['relationship', 'marriage'] and goal2 in ['relationship', 'marriage']):
            score += 20
        elif (goal1 == 'casual' and goal2 == 'relationship') or (goal1 == 'relationship' and goal2 == 'casual'):
            score -= 20
    
    # Образование
    edu1 = getattr(user1, 'education', None)
    edu2 = getattr(user2, 'education', None)
    
    if edu1 and edu2 and edu1 == edu2:
        score += 10
    
    return min(100, max(0, score))


def _calculate_location_score(user1: User, user2: User) -> float:
    """Расчёт совместимости по локации."""
    city1 = getattr(user1, 'city', None)
    city2 = getattr(user2, 'city', None)
    
    if not city1 or not city2:
        return 50
    
    if city1.lower() == city2.lower():
        return 100
    
    # TODO: Использовать координаты для расчёта расстояния
    # Пока просто проверяем совпадение города
    
    return 30  # Разные города


def _calculate_age_score(user1: User, user2: User) -> float:
    """Расчёт совместимости по возрасту."""
    age1 = _get_age(user1.birthdate)
    age2 = _get_age(user2.birthdate)
    
    if age1 is None or age2 is None:
        return 50
    
    diff = abs(age1 - age2)
    
    if diff <= 2:
        return 100
    elif diff <= 5:
        return 80
    elif diff <= 10:
        return 60
    elif diff <= 15:
        return 40
    else:
        return 20


def _find_common_interests(user1: User, user2: User) -> List[str]:
    """Найти общие интересы."""
    interests1 = set(user1.interests or [])
    interests2 = set(user2.interests or [])
    
    return list(interests1 & interests2)


async def _check_dealbreakers(
    db: AsyncSession,
    user1_id: uuid.UUID,
    user2_id: uuid.UUID,
    user1: User,
    user2: User
) -> float:
    """
    Проверить dealbreakers и вернуть штраф.
    """
    penalty = 0
    
    # Получаем предпочтения обоих пользователей
    prefs1_stmt = select(UserPreference).where(
        UserPreference.user_id == user1_id,
        UserPreference.is_dealbreaker == True
    )
    result = await db.execute(prefs1_stmt)
    prefs1 = result.scalars().all()
    
    prefs2_stmt = select(UserPreference).where(
        UserPreference.user_id == user2_id,
        UserPreference.is_dealbreaker == True
    )
    result = await db.execute(prefs2_stmt)
    prefs2 = result.scalars().all()
    
    # Проверяем dealbreakers user1 против user2
    for pref in prefs1:
        if not _check_preference_match(pref, user2):
            penalty += 30  # Серьёзный штраф за dealbreaker
    
    # Проверяем dealbreakers user2 против user1
    for pref in prefs2:
        if not _check_preference_match(pref, user1):
            penalty += 30
    
    return penalty


def _check_preference_match(pref: UserPreference, user: User) -> bool:
    """Проверить, соответствует ли пользователь предпочтению."""
    key = pref.key
    value = pref.value
    
    if key == "age":
        age = _get_age(user.birthdate)
        if age is None:
            return True
        min_age = value.get("min", 18)
        max_age = value.get("max", 100)
        return min_age <= age <= max_age
    
    if key == "smoking":
        user_smoking = getattr(user, 'smoking', None)
        if user_smoking is None:
            return True
        return user_smoking in value if isinstance(value, list) else user_smoking == value
    
    # Добавить другие проверки по необходимости
    
    return True


def _generate_tips(
    interests_score: float,
    lifestyle_score: float,
    values_score: float,
    common_interests: List[str],
    user1: User,
    user2: User
) -> List[str]:
    """Генерировать советы для общения."""
    tips = []
    
    if common_interests:
        interest = common_interests[0]
        tips.append(f"У вас общий интерес: {interest}. Начните разговор с этого!")
    
    if interests_score >= 70:
        tips.append("У вас много общих интересов - отличная база для общения!")
    
    if values_score >= 70:
        tips.append("Ваши цели совпадают - это важно для долгосрочных отношений.")
    
    if lifestyle_score < 50:
        tips.append("Обсудите образ жизни - это поможет понять друг друга лучше.")
    
    if not tips:
        tips.append("Задайте открытый вопрос, чтобы узнать человека лучше.")
    
    return tips


def _get_age(birthdate: Optional[datetime]) -> Optional[int]:
    """Вычислить возраст."""
    if not birthdate:
        return None
    today = datetime.utcnow()
    age = today.year - birthdate.year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1
    return age


async def invalidate_compatibility_cache(user_id: uuid.UUID):
    """
    Инвалидировать кэш совместимости для пользователя.
    Вызывать при обновлении профиля.
    """
    # Удаляем все ключи с этим user_id
    pattern = f"compatibility:*{user_id}*"
    keys = await redis_manager.keys(pattern)
    
    if keys:
        await redis_manager.delete(*keys)
        logger.debug(f"Invalidated {len(keys)} compatibility cache entries for user {user_id}")
