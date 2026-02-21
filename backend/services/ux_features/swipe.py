"""
Swipe Features (VIP)
====================
Undo last swipe, Super Like - VIP-функции свайпов.
Данные хранятся в Redis для масштабируемости.
"""

import uuid
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.user import User
from backend.models.interaction import Like

from backend.services.ux_features.notifications import notify_new_like

logger = logging.getLogger(__name__)

# Redis key prefix
SWIPE_HISTORY_KEY = "swipe_history:"  # swipe_history:{user_id} -> list of JSON

# Максимум свайпов для хранения
MAX_UNDO_HISTORY = 10


async def _get_redis():
    """Get Redis client."""
    from backend.core.redis import redis_manager
    return await redis_manager.get_redis()


def record_swipe_for_undo(
    user_id: str,
    swiped_user_id: str,
    action: str,  # "like" or "pass"
    is_super: bool = False
) -> None:
    """Записать свайп для возможности отмены (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_record_swipe_async(user_id, swiped_user_id, action, is_super))
        else:
            loop.run_until_complete(_record_swipe_async(user_id, swiped_user_id, action, is_super))
    except RuntimeError:
        asyncio.run(_record_swipe_async(user_id, swiped_user_id, action, is_super))


async def _record_swipe_async(
    user_id: str,
    swiped_user_id: str,
    action: str,
    is_super: bool = False
) -> None:
    """Записать свайп для возможности отмены в Redis."""
    redis = await _get_redis()
    if not redis:
        logger.warning("Redis not available for swipe history")
        return
    
    swipe = {
        "id": str(uuid.uuid4()),
        "swiped_user_id": swiped_user_id,
        "action": action,
        "is_super": is_super,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    key = f"{SWIPE_HISTORY_KEY}{user_id}"
    
    # Push to list
    await redis.lpush(key, json.dumps(swipe))
    
    # Keep only last N swipes
    await redis.ltrim(key, 0, MAX_UNDO_HISTORY - 1)
    
    # Set TTL 24 hours (undo only available for recent swipes)
    await redis.expire(key, 60 * 60 * 24)


async def undo_last_swipe(db: AsyncSession, user_id: str, is_vip: bool = False) -> Dict[str, Any]:
    """
    Отменить последний свайп (VIP функция).
    
    Returns:
        Профиль отменённого пользователя для повторного показа
    """
    if not is_vip:
        return {
            "success": False,
            "error": "vip_required",
            "message": "Отмена свайпа доступна только для VIP пользователей"
        }
    
    redis = await _get_redis()
    if not redis:
        return {
            "success": False,
            "error": "service_unavailable",
            "message": "Сервис временно недоступен"
        }
    
    key = f"{SWIPE_HISTORY_KEY}{user_id}"
    
    # Pop last swipe
    swipe_json = await redis.lpop(key)
    if not swipe_json:
        return {
            "success": False,
            "error": "no_swipes",
            "message": "Нет свайпов для отмены"
        }
    
    try:
        last_swipe = json.loads(swipe_json)
    except json.JSONDecodeError:
        return {
            "success": False,
            "error": "invalid_data",
            "message": "Ошибка данных"
        }
    
    swiped_user_id = last_swipe["swiped_user_id"]
    
    # Удаляем лайк из БД если был
    if last_swipe["action"] == "like":
        try:
            # Удаляем запись о лайке
            result = await db.execute(
                select(Like).where(
                    Like.liker_id == user_id,
                    Like.liked_id == swiped_user_id
                )
            )
            like = result.scalars().first()
            if like:
                await db.delete(like)
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to delete like: {e}")
    
    # Получаем профиль для повторного показа
    try:
        swiped_uuid = uuid.UUID(swiped_user_id) if isinstance(swiped_user_id, str) else swiped_user_id
        result = await db.execute(
            select(User).where(User.id == swiped_uuid)
        )
        profile = result.scalars().first()
    except Exception as e:
        logger.error(f"Failed to get profile: {e}")
        profile = None
    
    if profile:
        logger.info(f"User {user_id} undid swipe on {swiped_user_id}")
        
        return {
            "success": True,
            "undone_action": last_swipe["action"],
            "profile": {
                "id": str(profile.id),
                "name": profile.name,
                "age": profile.age,
                "bio": profile.bio,
                "photos": profile.photos or [],
                "is_verified": getattr(profile, 'is_verified', False)
            }
        }
    
    return {
        "success": False,
        "error": "profile_not_found",
        "message": "Профиль не найден"
    }


def get_undo_count(user_id: str) -> int:
    """Получить количество доступных отмен (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return 0  # Default for sync context
        else:
            return loop.run_until_complete(_get_undo_count_async(user_id))
    except RuntimeError:
        return asyncio.run(_get_undo_count_async(user_id))


async def _get_undo_count_async(user_id: str) -> int:
    """Получить количество доступных отмен из Redis."""
    redis = await _get_redis()
    if not redis:
        return 0
    
    key = f"{SWIPE_HISTORY_KEY}{user_id}"
    return await redis.llen(key)


# ============================================================================
# SUPER LIKE
# ============================================================================

# Эффекты Super Like
SUPER_LIKE_EFFECTS = {
    "notification": True,
    "priority_in_feed": True,
    "special_badge": True,
    "animation": "star_burst"
}


async def process_super_like(
    db: AsyncSession,
    liker_id: str,
    liked_id: str
) -> Dict[str, Any]:
    """
    Обработать Super Like.
    
    Super Like:
    - Уведомляет получателя сразу
    - Профиль лайкера показывается первым
    - Специальный бейдж в стеке
    """
    # Записываем для отмены
    await _record_swipe_async(liker_id, liked_id, "like", is_super=True)
    
    # Отправляем push-уведомление
    await notify_new_like(liked_id, is_super=True)
    
    # Получаем информацию о лайкере для уведомления
    try:
        liker_uuid = uuid.UUID(liker_id) if isinstance(liker_id, str) else liker_id
        result = await db.execute(
            select(User).where(User.id == liker_uuid)
        )
        liker = result.scalars().first()
    except Exception:
        liker = None
    
    return {
        "status": "super_liked",
        "effects": SUPER_LIKE_EFFECTS,
        "notification_sent": True,
        "liker_name": liker.name if liker else None
    }
