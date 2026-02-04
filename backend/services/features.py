from typing import Dict, Optional, Any
import hashlib
import time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.system import FeatureFlag
from backend.database import async_session_maker
import logging

logger = logging.getLogger(__name__)

class FeatureService:
    _cache: Dict[str, Any] = {}
    _cache_ttl = 60  # seconds
    _last_update = 0

    @classmethod
    async def _refresh_cache(cls):
        now = time.time()
        if now - cls._last_update < cls._cache_ttl and cls._cache:
            return

        try:
            async with async_session_maker() as session:
                result = await session.execute(select(FeatureFlag))
                flags = result.scalars().all()
                cls._cache = {f.key: {"enabled": f.is_enabled, "rollout": f.rollout_percentage, "whitelist": f.whitelist_users} for f in flags}
                cls._last_update = now
                logger.debug("Feature flags cache refreshed")
        except Exception as e:
            logger.error(f"Failed to refresh feature flags: {e}")

    @classmethod
    async def is_enabled(cls, feature_key: str, user_id: Optional[str] = None, default: bool = False) -> bool:
        """
        Check if a feature is enabled.
        Supports global switch, whitelist, and percentage rollout.
        """
        await cls._refresh_cache()
        
        flag = cls._cache.get(feature_key)
        
        # If flag doesn't exist in DB/Cache, return default
        if flag is None:
            # Optionally auto-create flag here if requested, but better to keep read-only
            return default

        # 1. Global enable
        if flag["enabled"]:
            return True

        if not user_id:
            return False

        # 2. Whitelist
        if flag.get("whitelist") and user_id in flag["whitelist"]:
            return True

        # 3. Rollout Percentage
        rollout = flag.get("rollout", 0)
        if rollout > 0:
            # Deterministic hash based on feature + user_id
            hash_input = f"{feature_key}:{user_id}"
            hash_val = int(hashlib.sha256(hash_input.encode()).hexdigest(), 16)
            user_percentage = hash_val % 100
            return user_percentage < rollout

        return False

feature_service = FeatureService
