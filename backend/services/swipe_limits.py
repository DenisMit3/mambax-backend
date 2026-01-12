"""
Swipe Limits Service
=====================
Управление лимитами свайпов как в Mamba.

Лимиты:
- Бесплатные пользователи: 30 лайков в день
- VIP пользователи: безлимитно
- Super Like: 1 в день (бесплатно), безлимит для VIP

Сброс счётчика: каждый день в 00:00 UTC
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend import models

# Лимиты свайпов
DAILY_SWIPE_LIMIT = 30  # Лимит для бесплатных пользователей
DAILY_SUPERLIKE_LIMIT = 1  # Лимит обычных супер-лайков в день

# Stars pricing for extra swipes/boosts
STARS_PER_SWIPE_PACK = 10  # Стоимость пакета свайпов в Stars
SWIPES_PER_PACK = 10  # Количество свайпов в пакете
STARS_PER_SUPERLIKE = 5  # Стоимость супер-лайка в Stars
STARS_PER_BOOST = 25  # Стоимость буста профиля в Stars

# In-memory cache для быстрого доступа (в продакшене использовать Redis)
_swipe_cache: Dict[str, Dict[str, Any]] = {}


def _get_today_key() -> str:
    """Получить ключ сегодняшнего дня"""
    return date.today().isoformat()


def _get_user_cache(user_id: str) -> Dict[str, Any]:
    """Получить кэш пользователя для сегодняшнего дня"""
    today = _get_today_key()
    
    if user_id not in _swipe_cache:
        _swipe_cache[user_id] = {}
    
    # Сбросить если другой день
    if _swipe_cache[user_id].get("date") != today:
        _swipe_cache[user_id] = {
            "date": today,
            "swipes": 0,
            "superlikes": 0
        }
    
    return _swipe_cache[user_id]


async def get_swipe_status(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """
    Получить статус свайпов пользователя.
    
    Returns:
        {
            "remaining": int,      # Осталось свайпов
            "total": int,          # Всего доступно за день
            "used": int,           # Использовано сегодня
            "is_vip": bool,        # VIP статус
            "superlikes_remaining": int,
            "reset_at": str        # Время сброса (UTC)
        }
    """
    # Получить пользователя для проверки VIP
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"error": "User not found"}
    
    cache = _get_user_cache(user_id)
    is_vip = user.is_vip
    
    if is_vip:
        return {
            "remaining": -1,  # -1 = unlimited
            "total": -1,
            "used": cache.get("swipes", 0),
            "is_vip": True,
            "superlikes_remaining": -1,
            "reset_at": "unlimited"
        }
    
    used = cache.get("swipes", 0)
    daily_remaining = max(0, DAILY_SWIPE_LIMIT - used)
    
    # Бонусные свайпы, купленные за Stars
    bonus_swipes = cache.get("bonus_swipes", 0)
    total_remaining = daily_remaining + bonus_swipes
    
    superlikes_used = cache.get("superlikes", 0)
    daily_superlikes_remaining = max(0, DAILY_SUPERLIKE_LIMIT - superlikes_used)
    
    # Бонусные супер-лайки, купленные за Stars
    bonus_superlikes = cache.get("bonus_superlikes", 0)
    total_superlikes_remaining = daily_superlikes_remaining + bonus_superlikes
    
    # Время следующего сброса (00:00 UTC следующего дня)
    tomorrow = date.today().isoformat() + "T00:00:00Z"
    
    # Баланс Stars пользователя для отображения
    stars_balance = getattr(user, 'stars_balance', 0) or 0
    
    return {
        "remaining": total_remaining,
        "daily_remaining": daily_remaining,
        "bonus_swipes": bonus_swipes,
        "total": DAILY_SWIPE_LIMIT,
        "used": used,
        "is_vip": False,
        "superlikes_remaining": total_superlikes_remaining,
        "daily_superlikes_remaining": daily_superlikes_remaining,
        "bonus_superlikes": bonus_superlikes,
        "reset_at": tomorrow,
        "stars_balance": stars_balance,
        "can_buy_swipes": stars_balance >= STARS_PER_SWIPE_PACK,
        "can_buy_superlike": stars_balance >= STARS_PER_SUPERLIKE,
        "swipe_pack_price": STARS_PER_SWIPE_PACK,
        "swipe_pack_count": SWIPES_PER_PACK,
        "superlike_price": STARS_PER_SUPERLIKE
    }


async def can_swipe(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """
    Проверить, может ли пользователь свайпнуть.
    
    Returns:
        {"allowed": bool, "reason": str, "remaining": int}
    """
    status = await get_swipe_status(db, user_id)
    
    if "error" in status:
        return {"allowed": False, "reason": status["error"], "remaining": 0}
    
    if status["is_vip"]:
        return {"allowed": True, "reason": "VIP unlimited", "remaining": -1}
    
    if status["remaining"] <= 0:
        return {
            "allowed": False, 
            "reason": "daily_limit_reached",
            "remaining": 0,
            "reset_at": status["reset_at"],
            "upgrade_to_vip": True,
            "can_buy_swipes": status.get("can_buy_swipes", False),
            "swipe_pack_price": STARS_PER_SWIPE_PACK,
            "swipe_pack_count": SWIPES_PER_PACK,
            "stars_balance": status.get("stars_balance", 0)
        }
    
    # Определить источник свайпа (daily или bonus)
    using_bonus = status.get("daily_remaining", 0) <= 0 and status.get("bonus_swipes", 0) > 0
    
    return {
        "allowed": True, 
        "reason": "bonus_swipe" if using_bonus else "ok",
        "remaining": status["remaining"],
        "using_bonus": using_bonus
    }


async def can_superlike(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """
    Проверить, может ли пользователь поставить супер-лайк.
    """
    status = await get_swipe_status(db, user_id)
    
    if "error" in status:
        return {"allowed": False, "reason": status["error"]}
    
    if status["is_vip"]:
        return {"allowed": True, "reason": "VIP unlimited", "remaining": -1}
    
    if status["superlikes_remaining"] <= 0:
        return {
            "allowed": False,
            "reason": "superlike_limit_reached",
            "remaining": 0,
            "reset_at": status["reset_at"],
            "upgrade_to_vip": True
        }
    
    return {
        "allowed": True,
        "reason": "ok", 
        "remaining": status["superlikes_remaining"]
    }


async def record_swipe(db: AsyncSession, user_id: str, is_super: bool = False) -> Dict[str, Any]:
    """
    Записать свайп пользователя.
    Вызывать ПОСЛЕ успешного создания лайка.
    
    Returns:
        {"success": bool, "remaining": int}
    """
    cache = _get_user_cache(user_id)
    
    cache["swipes"] = cache.get("swipes", 0) + 1
    
    if is_super:
        cache["superlikes"] = cache.get("superlikes", 0) + 1
    
    # Получить обновлённый статус
    status = await get_swipe_status(db, user_id)
    
    return {
        "success": True,
        "remaining": status["remaining"],
        "superlikes_remaining": status["superlikes_remaining"]
    }


async def get_swipe_history_count(db: AsyncSession, user_id: str) -> int:
    """
    Получить количество свайпов за сегодня из БД (для верификации).
    Используется как fallback при потере кэша.
    """
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    result = await db.execute(
        select(models.Like).where(
            models.Like.liker_id == user_id,
            models.Like.created_at >= str(today_start)
        )
    )
    
    return len(result.scalars().all())


async def buy_swipes_with_stars(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """
    Купить пакет свайпов за Telegram Stars.
    
    Стоимость: STARS_PER_SWIPE_PACK Stars = SWIPES_PER_PACK свайпов
    """
    from backend.models.user import User
    
    # Получить пользователя
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"success": False, "error": "User not found"}
    
    # Проверить баланс
    balance = user.stars_balance or Decimal("0")
    if balance < STARS_PER_SWIPE_PACK:
        return {
            "success": False,
            "error": "insufficient_balance",
            "required": STARS_PER_SWIPE_PACK,
            "available": balance
        }
    
    # Списать Stars
    user.stars_balance = balance - Decimal(STARS_PER_SWIPE_PACK)
    
    # Добавить бонусные свайпы в кэш
    cache = _get_user_cache(user_id)
    bonus_swipes = cache.get("bonus_swipes", 0)
    cache["bonus_swipes"] = bonus_swipes + SWIPES_PER_PACK
    
    await db.commit()
    
    return {
        "success": True,
        "purchased": SWIPES_PER_PACK,
        "cost": STARS_PER_SWIPE_PACK,
        "new_balance": user.stars_balance,
        "total_bonus_swipes": cache["bonus_swipes"]
    }


async def buy_superlike_with_stars(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """
    Купить супер-лайк за Telegram Stars.
    
    Стоимость: STARS_PER_SUPERLIKE Stars = 1 супер-лайк
    """
    # Получить пользователя
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"success": False, "error": "User not found"}
    
    # Проверить баланс
    balance = user.stars_balance or Decimal("0")
    if balance < STARS_PER_SUPERLIKE:
        return {
            "success": False,
            "error": "insufficient_balance",
            "required": STARS_PER_SUPERLIKE,
            "available": balance
        }
    
    # Списать Stars
    user.stars_balance = balance - Decimal(STARS_PER_SUPERLIKE)
    
    # Добавить бонусный супер-лайк
    cache = _get_user_cache(user_id)
    bonus_superlikes = cache.get("bonus_superlikes", 0)
    cache["bonus_superlikes"] = bonus_superlikes + 1
    
    await db.commit()
    
    return {
        "success": True,
        "purchased": 1,
        "cost": STARS_PER_SUPERLIKE,
        "new_balance": user.stars_balance,
        "total_bonus_superlikes": cache["bonus_superlikes"]
    }


async def activate_boost_with_stars(db: AsyncSession, user_id: str, duration_hours: int = 1) -> Dict[str, Any]:
    """
    Активировать буст профиля за Telegram Stars.
    
    Стоимость: STARS_PER_BOOST Stars = 1 час буста профиля
    Буст увеличивает видимость профиля и ставит его выше в ленте.
    """
    from datetime import datetime, timedelta
    
    # Получить пользователя
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"success": False, "error": "User not found"}
    
    total_cost = Decimal(STARS_PER_BOOST * duration_hours)
    
    # Проверить баланс
    balance = user.stars_balance or Decimal("0")
    if balance < total_cost:
        return {
            "success": False,
            "error": "insufficient_balance",
            "required": int(total_cost),
            "available": balance
        }
    
    # Списать Stars
    user.stars_balance = balance - total_cost
    
    # Установить время окончания буста
    now = datetime.utcnow()
    boost_until = now + timedelta(hours=duration_hours)
    
    # Сохранить в кэш (или в БД если есть поле)
    cache = _get_user_cache(user_id)
    cache["boost_until"] = boost_until.isoformat()
    
    await db.commit()
    
    return {
        "success": True,
        "boost_until": boost_until.isoformat(),
        "duration_hours": duration_hours,
        "cost": total_cost,
        "new_balance": user.stars_balance
    }


def is_user_boosted(user_id: str) -> bool:
    """Проверить, активен ли буст у пользователя."""
    from datetime import datetime
    
    cache = _get_user_cache(user_id)
    boost_until_str = cache.get("boost_until")
    
    if not boost_until_str:
        return False
    
    try:
        boost_until = datetime.fromisoformat(boost_until_str)
        return datetime.utcnow() < boost_until
    except:
        return False


# Для сброса кэша (можно вызывать по cron или при старте)
def clear_swipe_cache():
    """Очистить весь кэш свайпов"""
    global _swipe_cache
    _swipe_cache = {}

