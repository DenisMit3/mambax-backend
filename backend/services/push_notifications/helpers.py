"""
Push Notification Helpers - отправка по user_ids и сегментам
"""

import uuid
import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.models import PushSubscription, User
from backend.services.notification import send_push_notification

logger = logging.getLogger(__name__)


async def send_push_to_users(
    db: AsyncSession,
    user_ids: List[uuid.UUID],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Отправка push-уведомлений списку пользователей через Web Push.
    """
    if not user_ids:
        return {"success": True, "sent": 0, "failed": 0}
    
    sent = 0
    failed = 0
    
    for user_id in user_ids:
        try:
            user_id_str = str(user_id) if isinstance(user_id, uuid.UUID) else user_id
            await send_push_notification(
                db=db,
                user_id=user_id_str,
                title=title,
                body=body,
                url=data.get("route", "/") if data else "/",
                tag=data.get("tag") if data else None
            )
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send push to user {user_id}: {e}")
            failed += 1
    
    return {"success": True, "sent": sent, "failed": failed}


async def send_push_to_segment(
    db: AsyncSession,
    segment: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Отправка push-уведомлений сегменту пользователей через Web Push.
    Сегменты: all, active, vip, new_users, inactive
    """
    # Получаем пользователей по сегменту
    query = select(User.id)
    
    if segment == "all":
        query = query.where(User.is_active == True)
    elif segment == "active":
        from datetime import datetime, timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        query = query.where(User.is_active == True, User.last_seen >= week_ago)
    elif segment == "vip":
        query = query.where(User.is_vip == True, User.is_active == True)
    elif segment == "new_users":
        from datetime import datetime, timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        query = query.where(User.created_at >= week_ago, User.is_active == True)
    elif segment == "inactive":
        from datetime import datetime, timedelta
        month_ago = datetime.utcnow() - timedelta(days=30)
        query = query.where(User.last_seen < month_ago, User.is_active == True)
    else:
        logger.warning(f"Unknown segment: {segment}")
        return {"success": False, "error": f"Unknown segment: {segment}", "sent": 0}
    
    # Только пользователи с подписками на push
    query = query.where(
        User.id.in_(select(PushSubscription.user_id).distinct())
    )
    
    result = await db.execute(query)
    user_ids = [row[0] for row in result.fetchall()]
    
    if not user_ids:
        logger.info(f"No users with push subscriptions in segment: {segment}")
        return {"success": True, "sent": 0, "segment": segment, "message": "No subscribers in segment"}
    
    logger.info(f"Sending push to {len(user_ids)} users in segment: {segment}")
    return await send_push_to_users(db, user_ids, title, body, data)
