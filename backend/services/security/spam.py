"""
Anti-Spam
=========
Redis-backed spam detector — частота, дубликаты, контент-фильтры.
"""

import hashlib
import logging
from typing import Dict, Any

from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)


class SpamDetector:
    """Redis-backed Spam Detector."""
    
    async def check_message(
        self, 
        user_id: str, 
        message: str,
        max_per_minute: int = 10,
        max_duplicates: int = 3
    ) -> Dict[str, Any]:
        """Check message for spam using Redis."""
        # 1. Check Frequency
        is_allowed = await redis_manager.rate_limit(f"spam_freq:{user_id}", limit=max_per_minute, period=60)
        
        if not is_allowed:
            return {
                "is_spam": True,
                "reason": "too_many_messages",
                "action": "rate_limit",
                "message": "Слишком много сообщений. Подождите минуту."
            }
        
        # 2. Check Duplicates in Redis
        message_hash = hashlib.md5(message.lower().strip().encode()).hexdigest()
        dup_key = f"spam_hash:{user_id}:{message_hash}"
        
        count = await redis_manager.client.incr(dup_key)
        if count == 1:
            await redis_manager.client.expire(dup_key, 3600)
            
        if count > max_duplicates:
            return {
                "is_spam": True,
                "reason": "duplicate_message",
                "action": "block",
                "message": "Не отправляйте одинаковые сообщения."
            }
        
        # 3. Content Checks (Static)
        if len(message) > 5000:
            return {
                "is_spam": True,
                "reason": "message_too_long",
                "action": "reject",
                "message": "Сообщение слишком длинное."
            }
        
        spam_patterns = [
            "заработок", "быстрые деньги", "казино", "ставки",
            "инвестиции", "криптовалют", "пассивный доход"
        ]
        message_lower = message.lower()
        for pattern in spam_patterns:
            if pattern in message_lower:
                return {
                    "is_spam": True,
                    "reason": "spam_content",
                    "action": "flag",
                    "message": "Сообщение похоже на спам."
                }
        
        return {"is_spam": False, "reason": None, "action": None}


# Global spam detector
spam_detector = SpamDetector()
