# Vercel Serverless API Entry Point
# ==================================
# MambaX Backend API for Vercel deployment
# Database: Neon PostgreSQL via asyncpg

import os
import ssl
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import parse_qsl, unquote
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, status, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from jose import JWTError, jwt
from passlib.context import CryptContext

# ============================================
# CONFIGURATION
# ============================================

DATABASE_URL = os.environ.get("DATABASE_URL", "")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production-32chars")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

# ============================================
# DATABASE SETUP
# ============================================

engine = None
async_session_maker = None

if DATABASE_URL:
    _async_url = DATABASE_URL
    if _async_url.startswith("postgres://"):
        _async_url = _async_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif _async_url.startswith("postgresql://") and "+asyncpg" not in _async_url:
        _async_url = _async_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    if "sslmode=" in _async_url:
        _async_url = _async_url.replace("sslmode=require", "ssl=require")
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    engine = create_async_engine(
        _async_url,
        echo=False,
        poolclass=NullPool,
        connect_args={
            "ssl": ssl_context,
            "timeout": 30,
            "command_timeout": 30,
        }
    )
    
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def get_db():
    if not async_session_maker:
        raise HTTPException(status_code=503, detail="Database not configured")
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# ============================================
# JWT & AUTH HELPERS
# ============================================

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": str(user_id), "exp": expire, "iat": datetime.utcnow()}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def validate_telegram_init_data(init_data: str) -> Optional[dict]:
    """Validate Telegram Mini App init data"""
    if not TELEGRAM_BOT_TOKEN:
        return None
    
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed.pop("hash", None)
        
        if not received_hash:
            return None
        
        # Create data check string
        data_check_arr = sorted([f"{k}={v}" for k, v in parsed.items()])
        data_check_string = "\n".join(data_check_arr)
        
        # Create secret key
        secret_key = hmac.new(
            b"WebAppData",
            TELEGRAM_BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if calculated_hash != received_hash:
            return None
        
        # Parse user data
        user_data = parsed.get("user")
        if user_data:
            return json.loads(unquote(user_data))
        
        return None
    except Exception:
        return None


async def get_current_user_id(
    authorization: str = Header(None),
) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth format")
        
        user_id = verify_token(parts[1])
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization")


# ============================================
# SCHEMAS
# ============================================

class TelegramLoginRequest(BaseModel):
    init_data: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    has_profile: bool = False


class UserProfile(BaseModel):
    id: str
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    photos: list = []
    interests: list = []
    is_vip: bool = False
    is_complete: bool = False
    stars_balance: int = 0


class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[list] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SwipeRequest(BaseModel):
    to_user_id: str
    action: str = Field(..., pattern="^(like|dislike|superlike)$")


class SwipeResponse(BaseModel):
    success: bool
    is_match: bool


class SendMessageRequest(BaseModel):
    text: str


# ============================================
# APP SETUP
# ============================================

app = FastAPI(
    title="MambaX API",
    description="Backend API for MambaX Dating Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# HEALTH ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {"status": "ok", "message": "MambaX Backend is running on Vercel"}


@app.get("/health")
async def health_check():
    response = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "database": "not_configured"
    }
    
    if engine:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            response["database"] = "connected"
        except Exception as e:
            response["database"] = f"error: {str(e)[:50]}"
            response["status"] = "degraded"
    
    return response


@app.get("/ping")
async def ping():
    return {"pong": True}


# ============================================
# AUTH ENDPOINTS
# ============================================

@app.post("/api/auth/telegram", response_model=TokenResponse)
async def login_telegram(
    data: TelegramLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login via Telegram Mini App"""
    if not data.init_data or not data.init_data.strip():
        raise HTTPException(status_code=401, detail="Empty Telegram data")
    
    auth_data = validate_telegram_init_data(data.init_data)
    
    if not auth_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram data")
    
    telegram_id = str(auth_data["id"])
    username = auth_data.get("username")
    first_name = auth_data.get("first_name", "User")
    
    # Find or create user
    result = await db.execute(
        text("SELECT id, is_complete FROM users WHERE telegram_id = :tg_id"),
        {"tg_id": telegram_id}
    )
    user = result.fetchone()
    
    if user:
        user_id = str(user[0])
        has_profile = user[1] or False
    else:
        # Create new user
        result = await db.execute(
            text("""
                INSERT INTO users (telegram_id, username, name, age, gender, is_active, is_complete, created_at)
                VALUES (:tg_id, :username, :name, 18, 'other', true, false, NOW())
                RETURNING id
            """),
            {"tg_id": telegram_id, "username": username or f"user_{telegram_id}", "name": first_name}
        )
        await db.commit()
        user_id = str(result.fetchone()[0])
        has_profile = False
    
    access_token = create_access_token(user_id)
    return TokenResponse(access_token=access_token, has_profile=has_profile)


# ============================================
# USER ENDPOINTS
# ============================================

@app.get("/api/users/me", response_model=UserProfile)
async def get_current_user(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get current user profile"""
    result = await db.execute(
        text("""
            SELECT id, name, age, gender, bio, photos, interests, is_vip, is_complete, stars_balance
            FROM users WHERE id = :user_id
        """),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(
        id=str(user[0]),
        name=user[1],
        age=user[2],
        gender=user[3],
        bio=user[4],
        photos=user[5] or [],
        interests=user[6] or [],
        is_vip=user[7] or False,
        is_complete=user[8] or False,
        stars_balance=user[9] or 0
    )


@app.put("/api/users/me", response_model=UserProfile)
async def update_current_user(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Update current user profile"""
    updates = []
    params = {"user_id": user_id}
    
    if data.name is not None:
        updates.append("name = :name")
        params["name"] = data.name
    if data.age is not None:
        updates.append("age = :age")
        params["age"] = data.age
    if data.gender is not None:
        updates.append("gender = :gender")
        params["gender"] = data.gender
    if data.bio is not None:
        updates.append("bio = :bio")
        params["bio"] = data.bio
    if data.interests is not None:
        updates.append("interests = :interests")
        params["interests"] = data.interests
    if data.latitude is not None:
        updates.append("latitude = :latitude")
        params["latitude"] = data.latitude
    if data.longitude is not None:
        updates.append("longitude = :longitude")
        params["longitude"] = data.longitude
    
    # Check if profile is complete
    updates.append("is_complete = (name IS NOT NULL AND age IS NOT NULL AND age >= 18)")
    
    if updates:
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = :user_id"
        await db.execute(text(query), params)
        await db.commit()
    
    return await get_current_user(db, user_id)


@app.get("/api/users/{user_id}")
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get another user's public profile"""
    result = await db.execute(
        text("""
            SELECT id, name, age, gender, bio, photos, interests, is_vip
            FROM users WHERE id = :user_id AND is_active = true
        """),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": str(user[0]),
        "name": user[1],
        "age": user[2],
        "gender": user[3],
        "bio": user[4],
        "photos": user[5] or [],
        "interests": user[6] or [],
        "is_vip": user[7] or False
    }


# ============================================
# DISCOVERY ENDPOINTS
# ============================================

@app.get("/api/discovery/profiles")
async def get_discovery_profiles(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get profiles for discovery feed (excluding already swiped)"""
    result = await db.execute(text("""
        SELECT 
            u.id::text, u.name, u.age, u.bio, u.photos, u.gender, u.is_vip, u.interests
        FROM users u
        WHERE u.is_active = true 
        AND u.id != :current_user_id
        AND u.photos IS NOT NULL 
        AND array_length(u.photos, 1) > 0
        AND u.id NOT IN (
            SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id
        )
        ORDER BY RANDOM() 
        LIMIT :limit
    """), {"current_user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    profiles = []
    for row in rows:
        profiles.append({
            "id": row[0],
            "name": row[1],
            "age": row[2],
            "bio": row[3],
            "photos": row[4] or [],
            "gender": row[5],
            "is_vip": row[6] or False,
            "interests": row[7] or []
        })
    
    return {"profiles": profiles, "total": len(profiles)}


# ============================================
# INTERACTION ENDPOINTS
# ============================================

@app.post("/api/swipe", response_model=SwipeResponse)
async def swipe(
    data: SwipeRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Process a swipe (like/dislike/superlike)"""
    # Check if already swiped
    existing = await db.execute(
        text("SELECT id FROM swipes WHERE from_user_id = :from_id AND to_user_id = :to_id"),
        {"from_id": current_user_id, "to_id": data.to_user_id}
    )
    
    if existing.fetchone():
        # Check if already matched
        match_result = await db.execute(
            text("""
                SELECT id FROM matches 
                WHERE (user1_id = :u1 AND user2_id = :u2) OR (user1_id = :u2 AND user2_id = :u1)
            """),
            {"u1": current_user_id, "u2": data.to_user_id}
        )
        return SwipeResponse(success=True, is_match=match_result.fetchone() is not None)
    
    # Create swipe
    await db.execute(
        text("""
            INSERT INTO swipes (from_user_id, to_user_id, action, timestamp)
            VALUES (:from_id, :to_id, :action, NOW())
        """),
        {"from_id": current_user_id, "to_id": data.to_user_id, "action": data.action}
    )
    
    is_match = False
    
    # Check for mutual like
    if data.action in ("like", "superlike"):
        mutual = await db.execute(
            text("""
                SELECT id FROM swipes 
                WHERE from_user_id = :to_id AND to_user_id = :from_id AND action IN ('like', 'superlike')
            """),
            {"from_id": current_user_id, "to_id": data.to_user_id}
        )
        
        if mutual.fetchone():
            # Create match
            await db.execute(
                text("""
                    INSERT INTO matches (user1_id, user2_id, created_at, is_active)
                    VALUES (:u1, :u2, NOW(), true)
                """),
                {"u1": current_user_id, "u2": data.to_user_id}
            )
            is_match = True
    
    await db.commit()
    return SwipeResponse(success=True, is_match=is_match)


@app.get("/api/matches")
async def get_matches(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's matches with partner info"""
    result = await db.execute(text("""
        SELECT 
            m.id::text,
            m.user1_id::text,
            m.user2_id::text,
            m.created_at,
            CASE 
                WHEN m.user1_id = :user_id THEN u2.id::text
                ELSE u1.id::text
            END as partner_id,
            CASE 
                WHEN m.user1_id = :user_id THEN u2.name
                ELSE u1.name
            END as partner_name,
            CASE 
                WHEN m.user1_id = :user_id THEN u2.photos
                ELSE u1.photos
            END as partner_photos
        FROM matches m
        JOIN users u1 ON m.user1_id = u1.id
        JOIN users u2 ON m.user2_id = u2.id
        WHERE (m.user1_id = :user_id OR m.user2_id = :user_id)
        AND m.is_active = true
        ORDER BY m.created_at DESC
    """), {"user_id": current_user_id})
    
    rows = result.fetchall()
    
    matches = []
    for row in rows:
        matches.append({
            "id": row[0],
            "user1_id": row[1],
            "user2_id": row[2],
            "created_at": row[3].isoformat() if row[3] else None,
            "user": {
                "id": row[4],
                "name": row[5],
                "photos": row[6] or []
            }
        })
    
    return matches


@app.get("/api/matches/{match_id}")
async def get_match(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get single match details"""
    result = await db.execute(text("""
        SELECT 
            m.id::text,
            m.user1_id::text,
            m.user2_id::text,
            m.created_at,
            CASE 
                WHEN m.user1_id = :user_id THEN u2.id::text
                ELSE u1.id::text
            END as partner_id,
            CASE 
                WHEN m.user1_id = :user_id THEN u2.name
                ELSE u1.name
            END as partner_name,
            CASE 
                WHEN m.user1_id = :user_id THEN u2.photos
                ELSE u1.photos
            END as partner_photos,
            CASE 
                WHEN m.user1_id = :user_id THEN u2.age
                ELSE u1.age
            END as partner_age
        FROM matches m
        JOIN users u1 ON m.user1_id = u1.id
        JOIN users u2 ON m.user2_id = u2.id
        WHERE m.id = :match_id
        AND (m.user1_id = :user_id OR m.user2_id = :user_id)
    """), {"match_id": match_id, "user_id": current_user_id})
    
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")
    
    return {
        "id": row[0],
        "user1_id": row[1],
        "user2_id": row[2],
        "created_at": row[3].isoformat() if row[3] else None,
        "user": {
            "id": row[4],
            "name": row[5],
            "photos": row[6] or [],
            "age": row[7]
        }
    }


# ============================================
# CHAT ENDPOINTS
# ============================================

@app.get("/api/matches/{match_id}/messages")
async def get_messages(
    match_id: str,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get messages for a match"""
    # Verify user belongs to match
    match_check = await db.execute(
        text("""
            SELECT id FROM matches 
            WHERE id = :match_id AND (user1_id = :user_id OR user2_id = :user_id)
        """),
        {"match_id": match_id, "user_id": current_user_id}
    )
    
    if not match_check.fetchone():
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.execute(text("""
        SELECT 
            id::text, match_id::text, sender_id::text, receiver_id::text,
            text, type, audio_url, photo_url, duration, created_at, is_read
        FROM messages
        WHERE match_id = :match_id
        ORDER BY created_at ASC
        LIMIT :limit
    """), {"match_id": match_id, "limit": limit})
    
    rows = result.fetchall()
    
    messages = []
    for row in rows:
        messages.append({
            "id": row[0],
            "match_id": row[1],
            "sender_id": row[2],
            "receiver_id": row[3],
            "text": row[4],
            "content": row[4],
            "type": row[5] or "text",
            "audio_url": row[6],
            "photo_url": row[7],
            "duration": row[8],
            "created_at": row[9].isoformat() if row[9] else None,
            "is_read": row[10] or False
        })
    
    return messages


@app.post("/api/matches/{match_id}/messages")
async def send_message(
    match_id: str,
    data: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Send a message in a match"""
    # Get match and determine receiver
    result = await db.execute(
        text("""
            SELECT user1_id::text, user2_id::text FROM matches 
            WHERE id = :match_id AND (user1_id = :user_id OR user2_id = :user_id)
        """),
        {"match_id": match_id, "user_id": current_user_id}
    )
    
    match = result.fetchone()
    if not match:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    receiver_id = match[1] if match[0] == current_user_id else match[0]
    
    # Insert message
    result = await db.execute(
        text("""
            INSERT INTO messages (match_id, sender_id, receiver_id, text, type, created_at, is_read)
            VALUES (:match_id, :sender_id, :receiver_id, :text, 'text', NOW(), false)
            RETURNING id::text, created_at
        """),
        {"match_id": match_id, "sender_id": current_user_id, "receiver_id": receiver_id, "text": data.text}
    )
    
    await db.commit()
    row = result.fetchone()
    
    return {
        "id": row[0],
        "match_id": match_id,
        "sender_id": current_user_id,
        "receiver_id": receiver_id,
        "text": data.text,
        "type": "text",
        "created_at": row[1].isoformat() if row[1] else None,
        "is_read": False
    }


# ============================================
# LIKES ENDPOINTS
# ============================================

@app.get("/api/likes/received")
async def get_received_likes(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get users who liked current user"""
    result = await db.execute(text("""
        SELECT 
            s.from_user_id::text,
            s.action,
            s.timestamp,
            u.name,
            u.age,
            u.photos
        FROM swipes s
        JOIN users u ON s.from_user_id = u.id
        WHERE s.to_user_id = :user_id 
        AND s.action IN ('like', 'superlike')
        AND u.is_active = true
        ORDER BY s.timestamp DESC
        LIMIT 50
    """), {"user_id": current_user_id})
    
    rows = result.fetchall()
    
    likes = []
    for row in rows:
        likes.append({
            "id": row[0],
            "isSuper": row[1] == "superlike",
            "likedAt": row[2].isoformat() if row[2] else None,
            "name": row[3],
            "age": row[4],
            "photos": row[5] or []
        })
    
    return {"likes": likes, "total": len(likes)}


@app.get("/api/likes/count")
async def get_likes_count(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get count of received likes"""
    result = await db.execute(
        text("""
            SELECT COUNT(*) FROM swipes 
            WHERE to_user_id = :user_id AND action IN ('like', 'superlike')
        """),
        {"user_id": current_user_id}
    )
    
    count = result.scalar() or 0
    return {"count": count}


# ============================================
# STATS ENDPOINTS
# ============================================

@app.get("/api/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Get platform statistics"""
    users_result = await db.execute(text("SELECT COUNT(*) FROM users WHERE is_active = true"))
    matches_result = await db.execute(text("SELECT COUNT(*) FROM matches WHERE is_active = true"))
    
    return {
        "users": users_result.scalar() or 0,
        "matches": matches_result.scalar() or 0
    }


# Vercel handler
handler = app
