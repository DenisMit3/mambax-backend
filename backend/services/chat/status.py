"""
Chat - Online status & unread counters
"""

import logging
from datetime import datetime
from typing import Optional

from backend.services.chat.state import state_manager
from backend.services.chat.connections import manager

logger = logging.getLogger(__name__)


async def get_unread_count(user_id: str, match_id: str = None) -> dict:
    """Получить количество непрочитанных сообщений из Redis"""
    try:
        by_match = await state_manager.get_all_unread(user_id)
        total = sum(by_match.values())
        
        if match_id:
            count = by_match.get(match_id, 0)
            return {"total": count, "by_match": {match_id: count}}
        return {"total": total, "by_match": by_match}
    except Exception as e:
        logger.warning(f"Failed to get unread count: {e}")
        return {"total": 0, "by_match": {}}


async def increment_unread(user_id: str, match_id: str):
    """Увеличить счётчик непрочитанных в Redis"""
    try:
        await state_manager.increment_unread(user_id, match_id)
    except Exception as e:
        logger.warning(f"Failed to increment unread: {e}")


async def clear_unread(user_id: str, match_id: str):
    """Сбросить счётчик непрочитанных при прочтении"""
    try:
        await state_manager.clear_unread(user_id, match_id)
    except Exception as e:
        logger.warning(f"Failed to clear unread: {e}")


def get_online_status(user_id: str) -> dict:
    """Get user online status"""
    is_online = manager.is_online(user_id)
    return {"user_id": user_id, "is_online": is_online, "last_seen": None}


def format_last_seen(last_seen: datetime) -> str:
    """Format last seen time for display"""
    if not last_seen:
        return "Unknown"
    now = datetime.utcnow()
    delta = now - last_seen
    total_secs = int(delta.total_seconds())
    if total_secs < 60:
        return "Just now"
    elif total_secs < 3600:
        return f"{total_secs // 60} min ago"
    elif delta.days == 0:
        return f"{total_secs // 3600} hours ago"
    else:
        return last_seen.strftime("%b %d")
