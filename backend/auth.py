import random
import secrets
import string
import aiohttp
import hmac
import hashlib
import json
import os
import uuid as uuid_module
from datetime import datetime
from typing import Optional, Union
from urllib.parse import parse_qsl

from jose import JWTError, jwt
from fastapi import HTTPException, Header, Depends
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Core & DB
from backend.core.config import settings
from backend.config.settings import settings as app_settings
from backend.core.redis import redis_manager
from backend.db.session import get_db, async_session_maker

# Models
from backend.models.user import User

ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
logger = logging.getLogger(__name__)

# Debug: store last validation attempt details
_last_validation_debug = {"status": "no attempts yet"}


async def decode_jwt(token: str) -> Optional[str]:
    """
    Decode a JWT token and return the user_id (sub claim).
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        return user_id
    except JWTError:
        return None


def validate_telegram_data(init_data: str) -> dict | None:
    """
    Validates the data received from Telegram Web App.
    Uses HMAC-SHA256 as per official Telegram docs:
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    global _last_validation_debug
    debug = {
        "timestamp": datetime.utcnow().isoformat(),
        "init_data_length": len(init_data) if init_data else 0,
        "init_data_preview": (init_data or "")[:100],
    }
    try:
        bot_token = TELEGRAM_BOT_TOKEN.strip() if TELEGRAM_BOT_TOKEN else None
        debug["bot_token_length"] = len(bot_token) if bot_token else 0
        debug["bot_token_prefix"] = bot_token[:8] + "..." if bot_token and len(bot_token) > 8 else "N/A"
        
        if not bot_token:
             debug["error"] = "TELEGRAM_BOT_TOKEN not configured"
             _last_validation_debug = debug
             logger.error("[VALIDATE-TG] TELEGRAM_BOT_TOKEN not configured")
             raise ValueError("TELEGRAM_BOT_TOKEN not configured")
        
        parsed_data = dict(parse_qsl(init_data.strip(), keep_blank_values=True))
        debug["parsed_keys"] = sorted(parsed_data.keys())
        logger.info(f"[VALIDATE-TG] Parsed keys: {sorted(parsed_data.keys())}")
        
        if "hash" not in parsed_data:
            debug["error"] = "hash not found in initData"
            _last_validation_debug = debug
            logger.warning("[VALIDATE-TG] FAIL: hash not found in initData")
            return None

        received_hash = parsed_data.pop("hash")
        debug["received_hash_prefix"] = received_hash[:16]
        
        # NOTE: Do NOT remove 'signature' - it must be included in data_check_string
        # when validating via HMAC-SHA256 (hash). Telegram includes ALL fields except 'hash'
        # in the hash calculation.
        had_signature = "signature" in parsed_data
        debug["had_signature"] = had_signature
        
        # Check auth_date to prevent replay attacks
        auth_date = int(parsed_data.get("auth_date", 0))
        current_time = datetime.utcnow().timestamp()
        max_age = 86400  # 24 hours
        age_seconds = current_time - auth_date
        debug["auth_date"] = auth_date
        debug["age_seconds"] = round(age_seconds)
        debug["environment"] = app_settings.ENVIRONMENT
        
        logger.info(f"[VALIDATE-TG] auth_date={auth_date}, age={age_seconds:.0f}s, env={app_settings.ENVIRONMENT}")
        
        if app_settings.ENVIRONMENT == "development":
            logger.info(f"[VALIDATE-TG] Dev mode: skipping auth_date validation")
        else:
            if age_seconds > max_age:
                debug["error"] = f"auth_date too old: {age_seconds:.0f}s > {max_age}s"
                _last_validation_debug = debug
                logger.warning(f"[VALIDATE-TG] FAIL: auth_date too old: {age_seconds:.0f}s > {max_age}s")
                return None
        
        # Step 1: Sort keys alphabetically and build data_check_string
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        debug["data_check_string_preview"] = data_check_string[:200]
        logger.info(f"[VALIDATE-TG] data_check_string (first 200 chars): {data_check_string[:200]}")
        
        # Step 2: secret_key = HMAC-SHA256(key="WebAppData", data=bot_token)
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        
        # Step 3: calculated_hash = HMAC-SHA256(key=secret_key, data=data_check_string)
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        debug["calculated_hash_prefix"] = calculated_hash[:16]
        logger.info(f"[VALIDATE-TG] Hash compare: calculated={calculated_hash[:16]}... received={received_hash[:16]}...")
        
        # Step 4: Constant-time comparison to prevent timing attacks
        if hmac.compare_digest(calculated_hash, received_hash):
            user_data = json.loads(parsed_data.get("user", "{}"))
            if not user_data.get("id"):
                debug["error"] = "user data missing 'id'"
                _last_validation_debug = debug
                logger.warning("[VALIDATE-TG] FAIL: user data missing 'id'")
                return None
            result = {
                "id": str(user_data.get("id")),
                "username": user_data.get("username"),
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name"),
                "language_code": user_data.get("language_code"),
                "is_premium": user_data.get("is_premium", False),
            }
            debug["status"] = "SUCCESS"
            debug["user_id"] = result["id"]
            _last_validation_debug = debug
            logger.info(f"[VALIDATE-TG] SUCCESS: user_id={result['id']}, username={result['username']}")
            return result
        
        debug["error"] = "hash mismatch"
        debug["status"] = "FAIL"
        _last_validation_debug = debug
        logger.warning("[VALIDATE-TG] FAIL: hash mismatch")
        return None
    except Exception as e:
        debug["error"] = str(e)
        debug["exception_type"] = type(e).__name__
        debug["status"] = "EXCEPTION"
        _last_validation_debug = debug
        logger.error(f"[VALIDATE-TG] EXCEPTION: {e}", exc_info=True)
        return None


