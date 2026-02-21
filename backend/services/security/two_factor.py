"""
Two-Factor Authentication (2FA)
===============================
Двухфакторная аутентификация - Telegram, Email, TOTP.
Данные хранятся в Redis для масштабируемости.
"""

import uuid
import json
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, Any
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Redis key prefixes
TFA_SESSION_KEY = "2fa:session:"  # 2fa:session:{session_id} -> JSON
TFA_ENABLED_KEY = "2fa:enabled:"  # 2fa:enabled:{user_id} -> hash


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


async def _get_redis():
    """Get Redis client."""
    from backend.core.redis import redis_manager
    return await redis_manager.get_redis()


def enable_2fa(user_id: str, method: TwoFactorMethod = TwoFactorMethod.TELEGRAM) -> Dict[str, Any]:
    """Включить 2FA для пользователя (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_enable_2fa_async(user_id, method))
            return {
                "status": "enabled",
                "method": method,
                "message": "Двухфакторная аутентификация включена"
            }
        else:
            return loop.run_until_complete(_enable_2fa_async(user_id, method))
    except RuntimeError:
        return asyncio.run(_enable_2fa_async(user_id, method))


async def _enable_2fa_async(user_id: str, method: TwoFactorMethod = TwoFactorMethod.TELEGRAM) -> Dict[str, Any]:
    """Включить 2FA для пользователя в Redis."""
    redis = await _get_redis()
    if redis:
        key = f"{TFA_ENABLED_KEY}{user_id}"
        await redis.hset(key, mapping={
            "method": method.value,
            "enabled_at": datetime.utcnow().isoformat()
        })
        # No TTL - 2FA stays enabled until disabled
    
    logger.info(f"2FA enabled for user {user_id} via {method}")
    
    return {
        "status": "enabled",
        "method": method,
        "message": "Двухфакторная аутентификация включена"
    }


def disable_2fa(user_id: str) -> Dict[str, Any]:
    """Отключить 2FA (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_disable_2fa_async(user_id))
            return {"status": "disabled", "message": "2FA отключена"}
        else:
            return loop.run_until_complete(_disable_2fa_async(user_id))
    except RuntimeError:
        return asyncio.run(_disable_2fa_async(user_id))


async def _disable_2fa_async(user_id: str) -> Dict[str, Any]:
    """Отключить 2FA в Redis."""
    redis = await _get_redis()
    if redis:
        key = f"{TFA_ENABLED_KEY}{user_id}"
        await redis.delete(key)
    
    return {"status": "disabled", "message": "2FA отключена"}


def is_2fa_enabled(user_id: str) -> bool:
    """Проверить, включена ли 2FA (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return False  # Default for sync context
        else:
            return loop.run_until_complete(_is_2fa_enabled_async(user_id))
    except RuntimeError:
        return asyncio.run(_is_2fa_enabled_async(user_id))


async def _is_2fa_enabled_async(user_id: str) -> bool:
    """Проверить, включена ли 2FA в Redis."""
    redis = await _get_redis()
    if not redis:
        return False
    
    key = f"{TFA_ENABLED_KEY}{user_id}"
    return await redis.exists(key) > 0


def create_2fa_challenge(user_id: str) -> Dict[str, Any]:
    """Создать challenge для 2FA (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return {"required": False}  # Can't check in sync context
        else:
            return loop.run_until_complete(_create_2fa_challenge_async(user_id))
    except RuntimeError:
        return asyncio.run(_create_2fa_challenge_async(user_id))


async def _create_2fa_challenge_async(user_id: str) -> Dict[str, Any]:
    """Создать challenge для 2FA в Redis."""
    redis = await _get_redis()
    if not redis:
        return {"required": False}
    
    # Check if 2FA enabled
    enabled_key = f"{TFA_ENABLED_KEY}{user_id}"
    enabled_data = await redis.hgetall(enabled_key)
    
    if not enabled_data:
        return {"required": False}
    
    method = enabled_data.get("method", "telegram")
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    session_id = str(uuid.uuid4())
    
    session = TwoFactorSession(
        session_id=session_id,
        user_id=user_id,
        method=TwoFactorMethod(method),
        code=code,
        created_at=datetime.utcnow().isoformat(),
        expires_at=(datetime.utcnow() + timedelta(minutes=5)).isoformat()
    )
    
    # Store session in Redis with 5 min TTL
    session_key = f"{TFA_SESSION_KEY}{session_id}"
    await redis.set(session_key, session.model_dump_json(), ex=300)
    
    logger.info(f"2FA challenge created for {user_id}: {session_id}")
    
    return {
        "required": True,
        "session_id": session_id,
        "method": method,
        "expires_in": 300
    }


def verify_2fa(session_id: str, code: str) -> Dict[str, Any]:
    """Проверить 2FA код (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return {"verified": False, "error": "Async context required"}
        else:
            return loop.run_until_complete(_verify_2fa_async(session_id, code))
    except RuntimeError:
        return asyncio.run(_verify_2fa_async(session_id, code))


async def _verify_2fa_async(session_id: str, code: str) -> Dict[str, Any]:
    """Проверить 2FA код в Redis."""
    redis = await _get_redis()
    if not redis:
        return {"verified": False, "error": "Service unavailable"}
    
    session_key = f"{TFA_SESSION_KEY}{session_id}"
    session_json = await redis.get(session_key)
    
    if not session_json:
        return {"verified": False, "error": "Session not found"}
    
    try:
        session_data = json.loads(session_json)
        session = TwoFactorSession(**session_data)
    except (json.JSONDecodeError, ValueError):
        return {"verified": False, "error": "Invalid session data"}
    
    if datetime.utcnow() > datetime.fromisoformat(session.expires_at):
        await redis.delete(session_key)
        return {"verified": False, "error": "Session expired"}
    
    if session.code != code:
        return {"verified": False, "error": "Invalid code"}
    
    # Delete session after successful verification
    await redis.delete(session_key)
    
    logger.info(f"2FA verified for user {session.user_id}")
    
    return {"verified": True, "user_id": session.user_id}
