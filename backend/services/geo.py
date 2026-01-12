import json
import logging
from typing import List, Optional, Tuple, Dict
from datetime import datetime
import redis.asyncio as redis
from backend.config.settings import settings

logger = logging.getLogger(__name__)

class GeoService:
    """
    High-Performance Geospatial Engine powered by Redis.
    Handles user location tracking and proximity searches at scale.
    """
    
    GEO_KEY = "mambax:geo:users"  # Sorted Set for GEORADIUS
    USER_META_KEY = "mambax:user:meta:" # Hash for quick metadata
    
    def __init__(self):
        # Initialize Async Redis Connection
        # Using connection pool for high concurrency
        self.redis = redis.from_url(
            settings.REDIS_URL or "redis://localhost:6379",
            encoding="utf-8", 
            decode_responses=True
        )

    async def update_location(self, user_id: str, lat: float, lon: float, metadata: dict = None):
        """
        Update user location in Redis Geospatial Index.
        O(log(N)) complexity.
        """
        if not lat or not lon:
            return

        # 1. Add to GEO index
        # GEOADD key longitude latitude member
        await self.redis.geoadd(self.GEO_KEY, (lon, lat, user_id))
        
        # 2. Store metadata (last_seen, role, etc) for quick access without DB hit
        if metadata:
            meta_key = f"{self.USER_META_KEY}{user_id}"
            metadata['updated_at'] = datetime.utcnow().isoformat()
            # Serialize complex types if needed, simple dict is fine for hset mapping if flat
            # We flatten the dict for hset
            flat_meta = {k: str(v) for k, v in metadata.items()}
            await self.redis.hset(meta_key, mapping=flat_meta)
            # Set TTL for metadata (clean up inactive users after 30 days)
            await self.redis.expire(meta_key, 60 * 60 * 24 * 30)

        logger.debug(f"Location updated for {user_id}: {lat}, {lon}")

    async def search_nearby_users(
        self, 
        lat: float, 
        lon: float, 
        radius_km: float = 50.0, 
        count: int = 100
    ) -> List[Dict[str, float]]:
        """
        Find users nearby using Redis GEORADIUS.
        Returns list of dicts: {'user_id': str, 'dist_km': float}
        """
        try:
            # GEORADIUS or GEOSEARCH (Redis 6.2+)
            # Returns list of [member, distance]
            results = await self.redis.geosearch(
                name=self.GEO_KEY,
                longitude=lon,
                latitude=lat,
                radius=radius_km,
                unit="km",
                sort="ASC", # Closest first
                count=count,
                withdist=True
            )
            
            # Format results
            users = []
            for member, dist in results:
                users.append({
                    "user_id": member,
                    "distance_km": float(dist)
                })
                
            return users
            
        except Exception as e:
            logger.error(f"Geo Search Error: {e}")
            return []

    async def get_user_location(self, user_id: str) -> Optional[Tuple[float, float]]:
        """
        Get specific user coordinates efficiently.
        """
        pos = await self.redis.geopos(self.GEO_KEY, user_id)
        if pos and pos[0]:
            # pos is [(lon, lat)]
            return (pos[0][1], pos[0][0]) # Return lat, lon
        return None

    async def remove_user(self, user_id: str):
        """Remove user from geo index (e.g. went invisible)."""
        await self.redis.zrem(self.GEO_KEY, user_id)
        
    async def get_users_metadata(self, user_ids: List[str]) -> Dict[str, dict]:
        """Bulk fetch metadata for found users to avoid N+1 DB calls."""
        pipe = self.redis.pipeline()
        for uid in user_ids:
            pipe.hgetall(f"{self.USER_META_KEY}{uid}")
        
        results = await pipe.execute()
        
        meta_map = {}
        for uid, data in zip(user_ids, results):
            if data:
                meta_map[uid] = data
        return meta_map

# Singleton instance
geo_service = GeoService()
