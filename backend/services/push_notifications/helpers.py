"""
Push Notification Helpers - отправка по user_ids и сегментам
"""

import uuid
import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def send_push_to_users(
    db: AsyncSession,
    user_ids: List[uuid.UUID],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Отправка push-уведомлений пользователям.
    Сейчас отключено — у модели User нет поля fcm_token.
    TODO: реализовать через таблицу push_subscriptions (Web Push)
    """
    logger.info(f"Push notifications disabled (no fcm_token field). Users: {len(user_ids)}")
    return {"success": False, "error": "Push notifications not configured (no fcm_token)", "sent": 0}


async def send_push_to_segment(
    db: AsyncSession,
    segment: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Отправка push-уведомлений сегменту пользователей.
    Сейчас отключено — у модели User нет поля fcm_token.
    TODO: реализовать через таблицу push_subscriptions (Web Push)
    """
    logger.info(f"Push notifications disabled (no fcm_token field). Segment: {segment}")
    return {"success": False, "error": "Push notifications not configured (no fcm_token)", "sent": 0}
