"""
User Blocking & IP Ban
======================
Блокировка пользователей (Redis sets) и бан IP-адресов (honeypot).
"""

import logging
from typing import Dict, Any, List

from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)


async def block_user(blocker_id: str, blocked_id: str) -> Dict[str, Any]:
    """Заблокировать пользователя в Redis"""
    key = f"blocked:{blocker_id}"
    await redis_manager.client.sadd(key, blocked_id)
    logger.info(f"User {blocker_id} blocked {blocked_id}")
    
    return {
        "status": "blocked",
        "blocked_user_id": blocked_id,
        "message": "Пользователь заблокирован"
    }


async def unblock_user(blocker_id: str, blocked_id: str) -> Dict[str, Any]:
    """Разблокировать пользователя в Redis"""
    key = f"blocked:{blocker_id}"
    await redis_manager.client.srem(key, blocked_id)
    return {"status": "unblocked", "unblocked_user_id": blocked_id}


async def is_blocked(blocker_id: str, user_id: str) -> bool:
    """Проверить, заблокирован ли пользователь"""
    key = f"blocked:{blocker_id}"
    return await redis_manager.client.sismember(key, user_id)


async def is_blocked_by(user_id: str, other_id: str) -> bool:
    """Проверить, заблокирован ли я этим пользователем"""
    key = f"blocked:{other_id}"
    return await redis_manager.client.sismember(key, user_id)


async def get_blocked_users(user_id: str) -> List[str]:
    """Получить список заблокированных пользователей"""
    key = f"blocked:{user_id}"
    members = await redis_manager.client.smembers(key)
    return list(members)


# ============================================================================
# IP BLOCKING (HONEYPOT)
# ============================================================================

async def ban_ip(ip: str, reason: str = "honeypot", duration_seconds: int = 604800):
    """
    Permanently block an IP address (default 7 days).
    Used for Honeypot traps.
    """
    key = f"banned_ip:{ip}"
    await redis_manager.client.set(key, reason, ex=duration_seconds)
    logger.critical(f"🛑 IP BANNED: {ip} Reason: {reason}")


async def is_ip_banned(ip: str) -> bool:
    """Check if IP is in the ban list"""
    return await redis_manager.client.exists(f"banned_ip:{ip}")
