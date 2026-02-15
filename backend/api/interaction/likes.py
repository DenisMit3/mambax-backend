# Interaction API - Лайки

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend import crud
from backend.api.interaction.deps import get_current_user_id

router = APIRouter()


@router.get("/likes/received")
async def get_received_likes_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    👀 Кто меня лайкнул (Premium функция)
    """
    user = await crud.get_user_profile(db, str(current_user))
    is_vip = user.is_vip if user else False
    
    return await crud.get_received_likes(db, str(current_user), is_vip=is_vip)


@router.get("/likes/count")
async def get_likes_count_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    🔢 Количество полученных лайков
    """
    count = await crud.get_likes_count(db, str(current_user))
    return {"count": count}
