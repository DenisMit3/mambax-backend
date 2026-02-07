"""
Gamification Service: badge checks and awards.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User
from backend.models.chat import Message
from backend.core.redis import redis_manager
from backend.api.chat import manager


BADGE_TITLES = {
    "conversationalist": "Conversationalist",
    "icebreaker_master": "Icebreaker Master",
    "daily_questioner": "Daily Questioner",
}


async def check_and_award_badge(
    user_id: str,
    badge_type: str,
    db: AsyncSession,
) -> Optional[dict]:
    """
    Check conditions for badge_type and award if not already earned.
    Sends WebSocket event {"type": "badge_earned", "badge": "...", "title": "..."} on award.
    """
    u_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    user = await db.get(User, u_id)
    if not user:
        return None

    achievements = getattr(user, "achievements", None) or []
    if not isinstance(achievements, list):
        achievements = []
    already = any(
        (a if isinstance(a, dict) else {}).get("badge") == badge_type
        for a in achievements
    )
    if already:
        return None

    earned = False
    if badge_type == "conversationalist":
        # 10 active dialogues (distinct matches where user sent at least one message)
        stmt = select(func.count(Message.match_id.distinct())).where(Message.sender_id == u_id)
        result = await db.execute(stmt)
        count = result.scalar() or 0
        earned = count >= 10

    elif badge_type == "icebreaker_master":
        # Used 5 icebreakers (caller increments icebreaker_used_count:{user_id})
        key = f"icebreaker_used_count:{user_id}"
        raw = await redis_manager.client.get(key)
        count = int(raw) if raw else 0
        earned = count >= 5

    elif badge_type == "daily_questioner":
        # 7 QOTD answers (caller increments qotd_answer_count:{user_id})
        key = f"qotd_answer_count:{user_id}"
        raw = await redis_manager.client.get(key)
        count = int(raw) if raw else 0
        earned = count >= 7

    if not earned:
        return None

    entry = {
        "badge": badge_type,
        "earned_at": datetime.utcnow().isoformat() + "Z",
        "level": 1,
    }
    new_achievements = list(achievements) + [entry]
    user.achievements = new_achievements
    await db.commit()

    payload = {
        "type": "badge_earned",
        "badge": badge_type,
        "title": BADGE_TITLES.get(badge_type, badge_type),
    }
    await manager.send_personal(user_id, payload)
    return entry
