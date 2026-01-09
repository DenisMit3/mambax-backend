import random
import string
import aiohttp
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt

# Secret settings
SECRET_KEY = "supersecretkey123" # Move to env in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

# Password hashing moved to security.py

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

import hmac
import hashlib
import json
from urllib.parse import parse_qsl
import os

from dotenv import load_dotenv
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN:
    # Fallback for dev/demo only - REMOVE IN PRODUCTION
    print("WARNING: TELEGRAM_BOT_TOKEN not set in .env, using fallback.")
    TELEGRAM_BOT_TOKEN = "8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E"

def validate_telegram_data(init_data: str) -> dict | None:
    """
    Validates the data received from Telegram Web App.
    Returns the parsed user data if valid, None otherwise.
    """
    try:
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
    
    stored_otp = otp_storage.get(phone)
    if stored_otp and stored_otp == otp:
        del otp_storage[phone] # Burn OTP used
        return True
    return False

async def send_otp_via_telegram(telegram_id: str, otp: str) -> bool:
    """
    Sends the OTP code to the user via Telegram Bot.
    """
    if not TELEGRAM_BOT_TOKEN:
        print("Bot token missing, cannot send OTP.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": telegram_id,
        "text": f"Your Login Code: {otp}"
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
from fastapi import HTTPException, Header

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

