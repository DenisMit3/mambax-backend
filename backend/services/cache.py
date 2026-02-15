import json
import logging
from typing import Optional, Any, Dict
import redis.asyncio as redis
from backend.config.settings import settings
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

# Serialize UUID and Datetime
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

class CacheService:
    """
    High-Performance Redis Cache Layer.
    Gracefully degrades if Redis unavailable.
    """
    USER_PREFIX = "mambax:user:profile:"
    DEFAULT_TTL = 600 # 10 minutes

    def __init__(self):
        redis_url = settings.REDIS_URL
        if not redis_url:
            logger.warning("REDIS_URL не задан — кэш отключён")
            self.redis = None
            return
        self.redis = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True
        )

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached user profile."""
        if not self.redis:
            return None
        try:
            data = await self.redis.get(f"{self.USER_PREFIX}{user_id}")
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Cache Get Error: {e}")
            return None

    async def set_user_profile(self, user_id: str, profile_data: Dict[str, Any], ttl: int = None):
        """Set user profile in cache."""
        if not self.redis:
            return
        try:
            ttl = ttl or self.DEFAULT_TTL
            serialized = json.dumps(profile_data, cls=JSONEncoder)
            await self.redis.setex(f"{self.USER_PREFIX}{user_id}", ttl, serialized)
        except Exception as e:
            logger.error(f"Cache Set Error: {e}")

    async def invalidate_user_profile(self, user_id: str):
        """Remove user profile from cache."""
        if not self.redis:
            return
        try:
            await self.redis.delete(f"{self.USER_PREFIX}{user_id}")
        except Exception as e:
            logger.error(f"Cache Invalidate Error: {e}")

    async def get_json(self, key: str) -> Optional[Any]:
        """Get arbitrary JSON data."""
        if not self.redis:
            return None
        try:
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Cache Get JSON Error: {e}")
            return None

    async def set_json(self, key: str, value: Any, ttl: int = None):
        """Set arbitrary JSON data."""
        if not self.redis:
            return
        try:
            ttl = ttl or self.DEFAULT_TTL
            serialized = json.dumps(value, cls=JSONEncoder)
            await self.redis.setex(key, ttl, serialized)
        except Exception as e:
            logger.error(f"Cache Set JSON Error: {e}")

    async def delete(self, key: str):
        """Delete key."""
        if not self.redis:
            return
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.error(f"Cache Delete Error: {e}")

cache_service = CacheService()
