# Interaction API - Свайпы и Undo

import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from backend.core.redis import redis_manager
from backend.crud.interaction import create_swipe, check_existing_swipe
from backend.models.interaction import Swipe, Match
from backend.services.swipe_limits import (
    add_to_swipe_history, can_use_undo, pop_last_swipe_from_history,
    can_swipe, record_swipe, mark_undo_used
)
from backend.db.session import get_db
from backend.schemas.interaction import SwipeCreate
from backend import models
from backend.metrics import MATCHES_COUNTER
from backend.api.interaction.deps import get_current_user_id, SwipeResponse

router = APIRouter()


@router.post("/swipe", response_model=SwipeResponse)
async def swipe(
    swipe_data: SwipeCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """
    Обработка свайпа (лайк/дизлайк/суперлайк).
    """
    
    # Block Check
    from backend.services.security import is_blocked
    if await is_blocked(str(current_user_id), str(swipe_data.to_user_id)) or \
       await is_blocked(str(swipe_data.to_user_id), str(current_user_id)):
        raise HTTPException(status_code=403, detail="Interaction not allowed")

    # Check if already swiped
    existing = await check_existing_swipe(db, current_user_id, swipe_data.to_user_id)
    if existing:
        match_stmt = select(Match).where(
            or_(
                and_(Match.user1_id == current_user_id, Match.user2_id == swipe_data.to_user_id),
                and_(Match.user1_id == swipe_data.to_user_id, Match.user2_id == current_user_id)
            )
        )
        match_obj = (await db.execute(match_stmt)).scalars().first()
        return SwipeResponse(success=True, is_match=match_obj is not None)
    
    # Swipe Limit Check
    allowed_status = await can_swipe(db, str(current_user_id))
    if not allowed_status["allowed"]:
        raise HTTPException(status_code=403, detail="Swipe limit reached")

    # Create swipe and check for match
    swipe_obj, is_match = await create_swipe(db, current_user_id, swipe_data)

    # Record usage
    await record_swipe(db, str(current_user_id), is_super=(swipe_data.action.value == 'superlike'))
    
    if is_match:
        MATCHES_COUNTER.inc()

    # === NOTIFICATIONS ===
    try:
        from backend.services.notify import notify_new_like, notify_new_match
        
        # Get liker name for notification
        liker = await db.get(models.User, current_user_id)
        liker_name = liker.name if liker else "Кто-то"

        # Notify about like (only for like/superlike, not dislike)
        if swipe_data.action.value in ("like", "superlike"):
            await notify_new_like(
                db,
                liked_user_id=str(swipe_data.to_user_id),
                liker_user_id=str(current_user_id),
                liker_name=liker_name,
                is_super=(swipe_data.action.value == "superlike"),
            )

        # Notify about match
        if is_match:
            # Find the match to get match_id
            match_stmt = select(Match).where(
                or_(
                    and_(Match.user1_id == current_user_id, Match.user2_id == swipe_data.to_user_id),
                    and_(Match.user1_id == swipe_data.to_user_id, Match.user2_id == current_user_id)
                )
            )
            match_obj = (await db.execute(match_stmt)).scalars().first()
            partner = await db.get(models.User, swipe_data.to_user_id)
            partner_name = partner.name if partner else "Кто-то"

            await notify_new_match(
                db,
                user_id=str(current_user_id),
                partner_id=str(swipe_data.to_user_id),
                partner_name=partner_name,
                match_id=str(match_obj.id) if match_obj else None,
            )
    except Exception as e:
        # Don't fail the swipe if notification fails
        import logging
        logging.getLogger(__name__).error(f"Notification error on swipe: {e}")

    # Записать в историю для Undo
    await add_to_swipe_history(
        str(current_user_id),
        {
            "to_user_id": str(swipe_data.to_user_id),
            "action": swipe_data.action.value
        }
    )

    # Redis Persistence for AI
    if swipe_data.action.value in ["like", "superlike"]:
        history_key = f"interactions:{current_user_id}:liked"
        await redis_manager.client.lpush(history_key, str(swipe_data.to_user_id))
        await redis_manager.client.ltrim(history_key, 0, 99)

    # PERF: Invalidate discover cache on swipe
    try:
        pattern = f"discover:{current_user_id}:*"
        cursor = 0
        keys = []
        while True:
            cursor, batch = await redis_manager.client.scan(cursor=cursor, match=pattern, count=100)
            keys.extend(batch)
            if cursor == 0:
                break
        if keys:
            await redis_manager.client.delete(*keys)
    except Exception:
        pass

    return SwipeResponse(success=True, is_match=is_match)


@router.post("/undo-swipe")
async def undo_last_swipe(
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    ↩️ Отменить последний свайп (доступно для VIP или за Stars).
    """
    user = await db.get(models.User, current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_vip:
        can_undo = await can_use_undo(db, str(current_user_id))
        if not can_undo["allowed"]:
            raise HTTPException(
                status_code=403, 
                detail="Undo not available. Upgrade to VIP or wait until tomorrow."
            )
    
    last_swipe_data = await pop_last_swipe_from_history(str(current_user_id))
    
    if not last_swipe_data:
        raise HTTPException(status_code=400, detail="No swipes to undo")
    
    stmt = select(Swipe).where(
        and_(
            Swipe.from_user_id == current_user_id,
            Swipe.to_user_id == uuid.UUID(last_swipe_data["to_user_id"])
        )
    )
    swipe_obj = (await db.execute(stmt)).scalars().first()
    
    if swipe_obj:
        if last_swipe_data["action"] in ["like", "superlike"]:
            match_stmt = select(Match).where(
                or_(
                    and_(Match.user1_id == current_user_id, Match.user2_id == swipe_obj.to_user_id),
                    and_(Match.user1_id == swipe_obj.to_user_id, Match.user2_id == current_user_id)
                )
            )
            match_obj = (await db.execute(match_stmt)).scalars().first()
            if match_obj:
                await db.delete(match_obj)
        
        await db.delete(swipe_obj)
        await db.commit()
    
    if not user.is_vip:
        await mark_undo_used(str(current_user_id))

    return {
        "success": True,
        "undone_profile_id": last_swipe_data["to_user_id"],
        "action": last_swipe_data["action"]
    }


@router.get("/swipe-status")
async def get_swipe_status_endpoint(
    current_user: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get current swipe limits and status"""
    from backend.services.swipe_limits import get_swipe_status
    return await get_swipe_status(db, str(current_user))
