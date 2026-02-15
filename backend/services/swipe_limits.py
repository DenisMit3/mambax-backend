"""
Swipe Limits Service
=====================
Управление лимитами свайпов с использованием Redis для масштабируемости.
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import uuid as uuid_module

from backend import models
from backend.core.redis import redis_manager

# Лимиты свайпов
DAILY_SWIPE_LIMIT = 50
SWIPE_HISTORY_SIZE = 5
DAILY_SUPERLIKE_LIMIT = 1

# Stars pricing
STARS_PER_SWIPE_PACK = 10
SWIPES_PER_PACK = 10
STARS_PER_SUPERLIKE = 5
STARS_PER_BOOST = 25

def _get_today_key() -> str:
    return date.today().isoformat()

def _get_redis_key(user_id: str) -> str:
    return f"swipe_status:{user_id}:{_get_today_key()}"

async def get_user_swipe_data(user_id: str) -> Dict[str, Any]:
    key = _get_redis_key(user_id)
    data = await redis_manager.get_json(key)
    if not data:
        data = {
            "swipes": 0,
            "superlikes": 0,
            "bonus_swipes": 0,
            "bonus_superlikes": 0,
            "boost_until": None
        }
    return data

async def save_user_swipe_data(user_id: str, data: Dict[str, Any]):
    key = _get_redis_key(user_id)
    # Expire in 24 hours to keep Redis clean
    await redis_manager.set_json(key, data, expire=86400)

async def get_swipe_status(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    # Get user for VIP check
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"error": "User not found"}
    
    data = await get_user_swipe_data(user_id)
    is_vip = user.is_vip
    
    if is_vip:
        return {
            "remaining": -1,
            "total": -1,
            "used": data.get("swipes", 0),
            "is_vip": True,
            "superlikes_remaining": -1,
            "reset_at": "unlimited"
        }
    
    used = data.get("swipes", 0)
    daily_remaining = max(0, DAILY_SWIPE_LIMIT - used)
    bonus_swipes = data.get("bonus_swipes", 0)
    total_remaining = daily_remaining + bonus_swipes
    
    superlikes_used = data.get("superlikes", 0)
    daily_superlikes_remaining = max(0, DAILY_SUPERLIKE_LIMIT - superlikes_used)
    bonus_superlikes = data.get("bonus_superlikes", 0)
    total_superlikes_remaining = daily_superlikes_remaining + bonus_superlikes
    
    # Next reset (midnight UTC)
    next_reset = (datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1))
    
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
        "reset_at": next_reset.isoformat() + "Z",
        "stars_balance": float(stars_balance),
        "can_buy_swipes": float(stars_balance) >= STARS_PER_SWIPE_PACK,
        "can_buy_superlike": float(stars_balance) >= STARS_PER_SUPERLIKE,
        "swipe_pack_price": STARS_PER_SWIPE_PACK,
        "swipe_pack_count": SWIPES_PER_PACK,
        "superlike_price": STARS_PER_SUPERLIKE
    }

async def can_swipe(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    status = await get_swipe_status(db, user_id)
    if "error" in status: return {"allowed": False, "reason": status["error"]}
    if status["is_vip"]: return {"allowed": True, "reason": "VIP unlimited", "remaining": -1}
    
    if status["remaining"] <= 0:
        return {
            "allowed": False, 
            "reason": "daily_limit_reached",
            "remaining": 0,
            "reset_at": status["reset_at"],
            "can_buy_swipes": status.get("can_buy_swipes", False)
        }
    
    using_bonus = status.get("daily_remaining", 0) <= 0 and status.get("bonus_swipes", 0) > 0
    return {"allowed": True, "reason": "ok", "remaining": status["remaining"], "using_bonus": using_bonus}

async def can_superlike(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Check if user can perform a superlike"""
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
            "can_buy_superlike": status.get("can_buy_superlike", False)
        }
    
    return {"allowed": True, "reason": "ok", "remaining": status["superlikes_remaining"]}

async def record_swipe(db: AsyncSession, user_id: str, is_super: bool = False) -> Dict[str, Any]:
    data = await get_user_swipe_data(user_id)
    
    # Logic: use daily swipes first, then bonus
    used_today = data.get("swipes", 0)
    if used_today < DAILY_SWIPE_LIMIT:
        data["swipes"] = used_today + 1
    else:
        # Use bonus
        data["bonus_swipes"] = max(0, data.get("bonus_swipes", 0) - 1)
        
    if is_super:
        used_super = data.get("superlikes", 0)
        if used_super < DAILY_SUPERLIKE_LIMIT:
            data["superlikes"] = used_super + 1
        else:
            data["bonus_superlikes"] = max(0, data.get("bonus_superlikes", 0) - 1)
            
    await save_user_swipe_data(user_id, data)
    return await get_swipe_status(db, user_id)

