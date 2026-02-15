from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend import auth, database
from backend.services.pagination import get_matches_paginated, get_messages_paginated

router = APIRouter(tags=["Discovery & Profiles"])


@router.get("/matches/paginated")
async def get_matches_paginated_endpoint(
    limit: int = 20,
    cursor: str = None,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    💬 Матчи с курсорной пагинацией
    """
    result = await get_matches_paginated(
        db=db,
        user_id=current_user,
        limit=limit,
        cursor=cursor
    )
    
    return result.model_dump()


@router.get("/matches/{match_id}/messages/paginated")
async def get_messages_paginated_endpoint(
    match_id: str,
    limit: int = 50,
    cursor: str = None,
    direction: str = "older",
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    📨 Сообщения с курсорной пагинацией
    """
    result = await get_messages_paginated(
        db=db,
        match_id=match_id,
        limit=limit,
        cursor=cursor,
        direction=direction
    )
    
    return result.model_dump()
