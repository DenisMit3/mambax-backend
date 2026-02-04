import random
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
from backend.core.redis import redis_manager
from backend.db.session import get_db, async_session_maker

# Models
from backend.models.user import User

ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
TELEGRAM_BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN
logger = logging.getLogger(__name__)



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
    """
    try:
        if not TELEGRAM_BOT_TOKEN:
             raise ValueError("TELEGRAM_BOT_TOKEN not configured")
        
        parsed_data = dict(parse_qsl(init_data))
        if "hash" not in parsed_data:
            return None

        received_hash = parsed_data.pop("hash")
        
        # Sort keys alphabetically
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        
        # Calculate HMAC-SHA256
        secret_key = hmac.new(b"WebAppData", TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash == received_hash:
            user_data = json.loads(parsed_data["user"])
            return {
                "id": str(user_data.get("id")),
                "username": user_data.get("username")
            }
        return None
    except Exception as e:
        logger.error(f"Validation Error: {e}")
        return None


# In-memory fallback for development/no-redis environments
_memory_otp = {}

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=4))

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
            if stored_otp and stored_otp == otp:
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
             
    if data["otp"] == otp:
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
