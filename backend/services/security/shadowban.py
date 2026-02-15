"""
Shadowban
=========
Redis-backed shadowban — скрытая блокировка нарушителей.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from enum import Enum

from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)


class ShadowbanStatus(str, Enum):
    ACTIVE = "active"
    SHADOWBANNED = "shadowbanned"
    SUSPENDED = "suspended"


async def shadowban_user(
    user_id: str, 
    reason: str, 
    duration_hours: int = 24
) -> Dict[str, Any]:
    """Shadowban пользователя в Redis."""
    key = f"shadowban:{user_id}"
    await redis_manager.client.set(key, reason, ex=duration_hours * 3600)
    logger.warning(f"User {user_id} shadowbanned for {duration_hours}h: {reason}")
    
    return {
        "status": "shadowbanned",
        "user_id": user_id,
        "expires_at": (datetime.utcnow() + timedelta(hours=duration_hours)).isoformat()
    }


async def unshadowban_user(user_id: str) -> Dict[str, Any]:
    """Снять shadowban"""
    await redis_manager.client.delete(f"shadowban:{user_id}")
    return {"status": "active", "user_id": user_id}


async def is_shadowbanned(user_id: str) -> bool:
    """Проверить, находится ли пользователь в shadowban"""
    return await redis_manager.client.exists(f"shadowban:{user_id}")


async def get_shadowbanned_ids_batch(user_ids: list[str]) -> set[str]:
    """
    PERF-006: Batch проверка shadowban — O(1) вместо O(N).
    Проверяет список пользователей за один запрос к Redis.
    """
    if not user_ids:
        return set()
    
    try:
        client = redis_manager.client
        if not client:
            return set()
        
        pipe = client.pipeline()
        for uid in user_ids:
            pipe.exists(f"shadowban:{uid}")
        
        results = await pipe.execute()
        return {uid for uid, is_banned in zip(user_ids, results) if is_banned}
    except Exception as e:
        logger.warning(f"Batch shadowban check failed: {e}")
        return set()


async def get_shadowban_info(user_id: str) -> Optional[str]:
    """Получить информацию о shadowban"""
    reason = await redis_manager.client.get(f"shadowban:{user_id}")
    return reason if reason else None