async def buy_swipes_with_stars(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    # SELECT ... FOR UPDATE — блокировка строки для предотвращения race condition
    uid = uuid_module.UUID(user_id) if isinstance(user_id, str) else user_id
    result = await db.execute(
        select(models.User).where(models.User.id == uid).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user: return {"success": False, "error": "User not found"}
    
    balance = user.stars_balance or Decimal("0")
    if balance < STARS_PER_SWIPE_PACK:
        return {"success": False, "error": "insufficient_balance"}
    
    # ATOMIC TRANSACTION
    async with db.begin_nested():
        user.stars_balance = balance - Decimal(STARS_PER_SWIPE_PACK)
        data = await get_user_swipe_data(str(user.id))
        data["bonus_swipes"] = data.get("bonus_swipes", 0) + SWIPES_PER_PACK
        await save_user_swipe_data(str(user.id), data)
    
    await db.commit()
    return {"success": True, "new_balance": float(user.stars_balance)}

async def buy_superlike_with_stars(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Buy 1 superlike with stars"""
    # SELECT ... FOR UPDATE — блокировка строки для предотвращения race condition
    uid = uuid_module.UUID(user_id) if isinstance(user_id, str) else user_id
    result = await db.execute(
        select(models.User).where(models.User.id == uid).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user: 
        return {"success": False, "error": "User not found"}
    
    balance = user.stars_balance or Decimal("0")
    if balance < STARS_PER_SUPERLIKE:
        return {"success": False, "error": "insufficient_balance", "required": STARS_PER_SUPERLIKE, "available": float(balance)}
    
    # ATOMIC TRANSACTION
    async with db.begin_nested():
        user.stars_balance = balance - Decimal(STARS_PER_SUPERLIKE)
        data = await get_user_swipe_data(str(user.id))
        data["bonus_superlikes"] = data.get("bonus_superlikes", 0) + 1
        await save_user_swipe_data(str(user.id), data)
    
    await db.commit()
    return {"success": True, "purchased": 1, "cost": STARS_PER_SUPERLIKE, "new_balance": float(user.stars_balance)}

async def activate_boost_with_stars(db: AsyncSession, user_id: str, duration_hours: int = 1) -> Dict[str, Any]:
    # SELECT ... FOR UPDATE — блокировка строки для предотвращения race condition
    uid = uuid_module.UUID(user_id) if isinstance(user_id, str) else user_id
    result = await db.execute(
        select(models.User).where(models.User.id == uid).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user: return {"success": False, "error": "User not found"}
    
    cost = Decimal(STARS_PER_BOOST * duration_hours)
    if (user.stars_balance or 0) < cost:
        return {"success": False, "error": "insufficient_balance"}
        
    async with db.begin_nested():
        user.stars_balance = (user.stars_balance or 0) - cost
        now = datetime.utcnow()
        boost_until = now + timedelta(hours=duration_hours)
        data = await get_user_swipe_data(str(user.id))
        data["boost_until"] = boost_until.isoformat()
        await save_user_swipe_data(str(user.id), data)
        
    await db.commit()
    return {"success": True, "boost_until": boost_until.isoformat(), "new_balance": float(user.stars_balance)}

def is_user_boosted(user_id: str) -> bool:
    # This needs to be async now because of Redis, 
    # but I'll make a sync wrapper that uses a cached value or similar if needed.
    # Better to refactor callers to be async.
    return False # Placeholder for refactoring


async def add_to_swipe_history(user_id: str, swipe_data: dict):
    """
    Добавляет свайп в историю последних 5 действий.
    Структура: List[{to_user_id, action, timestamp}]
    """
    key = f"swipe_history:{user_id}"
    history = await redis_manager.get_json(key) or []
    
    # Добавить новый свайп в начало
    history.insert(0, {
        "to_user_id": swipe_data["to_user_id"],
        "action": swipe_data["action"],
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Оставить только последние 5
    history = history[:SWIPE_HISTORY_SIZE]
    
    # Сохранить с TTL 24 часа
    await redis_manager.set_json(key, history, expire=86400)

async def get_swipe_history(user_id: str) -> list:
    """Получить историю последних свайпов"""
    key = f"swipe_history:{user_id}"
    return await redis_manager.get_json(key) or []

async def pop_last_swipe_from_history(user_id: str) -> dict | None:
    """Удалить и вернуть последний свайп из истории"""
    key = f"swipe_history:{user_id}"
    history = await redis_manager.get_json(key) or []
    
    if not history:
        return None
    
    last_swipe = history.pop(0)
    await redis_manager.set_json(key, history, expire=86400)
    return last_swipe

async def can_use_undo(db: AsyncSession, user_id: str) -> dict:
    """
    Проверка доступности Undo для FREE пользователей.
    VIP - безлимит, FREE - 1 раз в день.
    """
    user = await db.get(models.User, uuid_module.UUID(user_id))
    if not user:
        return {"allowed": False, "reason": "User not found"}
    
    if user.is_vip:
        return {"allowed": True, "reason": "VIP unlimited"}
    
    # Проверить использование Undo сегодня
    key = f"undo_used:{user_id}:{_get_today_key()}"
    used = await redis_manager.get_value(key)
    
    if used:
        return {
            "allowed": False, 
            "reason": "Daily undo limit reached",
            "can_buy": True  # Можно купить за Stars
        }
    
    return {"allowed": True, "reason": "ok"}

async def mark_undo_used(user_id: str):
    """Отметить использование Undo сегодня"""
    key = f"undo_used:{user_id}:{_get_today_key()}"
    await redis_manager.set_value(key, "1", expire=86400)
