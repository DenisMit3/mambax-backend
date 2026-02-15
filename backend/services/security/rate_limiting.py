"""
Rate Limiting
=============
Redis-backed distributed rate limiter с конфигурацией по типам эндпоинтов.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)


class RateLimitResult(BaseModel):
    allowed: bool
    remaining: int
    reset_at: str
    retry_after: Optional[int] = None


class RateLimiter:
    """Redis-backed distributed Rate Limiter."""
    
    async def is_allowed(
        self, 
        key: str, 
        max_requests: int = 100, 
        window_seconds: int = 60
    ) -> RateLimitResult:
        """Check if request is allowed using Redis."""
        allowed = await redis_manager.rate_limit(key, limit=max_requests, period=window_seconds)
        
        return RateLimitResult(
            allowed=allowed,
            remaining=0,
            reset_at=(datetime.utcnow() + timedelta(seconds=window_seconds)).isoformat(),
            retry_after=window_seconds if not allowed else None
        )
    
    async def block_temporarily(self, key: str, seconds: int = 300):
        """Temporarily block by setting a dedicated block key in Redis"""
        r = await redis_manager.get_redis()
        if r:
            await r.set(f"blocked:{key}", "1", ex=seconds)
            logger.warning(f"Rate limit: blocked {key} for {seconds}s")

    async def is_blocked(self, key: str) -> bool:
        r = await redis_manager.get_redis()
        if not r:
            return False
        return await r.exists(f"blocked:{key}")


# Global rate limiter
rate_limiter = RateLimiter()

# Rate limit конфигурация для разных эндпоинтов
RATE_LIMITS = {
    "default": {"max": 100, "window": 60},
    "auth": {"max": 10, "window": 60},
    "likes": {"max": 50, "window": 60},
    "messages": {"max": 30, "window": 60},
    "upload": {"max": 10, "window": 60},
}


async def check_rate_limit(key: str, endpoint_type: str = "default") -> RateLimitResult:
    """Проверить rate limit для ключа и типа эндпоинта"""
    config = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["default"])
    if await rate_limiter.is_blocked(key):
        return RateLimitResult(allowed=False, remaining=0, reset_at="blocked", retry_after=300)
    return await rate_limiter.is_allowed(key, config["max"], config["window"])
