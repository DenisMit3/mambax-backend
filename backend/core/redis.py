import redis.asyncio as redis
from backend.core.config import settings
import json
import hashlib
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class SafeRedisClient:
    """
    A wrapper that provides safe access to Redis operations.
    Returns sensible defaults when Redis is not configured.
    """
    def __init__(self, manager: 'RedisManager'):
        self._manager = manager

    async def _get(self):
        return await self._manager.get_redis()

    async def get(self, key: str) -> Optional[str]:
        r = await self._get()
        if not r:
            return None
        try:
            return await r.get(key)
        except Exception as e:
            logger.warning(f"Redis get error: {e}")
            return None

    async def set(self, key: str, value: str, ex: int = None):
        r = await self._get()
        if not r:
            return
        try:
            await r.set(key, value, ex=ex)
        except Exception as e:
            logger.warning(f"Redis set error: {e}")

    async def delete(self, *keys: str):
        r = await self._get()
        if not r:
            return
        try:
            await r.delete(*keys)
        except Exception as e:
            logger.warning(f"Redis delete error: {e}")

    async def exists(self, key: str) -> bool:
        r = await self._get()
        if not r:
            return False
        try:
            return await r.exists(key)
        except Exception as e:
            logger.warning(f"Redis exists error: {e}")
            return False

    async def incr(self, key: str) -> int:
        r = await self._get()
        if not r:
            return 0
        try:
            return await r.incr(key)
        except Exception as e:
            logger.warning(f"Redis incr error: {e}")
            return 0

    async def expire(self, key: str, seconds: int):
        r = await self._get()
        if not r:
            return
        try:
            await r.expire(key, seconds)
        except Exception as e:
            logger.warning(f"Redis expire error: {e}")

    async def sadd(self, key: str, *values):
        r = await self._get()
        if not r:
            return 0
        try:
            return await r.sadd(key, *values)
        except Exception as e:
            logger.warning(f"Redis sadd error: {e}")
            return 0

    async def srem(self, key: str, *values):
        r = await self._get()
        if not r:
            return 0
        try:
            return await r.srem(key, *values)
        except Exception as e:
            logger.warning(f"Redis srem error: {e}")
            return 0

    async def sismember(self, key: str, value: str) -> bool:
        r = await self._get()
        if not r:
            return False
        try:
            return await r.sismember(key, value)
        except Exception as e:
            logger.warning(f"Redis sismember error: {e}")
            return False

    async def smembers(self, key: str) -> set:
        r = await self._get()
        if not r:
            return set()
        try:
            return await r.smembers(key)
        except Exception as e:
            logger.warning(f"Redis smembers error: {e}")
            return set()

    async def lpush(self, key: str, *values):
        r = await self._get()
        if not r:
            return 0
        try:
            return await r.lpush(key, *values)
        except Exception as e:
            logger.warning(f"Redis lpush error: {e}")
            return 0

    async def ltrim(self, key: str, start: int, stop: int):
        r = await self._get()
        if not r:
            return
        try:
            await r.ltrim(key, start, stop)
        except Exception as e:
            logger.warning(f"Redis ltrim error: {e}")

    async def lrange(self, key: str, start: int, stop: int) -> list:
        r = await self._get()
        if not r:
            return []
        try:
            return await r.lrange(key, start, stop)
        except Exception as e:
            logger.warning(f"Redis lrange error: {e}")
            return []

    async def scan(self, cursor: int = 0, match: str = None):
        r = await self._get()
        if not r:
            return (0, [])
        try:
            return await r.scan(cursor, match=match)
        except Exception as e:
            logger.warning(f"Redis scan error: {e}")
            return (0, [])


