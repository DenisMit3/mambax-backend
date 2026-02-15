"""
Incognito Mode (VIP)
====================
Режим инкогнито — скрытие профиля из поиска, анонимные лайки.
"""

import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

# In-memory storage
_incognito_users: Dict[str, Dict[str, Any]] = {}


def enable_incognito(user_id: str) -> Dict[str, Any]:
    """
    Включить режим Инкогнито (VIP функция).
    
    В режиме Инкогнито:
    - Профиль не виден в общем поиске
    - Виден только тем, кого пользователь лайкнул
    - Лайки ставятся анонимно
    """
    _incognito_users[user_id] = {
        "enabled_at": datetime.utcnow().isoformat(),
        "hide_from_search": True,
        "anonymous_likes": True
    }
    
    logger.info(f"Incognito enabled for user {user_id}")
    
    return {
        "status": "enabled",
        "message": "Режим Инкогнито включён. Ваш профиль скрыт от общего поиска.",
        "features": {
            "hide_from_search": True,
            "anonymous_likes": True
        }
    }


def disable_incognito(user_id: str) -> Dict[str, Any]:
    """Отключить режим Инкогнито"""
    if user_id in _incognito_users:
        del _incognito_users[user_id]
    
    return {
        "status": "disabled",
        "message": "Режим Инкогнито выключен. Ваш профиль снова виден всем."
    }


def is_incognito(user_id: str) -> bool:
    """Проверить, в режиме Инкогнито ли пользователь"""
    return user_id in _incognito_users


def get_incognito_settings(user_id: str) -> Dict[str, Any]:
    """Получить настройки Инкогнито"""
    if user_id in _incognito_users:
        return {"enabled": True, **_incognito_users[user_id]}
    return {"enabled": False}
