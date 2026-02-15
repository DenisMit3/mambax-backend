# Interaction API - Лента профилей

import json
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.redis import redis_manager
from backend.services.pagination import get_profiles_paginated
from backend.db.session import get_db
from backend.api.interaction.deps import get_current_user_id

router = APIRouter()


@router.get("/feed")
async def get_feed(
    limit: int = 20,
    cursor: str = None,
    exclude_swiped: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    📱 Лента профилей с курсорной пагинацией (Infinite Scroll)
    PERF-009: Redis кэширование на 30 секунд
    """
    cache_key = f"feed:{current_user_id}:{cursor}:{limit}:{exclude_swiped}"
    
    try:
        cached = await redis_manager.get_value(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    
    result = await get_profiles_paginated(
        db=db,
        current_user_id=str(current_user_id),
        limit=limit,
        cursor=cursor,
        exclude_swiped=exclude_swiped
    )
    
    data = result.model_dump()
    
    try:
        await redis_manager.set_value(cache_key, json.dumps(data, default=str), expire=30)
    except Exception:
        pass
    
    return data