class RedisManager:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._configured = bool(settings.REDIS_URL)
        self._client: Optional[SafeRedisClient] = None
        if not self._configured:
            logger.warning("REDIS_URL not configured. Rate limiting and caching will be disabled.")

    @property
    def client(self) -> SafeRedisClient:
        """Backward-compatible property that returns a safe Redis client wrapper."""
        if self._client is None:
            self._client = SafeRedisClient(self)
        return self._client

    async def get_redis(self) -> Optional[redis.Redis]:
        if not self._configured:
            return None
        if self._redis is None:
            try:
                # FIX: Add connection pool and timeout settings for production
                self._redis = await redis.from_url(
                    settings.REDIS_URL, 
                    encoding="utf-8", 
                    decode_responses=True,
                    max_connections=10,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_error=[ConnectionError, TimeoutError],
                )
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                return None
        return self._redis

    async def set_json(self, key: str, value: Any, expire: int = 3600):
        r = await self.get_redis()
        if r:
            await r.set(key, json.dumps(value), ex=expire)

    async def get_json(self, key: str) -> Optional[Any]:
        r = await self.get_redis()
        if not r:
            return None
        data = await r.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_value(self, key: str, value: str, expire: int = 3600):
        r = await self.get_redis()
        if r:
            await r.set(key, value, ex=expire)

    async def get_value(self, key: str) -> Optional[str]:
        r = await self.get_redis()
        if not r:
            return None
        return await r.get(key)

    async def delete(self, key: str):
        r = await self.get_redis()
        if r:
            await r.delete(key)

    async def rate_limit(self, key: str, limit: int, period: int) -> bool:
        """
        Check if an action is within rate limits.
        Returns True if allowed, False if limited.
        If Redis not configured, always allow.
        """
        r = await self.get_redis()
        if not r:
            return True  # Allow all if Redis not configured
        
        try:
            current = await r.get(f"ratelimit:{key}")
            if current is not None and int(current) >= limit:
                return False
            
            async with r.pipeline() as pipe:
                await pipe.incr(f"ratelimit:{key}")
                if current is None:
                    await pipe.expire(f"ratelimit:{key}", period)
                await pipe.execute()
            return True
        except Exception as e:
            logger.warning(f"Redis rate limit error: {e}")
            return True  # Allow on error

    async def publish(self, channel: str, message: Any):
        r = await self.get_redis()
        if r:
            try:
                await r.publish(channel, json.dumps(message))
            except Exception as e:
                logger.warning(f"Redis publish error: {e}")

    def subscribe(self, channel: str):
        # Return a pubsub object
        if self._redis:
            return self._redis.pubsub()
        return None

    async def close(self):
        if self._redis:
            await self._redis.close()

    # === Token Blacklist ===
    
    async def blacklist_token(self, token: str, expires_in: int = 86400):
        """
        Add token to blacklist. Token will be rejected until expiry.
        expires_in: seconds until token naturally expires (default 24h)
        """
        r = await self.get_redis()
        if r:
            try:
                # Use token hash as key to save space
                token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
                await r.set(f"blacklist:{token_hash}", "1", ex=expires_in)
                logger.info(f"Token blacklisted: {token_hash[:8]}...")
            except Exception as e:
                logger.warning(f"Redis blacklist error: {e}")

    async def is_token_blacklisted(self, token: str) -> bool:
        """
        Check if token is blacklisted.
        Returns False if Redis not configured (fail-open for availability).
        """
        r = await self.get_redis()
        if not r:
            return False
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
            return await r.exists(f"blacklist:{token_hash}")
        except Exception as e:
            logger.warning(f"Redis blacklist check error: {e}")
            return False

    async def blacklist_user_tokens(self, user_id: str):
        """
        Invalidate all tokens for a user by incrementing their token version.
        Tokens issued before this version will be rejected.
        """
        r = await self.get_redis()
        if r:
            try:
                await r.incr(f"token_version:{user_id}")
                logger.info(f"Token version incremented for user: {user_id}")
            except Exception as e:
                logger.warning(f"Redis token version error: {e}")

    async def get_token_version(self, user_id: str) -> int:
        """Get current token version for user."""
        r = await self.get_redis()
        if not r:
            return 0
        try:
            version = await r.get(f"token_version:{user_id}")
            return int(version) if version else 0
        except Exception as e:
            logger.warning(f"Redis get token version error: {e}")
            return 0

redis_manager = RedisManager()
