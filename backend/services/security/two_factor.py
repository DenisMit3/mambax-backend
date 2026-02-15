"""
Two-Factor Authentication (2FA)
===============================
Двухфакторная аутентификация — Telegram, Email, TOTP.
"""

import uuid
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class TwoFactorMethod(str, Enum):
    TELEGRAM = "telegram"
    EMAIL = "email"
    TOTP = "totp"


class TwoFactorSession(BaseModel):
    session_id: str
    user_id: str
    method: TwoFactorMethod
    code: str
    created_at: str
    expires_at: str
    verified: bool = False


# In-memory storage
_2fa_sessions: Dict[str, TwoFactorSession] = {}
_2fa_enabled_users: Dict[str, Dict[str, Any]] = {}


def enable_2fa(user_id: str, method: TwoFactorMethod = TwoFactorMethod.TELEGRAM) -> Dict[str, Any]:
    """Включить 2FA для пользователя"""
    _2fa_enabled_users[user_id] = {
        "method": method,
        "enabled_at": datetime.utcnow().isoformat()
    }
    
    logger.info(f"2FA enabled for user {user_id} via {method}")
    
    return {
        "status": "enabled",
        "method": method,
        "message": "Двухфакторная аутентификация включена"
    }


def disable_2fa(user_id: str) -> Dict[str, Any]:
    """Отключить 2FA"""
    if user_id in _2fa_enabled_users:
        del _2fa_enabled_users[user_id]
    
    return {"status": "disabled", "message": "2FA отключена"}


def is_2fa_enabled(user_id: str) -> bool:
    """Проверить, включена ли 2FA"""
    return user_id in _2fa_enabled_users


def create_2fa_challenge(user_id: str) -> Dict[str, Any]:
    """Создать challenge для 2FA"""
    if not is_2fa_enabled(user_id):
        return {"required": False}
    
    method = _2fa_enabled_users[user_id]["method"]
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    session = TwoFactorSession(
        session_id=str(uuid.uuid4()),
        user_id=user_id,
        method=method,
        code=code,
        created_at=datetime.utcnow().isoformat(),
        expires_at=(datetime.utcnow() + timedelta(minutes=5)).isoformat()
    )
    
    _2fa_sessions[session.session_id] = session
    
    logger.info(f"2FA challenge created for {user_id}: {session.session_id}")
    
    return {
        "required": True,
        "session_id": session.session_id,
        "method": method,
        "expires_in": 300
    }


def verify_2fa(session_id: str, code: str) -> Dict[str, Any]:
    """Проверить 2FA код"""
    if session_id not in _2fa_sessions:
        return {"verified": False, "error": "Session not found"}
    
    session = _2fa_sessions[session_id]
    
    if datetime.utcnow() > datetime.fromisoformat(session.expires_at):
        del _2fa_sessions[session_id]
        return {"verified": False, "error": "Session expired"}
    
    if session.code != code:
        return {"verified": False, "error": "Invalid code"}
    
    session.verified = True
    del _2fa_sessions[session_id]
    
    logger.info(f"2FA verified for user {session.user_id}")
    
    return {"verified": True, "user_id": session.user_id}
