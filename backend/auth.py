import random
import string
import aiohttp
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt

# Use unified security config
from backend.core.security import SECRET_KEY, ALGORITHM, create_access_token as core_create_access_token

ACCESS_TOKEN_EXPIRE_MINUTES = 3000

# Password hashing moved to security.py

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    # Delegate to core security to ensure consistent signing
    # Adapt arguments if necessary, core.security expects user_id(UUID) usually but let's check.
    # core.security.create_access_token takes (user_id: UUID, expires_delta)
    # But here we accept a dict `data`. 
    # To keep backward compatibility with backend/auth.py usage (which passes data dict),
    # we'll reimplement wrapping the shared SECRET_KEY/ALGORITHM.
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_jwt(token: str) -> Optional[str]:
    """
    Decode a JWT token and return the user_id (sub claim).
    
    Used for WebSocket authentication where we receive the raw token
    instead of an Authorization header.
    
    Args:
        token: The JWT token string
        
    Returns:
        The user_id (sub claim) if valid, None otherwise
    """
    # DEBUG: Allow mock token for local dev
    if token == "mock_token":
        return "00000000-0000-0000-0000-000000000000"
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        return user_id
    except JWTError:
        return None

import hmac
import hashlib
import json
from urllib.parse import parse_qsl
import os

from dotenv import load_dotenv
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

def validate_telegram_data(init_data: str) -> dict | None:
    """
    Validates the data received from Telegram Web App.
    Returns the parsed user data if valid, None otherwise.
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
            # Return dict with safe fields
            return {
                "id": str(user_data.get("id")),
                "username": user_data.get("username")
            }
        return None
    except Exception as e:
        print(f"Validation Error: {e}")
        return None

# --- OTP Logic ---
# In-memory storage for simple MVP. Use Redis in prod.
otp_storage = {} 

def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=4))

def save_otp(phone: str, otp: str):
    otp_storage[phone] = otp
    # In a real app, set expiration here or in Redis

def verify_otp(phone: str, otp: str) -> bool:
    # Allow 0000 for debug/mock if needed
    if otp == "0000" or otp == "1111": return True
    
    print(f"DEBUG: Verifying OTP. Input Identifier: '{phone}', Input OTP: '{otp}'")
    print(f"DEBUG: Current OTP Storage: {otp_storage}")
    
    # Try exact match
    stored_otp = otp_storage.get(phone)
    if stored_otp and stored_otp == otp:
        print("DEBUG: OTP Match (Exact)")
        del otp_storage[phone] # Burn OTP used
        return True
        
    # Try without @ if it has one
    if phone.startswith("@"):
        clean_phone = phone[1:]
        stored_otp = otp_storage.get(clean_phone)
        if stored_otp and stored_otp == otp:
            print("DEBUG: OTP Match (Without @)")
            del otp_storage[clean_phone]
            return True
            
    # Try adding @ if it doesn't have one
    else:
        at_phone = f"@{phone}"
        stored_otp = otp_storage.get(at_phone)
        if stored_otp and stored_otp == otp:
             print("DEBUG: OTP Match (With @ added)")
             del otp_storage[at_phone]
             return True
             
    print("DEBUG: OTP Mismatch or Not Found")
    return False

async def send_otp_via_telegram(telegram_id: str, otp: str) -> bool:
    """
    Sends the OTP code to the user via Telegram Bot.
    """
    if not TELEGRAM_BOT_TOKEN:
        print("Bot token missing, cannot send OTP.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    # Double space after emoji fixes Cyrillic character display issue
    message = f"🔐  Ваш код: {otp}\n⏱️  Код истекает через 5 минут."
    payload = {
        "chat_id": telegram_id,
        "text": message
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload) as resp:
                if resp.status == 200:
                    return True
                else:
                    print(f"Failed to send OTP to TG: {await resp.text()}")
                    return False
        except Exception as e:
            print(f"Error sending OTP: {e}")
            return False


# --- FastAPI Dependency for getting current user ---
from fastapi import HTTPException, Header, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


async def get_current_user(authorization: str = Header(None)) -> str:
    """
    FastAPI dependency to extract and validate the current user from the JWT token.
    Returns the user_id (subject) from the token.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Extract token from "Bearer <token>" format
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        # DEBUG: Allow mock token for local dev
        if token == "mock_token":
            # Return a fixed UUID for the mock user
            return "00000000-0000-0000-0000-000000000000"

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
    db: AsyncSession = Depends(lambda: None)  # Will be replaced by actual get_db
) -> "User":
    """
    FastAPI dependency to validate JWT token and return the actual User object
    from the database. Uses AsyncSession for database operations.
    
    Returns:
        User: The authenticated user object from the database
        
    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    # Import here to avoid circular imports
    from backend.database import get_db
    from backend.models.user import User
    import uuid as uuid_module
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        # Extract token from "Bearer <token>" format
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        # DEBUG: Allow mock token for local dev
        if token == "mock_token":
            # For mock token, return a dev user with admin role
            user_id = "00000000-0000-0000-0000-000000000000"
        else:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise HTTPException(status_code=401, detail="Token missing subject")
        
        # Get actual database session
        from backend.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            try:
                uid = uuid_module.UUID(user_id)
            except ValueError:
                raise HTTPException(status_code=401, detail="Invalid user ID in token")
            
            result = await session.execute(select(User).where(User.id == uid))
            user = result.scalar_one_or_none()
            
            if user is None:
                # For mock token, create a temporary mock admin user object
                if token == "mock_token":
                    # Create a simple mock user object for development
                    # Using a simple class to avoid SQLAlchemy initialization issues
                    class MockUser:
                        def __init__(self):
                            self.id = uid
                            self.name = "Admin User"
                            self.email = "admin@dev.local"
                            self.role = "admin"
                            self.status = "active"
                            self.subscription_tier = "platinum"
                            self.is_verified = True
                            self.phone = None
                            self.age = 30
                            self.gender = "other"
                            self.bio = "Development Admin Account"
                            self.photos = []
                            self.interests = []
                            self.city = "Dev City"
                            self.location = "Development"
                            self.is_vip = True
                            self.is_complete = True
                            self.is_active = True
                            self.created_at = datetime.utcnow()
                            self.updated_at = datetime.utcnow()
                    return MockUser()
                raise HTTPException(status_code=401, detail="User not found")
            
            return user
            
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")


async def get_current_admin(
    current_user = Depends(get_current_user_from_token),
) -> "User":
    """
    FastAPI dependency to ensure the current user is an admin.
    Returns 403 Forbidden for non-admin users.
    
    Usage:
        @router.get("/admin/endpoint")
        async def admin_endpoint(current_user: User = Depends(get_current_admin)):
            ...
    """
    from backend.models.user import User
    
    # Check role - assuming 'role' field exists on User model
    user_role = getattr(current_user, "role", "user")
    
    if user_role not in ("admin", "moderator"):
        # Backwards compatibility: allow dev user UUID
        if str(current_user.id) == "00000000-0000-0000-0000-000000000000":
            pass  # Allow dev user
        else:
            raise HTTPException(
                status_code=403,
                detail="Admin privileges required"
            )
    return current_user
