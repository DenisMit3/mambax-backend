"""
Profile Visibility & Boost
===========================
Настройки видимости профиля и буст (приоритет в ленте).
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from collections import defaultdict

logger = logging.getLogger(__name__)

# Настройки видимости профиля
_visibility_settings: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
    "show_online_status": True,
    "show_last_seen": True,
    "show_distance": True,
    "show_age": True,
    "read_receipts": True
})


def get_visibility_settings(user_id: str) -> Dict[str, Any]:
    """Получить настройки видимости"""
    return dict(_visibility_settings[user_id])


def update_visibility_settings(user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    """Обновить настройки видимости"""
    _visibility_settings[user_id].update(settings)
    return get_visibility_settings(user_id)


# ============================================================================
# BOOST PROFILE
# ============================================================================

# Активные бусты
_active_boosts: Dict[str, Dict[str, Any]] = {}


def activate_boost(user_id: str, duration_minutes: int = 30) -> Dict[str, Any]:
    """
    Активировать буст профиля.
    
    Буст:
    - Профиль показывается первым в ленте
    - Увеличивает видимость в 10 раз
    - Длится 30 минут
    """
    expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
    
    _active_boosts[user_id] = {
        "activated_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
        "duration_minutes": duration_minutes
    }
    
    logger.info(f"Boost activated for user {user_id}")
    
    return {
        "status": "activated",
        "expires_at": expires_at.isoformat(),
        "duration_minutes": duration_minutes,
        "message": f"Ваш профиль будет в топе следующие {duration_minutes} минут!"
    }


def is_boosted(user_id: str) -> bool:
    """Проверить, активен ли буст"""
    if user_id not in _active_boosts:
        return False
    
    expires_at = datetime.fromisoformat(_active_boosts[user_id]["expires_at"])
    if datetime.utcnow() > expires_at:
        del _active_boosts[user_id]
        return False
    
    return True


def get_boost_status(user_id: str) -> Dict[str, Any]:
    """Получить статус буста"""
    if is_boosted(user_id):
        boost = _active_boosts[user_id]
        expires_at = datetime.fromisoformat(boost["expires_at"])
        remaining = (expires_at - datetime.utcnow()).total_seconds()
        
        return {
            "active": True,
            "expires_at": boost["expires_at"],
            "remaining_seconds": int(remaining)
        }
    
    return {"active": False}
