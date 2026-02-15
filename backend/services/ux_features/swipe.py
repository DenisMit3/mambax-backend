"""
Swipe Features (VIP)
====================
Undo last swipe, Super Like — VIP-функции свайпов.
"""

import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.user import User
from backend.models.interaction import Like

from backend.services.ux_features.notifications import notify_new_like

logger = logging.getLogger(__name__)

# История свайпов для отмены
_swipe_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

# Максимум свайпов для хранения
MAX_UNDO_HISTORY = 10


def record_swipe_for_undo(
    user_id: str,
    swiped_user_id: str,
    action: str,  # "like" or "pass"
    is_super: bool = False
) -> None:
    """Записать свайп для возможности отмены"""
    swipe = {
        "id": str(uuid.uuid4()),
        "swiped_user_id": swiped_user_id,
        "action": action,
        "is_super": is_super,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    _swipe_history[user_id].append(swipe)
    
    # Храним только последние N свайпов
    if len(_swipe_history[user_id]) > MAX_UNDO_HISTORY:
        _swipe_history[user_id] = _swipe_history[user_id][-MAX_UNDO_HISTORY:]


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
    
    history = _swipe_history.get(user_id, [])
    if not history:
        return {
            "success": False,
            "error": "no_swipes",
            "message": "Нет свайпов для отмены"
        }
    
    # Получаем последний свайп
    last_swipe = history.pop()
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
    result = await db.execute(
        select(User).where(User.id == swiped_user_id)
    )
    profile = result.scalars().first()
    
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
    """Получить количество доступных отмен"""
    return len(_swipe_history.get(user_id, []))


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
    record_swipe_for_undo(liker_id, liked_id, "like", is_super=True)
    
    # Отправляем push-уведомление
    await notify_new_like(liked_id, is_super=True)
    
    # Получаем информацию о лайкере для уведомления
    result = await db.execute(
        select(User).where(User.id == liker_id)
    )
    liker = result.scalars().first()
    
    return {
        "status": "super_liked",
        "effects": SUPER_LIKE_EFFECTS,
        "notification_sent": True,
        "liker_name": liker.name if liker else None
    }
