"""
Chat - Redis State Management (online, typing, unread)
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)


class ChatStateManager:
    """Manages chat state in Redis (online, typing, unread)"""
    
    async def set_user_online(self, user_id: str):
        await redis_manager.set_value(f"user:online:{user_id}", "true", expire=300)
        # Also update last_seen timestamp
        now = datetime.now(timezone.utc).isoformat()
        await redis_manager.set_value(f"user:last_seen:{user_id}", now, expire=604800)  # 7 days
        
    async def set_user_offline(self, user_id: str):
        await redis_manager.delete(f"user:online:{user_id}")
        # Update last_seen on disconnect
        now = datetime.now(timezone.utc).isoformat()
        await redis_manager.set_value(f"user:last_seen:{user_id}", now, expire=604800)  # 7 days
        
    async def is_user_online(self, user_id: str) -> bool:
        return await redis_manager.get_value(f"user:online:{user_id}") == "true"

    async def get_last_seen(self, user_id: str) -> Optional[str]:
        """Get ISO timestamp of when user was last online."""
        return await redis_manager.get_value(f"user:last_seen:{user_id}")

    async def is_users_online_batch(self, user_ids: list[str]) -> dict[str, bool]:
        """Batch check online status for multiple users via MGET."""
        r = await redis_manager.get_redis()
        if not r or not user_ids:
            return {uid: False for uid in user_ids}
        try:
            keys = [f"user:online:{uid}" for uid in user_ids]
            results = await r.mget(*keys)
            return {uid: (val == "true") for uid, val in zip(user_ids, results)}
        except Exception as e:
            logger.error(f"Batch online check error: {e}")
            return {uid: False for uid in user_ids}

    async def get_last_seen_batch(self, user_ids: list[str]) -> dict[str, str | None]:
        """Batch get last seen for multiple users via MGET."""
        r = await redis_manager.get_redis()
        if not r or not user_ids:
            return {uid: None for uid in user_ids}
        try:
            keys = [f"user:last_seen:{uid}" for uid in user_ids]
            results = await r.mget(*keys)
            return {uid: val for uid, val in zip(user_ids, results)}
        except Exception as e:
            logger.error(f"Batch last seen error: {e}")
            return {uid: None for uid in user_ids}

    async def set_typing(self, match_id: str, user_id: str, is_typing: bool):
        """Set/remove typing indicator using Redis Set for efficient retrieval"""
        key = f"typing:{match_id}"
        r = await redis_manager.get_redis()
        if not r:
            return
        try:
            if is_typing:
                await r.sadd(key, user_id)
                await r.expire(key, 10)  # Auto-expire in 10s
            else:
                await r.srem(key, user_id)
        except Exception as e:
            logger.warning(f"Typing status error: {e}")

    async def get_typing_users(self, match_id: str, exclude_user_id: str = None) -> List[str]:
        """Get list of users currently typing in a match"""
        key = f"typing:{match_id}"
        r = await redis_manager.get_redis()
        if not r:
            return []
        try:
            users = await r.smembers(key)
            if exclude_user_id:
                users = [u for u in users if u != exclude_user_id]
            return list(users)
        except Exception as e:
            logger.warning(f"Get typing users error: {e}")
            return []

    async def increment_unread(self, user_id: str, match_id: str):
        r = await redis_manager.get_redis()
        if r:
            await r.hincrby(f"unread:{user_id}", match_id, 1)

    async def clear_unread(self, user_id: str, match_id: str):
        r = await redis_manager.get_redis()
        if r:
            await r.hset(f"unread:{user_id}", match_id, 0)

    async def get_all_unread(self, user_id: str) -> Dict[str, int]:
        r = await redis_manager.get_redis()
        if not r:
            return {}
        data = await r.hgetall(f"unread:{user_id}")
        return {k: int(v) for k, v in data.items()}


state_manager = ChatStateManager()
