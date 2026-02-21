"""
Profile Visibility & Boost
===========================
Настройки видимости профиля и буст (приоритет в ленте).
Данные хранятся в Redis для масштабируемости.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Redis key prefixes
VISIBILITY_KEY = "visibility:"  # visibility:{user_id} -> hash
BOOST_KEY = "boost:"  # boost:{user_id} -> hash

# Default visibility settings
DEFAULT_VISIBILITY = {
    "show_online_status": "1",
    "show_last_seen": "1",
    "show_distance": "1",
    "show_age": "1",
    "read_receipts": "1"
}


async def _get_redis():
    """Get Redis client."""
    from backend.core.redis import redis_manager
    return await redis_manager.get_redis()


def get_visibility_settings(user_id: str) -> Dict[str, Any]:
    """Получить настройки видимости (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return {k: v == "1" for k, v in DEFAULT_VISIBILITY.items()}
        else:
            return loop.run_until_complete(_get_visibility_settings_async(user_id))
    except RuntimeError:
        return asyncio.run(_get_visibility_settings_async(user_id))


async def _get_visibility_settings_async(user_id: str) -> Dict[str, Any]:
    """Получить настройки видимости из Redis."""
    redis = await _get_redis()
    if not redis:
        return {k: v == "1" for k, v in DEFAULT_VISIBILITY.items()}
    
    key = f"{VISIBILITY_KEY}{user_id}"
    settings = await redis.hgetall(key)
    
    if not settings:
        return {k: v == "1" for k, v in DEFAULT_VISIBILITY.items()}
    
    return {k: settings.get(k, DEFAULT_VISIBILITY.get(k, "1")) == "1" 
            for k in DEFAULT_VISIBILITY.keys()}


def update_visibility_settings(user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    """Обновить настройки видимости (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_update_visibility_settings_async(user_id, settings))
            return {**{k: v == "1" for k, v in DEFAULT_VISIBILITY.items()}, **settings}
        else:
            return loop.run_until_complete(_update_visibility_settings_async(user_id, settings))
    except RuntimeError:
        return asyncio.run(_update_visibility_settings_async(user_id, settings))


async def _update_visibility_settings_async(user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    """Обновить настройки видимости в Redis."""
    redis = await _get_redis()
    if not redis:
        return {k: v == "1" for k, v in DEFAULT_VISIBILITY.items()}
    
    key = f"{VISIBILITY_KEY}{user_id}"
    
    # Convert bool to "1"/"0"
    redis_settings = {k: "1" if v else "0" for k, v in settings.items()}
    
    if redis_settings:
        await redis.hset(key, mapping=redis_settings)
        await redis.expire(key, 60 * 60 * 24 * 365)  # 1 year TTL
    
    return await _get_visibility_settings_async(user_id)


# ============================================================================
# BOOST PROFILE
# ============================================================================

def activate_boost(user_id: str, duration_minutes: int = 30) -> Dict[str, Any]:
    """Активировать буст профиля (sync wrapper)."""
    import asyncio
    expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_activate_boost_async(user_id, duration_minutes))
            return {
                "status": "activated",
                "expires_at": expires_at.isoformat(),
                "duration_minutes": duration_minutes,
                "message": f"Ваш профиль будет в топе следующие {duration_minutes} минут!"
            }
        else:
            return loop.run_until_complete(_activate_boost_async(user_id, duration_minutes))
    except RuntimeError:
        return asyncio.run(_activate_boost_async(user_id, duration_minutes))


async def _activate_boost_async(user_id: str, duration_minutes: int = 30) -> Dict[str, Any]:
    """
    Активировать буст профиля в Redis.
    
    Буст:
    - Профиль показывается первым в ленте
    - Увеличивает видимость в 10 раз
    - Длится указанное время
    """
    expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
    
    redis = await _get_redis()
    if redis:
        key = f"{BOOST_KEY}{user_id}"
        await redis.hset(key, mapping={
            "activated_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat(),
            "duration_minutes": str(duration_minutes)
        })
        # Set TTL to match boost duration + 1 minute buffer
        await redis.expire(key, (duration_minutes + 1) * 60)
    
    logger.info(f"Boost activated for user {user_id}")
    
    return {
        "status": "activated",
        "expires_at": expires_at.isoformat(),
        "duration_minutes": duration_minutes,
        "message": f"Ваш профиль будет в топе следующие {duration_minutes} минут!"
    }


def is_boosted(user_id: str) -> bool:
    """Проверить, активен ли буст (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return False  # Default for sync context
        else:
            return loop.run_until_complete(_is_boosted_async(user_id))
    except RuntimeError:
        return asyncio.run(_is_boosted_async(user_id))


async def _is_boosted_async(user_id: str) -> bool:
    """Проверить, активен ли буст в Redis."""
    redis = await _get_redis()
    if not redis:
        return False
    
    key = f"{BOOST_KEY}{user_id}"
    data = await redis.hgetall(key)
    
    if not data:
        return False
    
    expires_at_str = data.get("expires_at")
    if not expires_at_str:
        return False
    
    try:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.utcnow() > expires_at:
            # Expired, clean up
            await redis.delete(key)
            return False
        return True
    except (ValueError, TypeError):
        return False


def get_boost_status(user_id: str) -> Dict[str, Any]:
    """Получить статус буста (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return {"active": False}
        else:
            return loop.run_until_complete(_get_boost_status_async(user_id))
    except RuntimeError:
        return asyncio.run(_get_boost_status_async(user_id))


async def _get_boost_status_async(user_id: str) -> Dict[str, Any]:
    """Получить статус буста из Redis."""
    redis = await _get_redis()
    if not redis:
        return {"active": False}
    
    key = f"{BOOST_KEY}{user_id}"
    data = await redis.hgetall(key)
    
    if not data:
        return {"active": False}
    
    expires_at_str = data.get("expires_at")
    if not expires_at_str:
        return {"active": False}
    
    try:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.utcnow() > expires_at:
            await redis.delete(key)
            return {"active": False}
        
        remaining = (expires_at - datetime.utcnow()).total_seconds()
        
        return {
            "active": True,
            "expires_at": expires_at_str,
            "remaining_seconds": int(remaining)
        }
    except (ValueError, TypeError):
        return {"active": False}


async def get_all_boosted_users() -> list:
    """Get all currently boosted user IDs (for feed prioritization)."""
    redis = await _get_redis()
    if not redis:
        return []
    
    # Scan for all boost keys
    boosted = []
    cursor = 0
    while True:
        cursor, keys = await redis.scan(cursor, match=f"{BOOST_KEY}*", count=100)
        for key in keys:
            user_id = key.replace(BOOST_KEY, "")
            if await _is_boosted_async(user_id):
                boosted.append(user_id)
        if cursor == 0:
            break
    
    return boosted
