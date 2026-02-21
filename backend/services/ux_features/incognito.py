"""
Incognito Mode (VIP)
====================
Режим инкогнито - скрытие профиля из поиска, анонимные лайки.
Данные хранятся в Redis для масштабируемости.
"""

import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Redis key prefix
INCOGNITO_KEY = "incognito:"  # incognito:{user_id} -> hash


async def _get_redis():
    """Get Redis client."""
    from backend.core.redis import redis_manager
    return await redis_manager.get_redis()


def enable_incognito(user_id: str) -> Dict[str, Any]:
    """Включить режим Инкогнито (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_enable_incognito_async(user_id))
            return {
                "status": "enabled",
                "message": "Режим Инкогнито включён. Ваш профиль скрыт от общего поиска.",
                "features": {"hide_from_search": True, "anonymous_likes": True}
            }
        else:
            return loop.run_until_complete(_enable_incognito_async(user_id))
    except RuntimeError:
        return asyncio.run(_enable_incognito_async(user_id))


async def _enable_incognito_async(user_id: str) -> Dict[str, Any]:
    """
    Включить режим Инкогнито (VIP функция).
    
    В режиме Инкогнито:
    - Профиль не виден в общем поиске
    - Виден только тем, кого пользователь лайкнул
    - Лайки ставятся анонимно
    """
    redis = await _get_redis()
    if redis:
        key = f"{INCOGNITO_KEY}{user_id}"
        await redis.hset(key, mapping={
            "enabled_at": datetime.utcnow().isoformat(),
            "hide_from_search": "1",
            "anonymous_likes": "1"
        })
        # TTL 30 days (auto-disable if user forgets)
        await redis.expire(key, 60 * 60 * 24 * 30)
    
    logger.info(f"Incognito enabled for user {user_id}")
    
    return {
        "status": "enabled",
        "message": "Режим Инкогнито включён. Ваш профиль скрыт от общего поиска.",
        "features": {
            "hide_from_search": True,
            "anonymous_likes": True
        }
    }


def disable_incognito(user_id: str) -> Dict[str, Any]:
    """Отключить режим Инкогнито (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_disable_incognito_async(user_id))
            return {"status": "disabled", "message": "Режим Инкогнито выключен. Ваш профиль снова виден всем."}
        else:
            return loop.run_until_complete(_disable_incognito_async(user_id))
    except RuntimeError:
        return asyncio.run(_disable_incognito_async(user_id))


async def _disable_incognito_async(user_id: str) -> Dict[str, Any]:
    """Отключить режим Инкогнито"""
    redis = await _get_redis()
    if redis:
        key = f"{INCOGNITO_KEY}{user_id}"
        await redis.delete(key)
    
    return {
        "status": "disabled",
        "message": "Режим Инкогнито выключен. Ваш профиль снова виден всем."
    }


def is_incognito(user_id: str) -> bool:
    """Проверить, в режиме Инкогнито ли пользователь (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return False  # Default for sync context
        else:
            return loop.run_until_complete(_is_incognito_async(user_id))
    except RuntimeError:
        return asyncio.run(_is_incognito_async(user_id))


async def _is_incognito_async(user_id: str) -> bool:
    """Проверить, в режиме Инкогнито ли пользователь"""
    redis = await _get_redis()
    if not redis:
        return False
    
    key = f"{INCOGNITO_KEY}{user_id}"
    return await redis.exists(key) > 0


def get_incognito_settings(user_id: str) -> Dict[str, Any]:
    """Получить настройки Инкогнито (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return {"enabled": False}
        else:
            return loop.run_until_complete(_get_incognito_settings_async(user_id))
    except RuntimeError:
        return asyncio.run(_get_incognito_settings_async(user_id))


async def _get_incognito_settings_async(user_id: str) -> Dict[str, Any]:
    """Получить настройки Инкогнито"""
    redis = await _get_redis()
    if not redis:
        return {"enabled": False}
    
    key = f"{INCOGNITO_KEY}{user_id}"
    data = await redis.hgetall(key)
    
    if not data:
        return {"enabled": False}
    
    return {
        "enabled": True,
        "enabled_at": data.get("enabled_at"),
        "hide_from_search": data.get("hide_from_search") == "1",
        "anonymous_likes": data.get("anonymous_likes") == "1"
    }