# In-memory fallback for development/no-redis environments
_memory_otp = {}

def generate_otp() -> str:
    # FIX (SEC-002): 6 digits instead of 4 for better security
    return "".join(secrets.choice(string.digits) for _ in range(6))

async def save_otp(identifier: str, otp: str):
    # Try Redis if configured
    if redis_manager._configured:
        try:
            await redis_manager.set_value(f"otp:{identifier}", otp, expire=300)
            return # Success
        except Exception as e:
            logger.warning(f"Redis unavailable for OTP save ({e}), using memory callback.")
            
    # Fallback to memory (if Redis not configured OR failed)
    _memory_otp[identifier] = {
        "otp": otp,
        "expires": datetime.utcnow().timestamp() + 300
    }
    logger.info(f"OTP saved in memory for {identifier}")

async def verify_otp(identifier: str, otp: str) -> bool:
    # 1. Check Redis first (if configured)
    if redis_manager._configured:
        try:
            stored_otp = await redis_manager.get_value(f"otp:{identifier}")
            if stored_otp and hmac.compare_digest(stored_otp, otp):
                await redis_manager.delete(f"otp:{identifier}")
                return True
        except Exception as e:
             logger.warning(f"Redis unavailable for OTP verify ({e}), checking memory.")
             
    # 2. Check Memory (fallback)
    data = _memory_otp.get(identifier)
    if not data:
        return False
        
    if datetime.utcnow().timestamp() > data["expires"]:
             del _memory_otp[identifier]
             return False
             
    if hmac.compare_digest(data["otp"], otp):
        del _memory_otp[identifier]
        return True
    return False

async def send_otp_via_telegram(telegram_id: str, otp: str) -> bool:
    """
    Sends the OTP code to the user via Telegram Bot.
    """
    if not TELEGRAM_BOT_TOKEN:
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    message = f"🔐  Ваш код: {otp}\n⏱️  Код истекает через 5 минут."
    payload = {
        "chat_id": telegram_id,
        "text": message
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload) as resp:
                return resp.status == 200
        except Exception:
            return False


# --- FastAPI Dependency for getting current user ---

async def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token missing subject")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")


async def get_current_user_from_token(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token missing subject")
        
        async with async_session_maker() as session:
            try:
                uid = uuid_module.UUID(user_id)
            except ValueError:
                raise HTTPException(status_code=401, detail="Invalid user ID in token")
            
            result = await session.execute(select(User).where(User.id == uid))
            user = result.scalar_one_or_none()
            
            if user is None:
                raise HTTPException(status_code=401, detail="User not found")
            
            if user.status and str(user.status).lower() == "banned":
                raise HTTPException(status_code=401, detail="User is banned")
            
            return user
            
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")


async def get_current_admin(
    current_user: User = Depends(get_current_user_from_token),
) -> User:
    user_role = getattr(current_user, "role", "user")
    if user_role not in ("admin", "moderator"):
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    return current_user
