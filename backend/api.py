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


# ============================================
# ONBOARDING ENDPOINTS
# ============================================

class OnboardingStepRequest(BaseModel):
    step_name: str
    completed: bool = True


@app.post("/api/onboarding/complete-step")
async def complete_onboarding_step(
    data: OnboardingStepRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark onboarding step as completed"""
    # Get current steps
    result = await db.execute(
        text("SELECT onboarding_completed_steps FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    steps = row[0] if row and row[0] else {}
    
    # Update step
    steps[data.step_name] = data.completed
    
    # Save
    await db.execute(
        text("UPDATE users SET onboarding_completed_steps = :steps WHERE id = :user_id"),
        {"steps": json.dumps(steps), "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "step": data.step_name, "completed": data.completed, "all_steps": steps}


@app.get("/api/onboarding/status")
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get onboarding progress"""
    result = await db.execute(
        text("SELECT onboarding_completed_steps FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    steps = row[0] if row and row[0] else {}
    
    required_steps = [
        "interactive_tour_completed",
        "first_swipe_done",
        "first_filter_opened",
        "profile_completion_prompted"
    ]
    
    is_complete = all(steps.get(key) for key in required_steps) if steps else False
    
    return {
        "completed_steps": steps,
        "is_onboarding_complete": is_complete
    }


@app.post("/api/onboarding/reset")
async def reset_onboarding(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Reset onboarding progress"""
    empty_steps = {
        "interactive_tour_completed": False,
        "first_swipe_done": False,
        "first_filter_opened": False,
        "profile_completion_prompted": False
    }
    
    await db.execute(
        text("UPDATE users SET onboarding_completed_steps = :steps WHERE id = :user_id"),
        {"steps": json.dumps(empty_steps), "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "message": "Onboarding reset successfully"}


# ============================================
# SAFETY ENDPOINTS (Block & Report)
# ============================================

class BlockRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None


class ReportRequest(BaseModel):
    user_id: str
    reason: str
    description: Optional[str] = None


@app.post("/api/safety/block")
async def block_user(
    data: BlockRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Block a user"""
    if data.user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Check if already blocked
    existing = await db.execute(
        text("SELECT id FROM blocks WHERE blocker_id = :blocker AND blocked_id = :blocked"),
        {"blocker": current_user_id, "blocked": data.user_id}
    )
    
    if existing.fetchone():
        return {"success": True, "message": "User already blocked"}
    
    # Create block
    await db.execute(
        text("""
            INSERT INTO blocks (blocker_id, blocked_id, reason, created_at)
            VALUES (:blocker, :blocked, :reason, NOW())
        """),
        {"blocker": current_user_id, "blocked": data.user_id, "reason": data.reason}
    )
    await db.commit()
    
    return {"success": True, "message": "User blocked"}


@app.delete("/api/safety/block/{user_id}")
async def unblock_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Unblock a user"""
    await db.execute(
        text("DELETE FROM blocks WHERE blocker_id = :blocker AND blocked_id = :blocked"),
        {"blocker": current_user_id, "blocked": user_id}
    )
    await db.commit()
    
    return {"success": True, "message": "User unblocked"}


@app.get("/api/safety/blocked")
async def get_blocked_users(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get list of blocked users"""
    result = await db.execute(text("""
        SELECT b.blocked_id::text, b.reason, b.created_at, u.name, u.photos
        FROM blocks b
        JOIN users u ON b.blocked_id = u.id
        WHERE b.blocker_id = :user_id
        ORDER BY b.created_at DESC
    """), {"user_id": current_user_id})
    
    rows = result.fetchall()
    
    blocked = []
    for row in rows:
        blocked.append({
            "id": row[0],
            "reason": row[1],
            "blocked_at": row[2].isoformat() if row[2] else None,
            "name": row[3],
            "photo": row[4][0] if row[4] else None
        })
    
    return {"blocked": blocked, "total": len(blocked)}


@app.post("/api/safety/report")
async def report_user(
    data: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Report a user"""
    if data.user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    
    result = await db.execute(
        text("""
            INSERT INTO reports (reporter_id, reported_user_id, reason, description, status, created_at)
            VALUES (:reporter, :reported, :reason, :description, 'pending', NOW())
            RETURNING id::text
        """),
        {
            "reporter": current_user_id,
            "reported": data.user_id,
            "reason": data.reason,
            "description": data.description
        }
    )
    await db.commit()
    
    report_id = result.fetchone()[0]
    
    return {"success": True, "report_id": report_id, "message": "Report submitted"}


# ============================================
# GIFTS ENDPOINTS
# ============================================

@app.get("/api/gifts/catalog")
async def get_gift_catalog(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get available virtual gifts"""
    # Get categories
    cat_result = await db.execute(text("""
        SELECT id::text, name, description, icon, sort_order
        FROM gift_categories
        WHERE is_active = true
        ORDER BY sort_order
    """))
    categories = [
        {"id": r[0], "name": r[1], "description": r[2], "icon": r[3], "sort_order": r[4]}
        for r in cat_result.fetchall()
    ]
    
    # Get gifts
    gift_result = await db.execute(text("""
        SELECT 
            id::text, name, description, image_url, animation_url,
            price, currency, is_animated, is_premium, is_limited,
            category_id::text, times_sent
        FROM virtual_gifts
        WHERE is_active = true
        AND (available_until IS NULL OR available_until > NOW())
        ORDER BY sort_order, price
    """))
    
    gifts = []
    for r in gift_result.fetchall():
        gifts.append({
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "image_url": r[3],
            "animation_url": r[4],
            "price": float(r[5]),
            "currency": r[6],
            "is_animated": r[7],
            "is_premium": r[8],
            "is_limited": r[9],
            "category_id": r[10],
            "times_sent": r[11]
        })
    
    return {"categories": categories, "gifts": gifts, "total_gifts": len(gifts)}


class SendGiftRequest(BaseModel):
    gift_id: str
    receiver_id: str
    message: Optional[str] = None
    is_anonymous: bool = False


@app.post("/api/gifts/send")
async def send_gift(
    data: SendGiftRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Send a virtual gift to another user"""
    if data.receiver_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot send gift to yourself")
    
    # Get gift
    gift_result = await db.execute(
        text("SELECT id, name, price, currency, is_active FROM virtual_gifts WHERE id = :gift_id"),
        {"gift_id": data.gift_id}
    )
    gift = gift_result.fetchone()
    
    if not gift or not gift[4]:
        raise HTTPException(status_code=404, detail="Gift not found")
    
    gift_price = float(gift[2])
    
    # Check sender balance
    balance_result = await db.execute(
        text("SELECT stars_balance FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    balance = balance_result.fetchone()
    current_balance = float(balance[0]) if balance and balance[0] else 0
    
    if current_balance < gift_price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: {gift_price}, Available: {current_balance}"
        )
    
    # Deduct from sender
    await db.execute(
        text("UPDATE users SET stars_balance = stars_balance - :price WHERE id = :user_id"),
        {"price": gift_price, "user_id": current_user_id}
    )
    
    # Add 10% bonus to receiver
    receiver_bonus = int(gift_price * 0.1)
    if receiver_bonus > 0:
        await db.execute(
            text("UPDATE users SET stars_balance = COALESCE(stars_balance, 0) + :bonus WHERE id = :user_id"),
            {"bonus": receiver_bonus, "user_id": data.receiver_id}
        )
    
    # Create transaction
    result = await db.execute(
        text("""
            INSERT INTO gift_transactions 
            (sender_id, receiver_id, gift_id, price_paid, currency, message, is_anonymous, status, created_at)
            VALUES (:sender, :receiver, :gift_id, :price, :currency, :message, :is_anonymous, 'completed', NOW())
            RETURNING id::text, created_at
        """),
        {
            "sender": current_user_id,
            "receiver": data.receiver_id,
            "gift_id": data.gift_id,
            "price": gift_price,
            "currency": gift[3],
            "message": data.message,
            "is_anonymous": data.is_anonymous
        }
    )
    
    # Update gift stats
    await db.execute(
        text("UPDATE virtual_gifts SET times_sent = times_sent + 1 WHERE id = :gift_id"),
        {"gift_id": data.gift_id}
    )
    
    await db.commit()
    row = result.fetchone()
    
    return {
        "success": True,
        "transaction_id": row[0],
        "gift_name": gift[1],
        "price_paid": gift_price,
        "receiver_bonus": receiver_bonus,
        "created_at": row[1].isoformat() if row[1] else None
    }


@app.get("/api/gifts/received")
async def get_received_gifts(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get gifts received by current user"""
    result = await db.execute(text("""
        SELECT 
            gt.id::text, gt.sender_id::text, gt.gift_id::text, gt.price_paid,
            gt.message, gt.is_anonymous, gt.is_read, gt.created_at,
            g.name as gift_name, g.image_url,
            u.name as sender_name, u.photos as sender_photos
        FROM gift_transactions gt
        JOIN virtual_gifts g ON gt.gift_id = g.id
        LEFT JOIN users u ON gt.sender_id = u.id
        WHERE gt.receiver_id = :user_id
        ORDER BY gt.created_at DESC
        LIMIT :limit
    """), {"user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    gifts = []
    for r in rows:
        gifts.append({
            "id": r[0],
            "sender_id": None if r[5] else r[1],  # Hide if anonymous
            "gift_id": r[2],
            "price_paid": float(r[3]),
            "message": r[4],
            "is_anonymous": r[5],
            "is_read": r[6],
            "created_at": r[7].isoformat() if r[7] else None,
            "gift_name": r[8],
            "gift_image": r[9],
            "sender_name": "Anonymous" if r[5] else r[10],
            "sender_photo": None if r[5] else (r[11][0] if r[11] else None)
        })
    
    # Get unread count
    unread_result = await db.execute(
        text("SELECT COUNT(*) FROM gift_transactions WHERE receiver_id = :user_id AND is_read = false"),
        {"user_id": current_user_id}
    )
    unread_count = unread_result.scalar() or 0
    
    return {"gifts": gifts, "total": len(gifts), "unread_count": unread_count}


@app.get("/api/gifts/sent")
async def get_sent_gifts(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get gifts sent by current user"""
    result = await db.execute(text("""
        SELECT 
            gt.id::text, gt.receiver_id::text, gt.gift_id::text, gt.price_paid,
            gt.message, gt.is_anonymous, gt.created_at,
            g.name as gift_name, g.image_url,
            u.name as receiver_name, u.photos as receiver_photos
        FROM gift_transactions gt
        JOIN virtual_gifts g ON gt.gift_id = g.id
        JOIN users u ON gt.receiver_id = u.id
        WHERE gt.sender_id = :user_id
        ORDER BY gt.created_at DESC
        LIMIT :limit
    """), {"user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    gifts = []
    for r in rows:
        gifts.append({
            "id": r[0],
            "receiver_id": r[1],
            "gift_id": r[2],
            "price_paid": float(r[3]),
            "message": r[4],
            "is_anonymous": r[5],
            "created_at": r[6].isoformat() if r[6] else None,
            "gift_name": r[7],
            "gift_image": r[8],
            "receiver_name": r[9],
            "receiver_photo": r[10][0] if r[10] else None
        })
    
    # Get total spent
    spent_result = await db.execute(
        text("SELECT COALESCE(SUM(price_paid), 0) FROM gift_transactions WHERE sender_id = :user_id"),
        {"user_id": current_user_id}
    )
    total_spent = float(spent_result.scalar() or 0)
    
    return {"gifts": gifts, "total": len(gifts), "total_spent": total_spent}


# ============================================
# UX SETTINGS ENDPOINTS
# ============================================

class UXPreferencesUpdate(BaseModel):
    sounds_enabled: Optional[bool] = None
    haptic_enabled: Optional[bool] = None
    reduced_motion: Optional[bool] = None


@app.get("/api/settings/ux")
async def get_ux_settings(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get UX preferences"""
    result = await db.execute(
        text("SELECT ux_preferences FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    defaults = {
        "sounds_enabled": True,
        "haptic_enabled": True,
        "reduced_motion": False
    }
    
    prefs = row[0] if row and row[0] else {}
    return {**defaults, **prefs}


@app.put("/api/settings/ux")
async def update_ux_settings(
    data: UXPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update UX preferences"""
    # Get current
    result = await db.execute(
        text("SELECT ux_preferences FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    prefs = row[0] if row and row[0] else {}
    
    # Update
    update_data = data.model_dump(exclude_unset=True)
    prefs.update(update_data)
    
    # Save
    await db.execute(
        text("UPDATE users SET ux_preferences = :prefs WHERE id = :user_id"),
        {"prefs": json.dumps(prefs), "user_id": current_user_id}
    )
    await db.commit()
    
    return prefs


# ============================================
# VISIBILITY SETTINGS
# ============================================

class VisibilitySettings(BaseModel):
    show_online_status: Optional[bool] = None
    show_last_seen: Optional[bool] = None
    show_distance: Optional[bool] = None
    show_age: Optional[bool] = None
    read_receipts: Optional[bool] = None


@app.get("/api/settings/visibility")
async def get_visibility_settings(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get visibility settings"""
    result = await db.execute(
        text("SELECT visibility_settings FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    defaults = {
        "show_online_status": True,
        "show_last_seen": True,
        "show_distance": True,
        "show_age": True,
        "read_receipts": True
    }
    
    settings = row[0] if row and row[0] else {}
    return {**defaults, **settings}


@app.put("/api/settings/visibility")
async def update_visibility_settings(
    data: VisibilitySettings,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update visibility settings"""
    result = await db.execute(
        text("SELECT visibility_settings FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    settings = row[0] if row and row[0] else {}
    
    update_data = data.model_dump(exclude_unset=True)
    settings.update(update_data)
    
    await db.execute(
        text("UPDATE users SET visibility_settings = :settings WHERE id = :user_id"),
        {"settings": json.dumps(settings), "user_id": current_user_id}
    )
    await db.commit()
    
    return settings


# ============================================
# BALANCE & PAYMENTS
# ============================================

@app.get("/api/balance")
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's stars balance"""
    result = await db.execute(
        text("SELECT stars_balance, is_vip, subscription_tier FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    return {
        "stars_balance": float(row[0]) if row and row[0] else 0,
        "is_vip": row[1] if row else False,
        "subscription_tier": row[2] if row else "free"
    }


@app.get("/api/pricing")
async def get_pricing():
    """Get current pricing for features"""
    return {
        "swipe_pack": {"price": 10, "count": 10, "currency": "XTR"},
        "superlike": {"price": 5, "count": 1, "currency": "XTR"},
        "boost": {"price_per_hour": 25, "currency": "XTR"},
        "top_up_packages": [
            {"stars": 50, "label": "Starter"},
            {"stars": 100, "label": "Basic"},
            {"stars": 250, "label": "Popular"},
            {"stars": 500, "label": "Best Value"}
        ],
        "subscriptions": {
            "gold": {"price": 299, "duration_days": 30},
            "platinum": {"price": 499, "duration_days": 30}
        }
    }


# ============================================
# QUESTION OF THE DAY
# ============================================

@app.get("/api/question-of-the-day")
async def get_question_of_the_day(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get today's question"""
    today = datetime.utcnow().date()
    
    # Try to get today's question
    result = await db.execute(text("""
        SELECT id::text, question_text, category, options
        FROM daily_questions
        WHERE active_date = :today AND is_active = true
        LIMIT 1
    """), {"today": today})
    
    row = result.fetchone()
    
    if not row:
        # Fallback to random active question
        result = await db.execute(text("""
            SELECT id::text, question_text, category, options
            FROM daily_questions
            WHERE is_active = true
            ORDER BY RANDOM()
            LIMIT 1
        """))
        row = result.fetchone()
    
    if not row:
        return {"question": None, "message": "No questions available"}
    
    # Check if user already answered
    answered = await db.execute(
        text("SELECT answer FROM question_answers WHERE user_id = :user_id AND question_id = :q_id"),
        {"user_id": current_user_id, "q_id": row[0]}
    )
    user_answer = answered.fetchone()
    
    return {
        "id": row[0],
        "question": row[1],
        "category": row[2],
        "options": row[3] or [],
        "already_answered": user_answer is not None,
        "user_answer": user_answer[0] if user_answer else None
    }


class AnswerQuestionRequest(BaseModel):
    question_id: str
    answer: str


@app.post("/api/question-of-the-day/answer")
async def answer_question(
    data: AnswerQuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Answer the question of the day"""
    # Check if already answered
    existing = await db.execute(
        text("SELECT id FROM question_answers WHERE user_id = :user_id AND question_id = :q_id"),
        {"user_id": current_user_id, "q_id": data.question_id}
    )
    
    if existing.fetchone():
        raise HTTPException(status_code=400, detail="Already answered this question")
    
    # Save answer
    await db.execute(
        text("""
            INSERT INTO question_answers (user_id, question_id, answer, created_at)
            VALUES (:user_id, :q_id, :answer, NOW())
        """),
        {"user_id": current_user_id, "q_id": data.question_id, "answer": data.answer}
    )
    await db.commit()
    
    return {"success": True, "message": "Answer saved"}


# ============================================
# VERIFICATION ENDPOINTS
# ============================================

@app.get("/api/verification/status")
async def get_verification_status(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's verification status"""
    result = await db.execute(
        text("SELECT is_verified, verification_selfie FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    # Check for pending request
    pending = await db.execute(
        text("""
            SELECT id::text, status, created_at 
            FROM verification_requests 
            WHERE user_id = :user_id 
            ORDER BY created_at DESC LIMIT 1
        """),
        {"user_id": current_user_id}
    )
    pending_row = pending.fetchone()
    
    return {
        "is_verified": row[0] if row else False,
        "has_selfie": bool(row[1]) if row else False,
        "pending_request": {
            "id": pending_row[0],
            "status": pending_row[1],
            "submitted_at": pending_row[2].isoformat() if pending_row[2] else None
        } if pending_row else None
    }


@app.post("/api/verification/request")
async def request_verification(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Request profile verification"""
    # Check if already verified
    user_result = await db.execute(
        text("SELECT is_verified, verification_selfie FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    user = user_result.fetchone()
    
    if user and user[0]:
        return {"success": False, "message": "Already verified"}
    
    if not user or not user[1]:
        raise HTTPException(status_code=400, detail="Please upload verification selfie first")
    
    # Check for existing pending request
    existing = await db.execute(
        text("SELECT id FROM verification_requests WHERE user_id = :user_id AND status = 'pending'"),
        {"user_id": current_user_id}
    )
    
    if existing.fetchone():
        return {"success": False, "message": "Verification request already pending"}
    
    # Create request
    result = await db.execute(
        text("""
            INSERT INTO verification_requests (user_id, status, priority, created_at)
            VALUES (:user_id, 'pending', 1, NOW())
            RETURNING id::text
        """),
        {"user_id": current_user_id}
    )
    await db.commit()
    
    request_id = result.fetchone()[0]
    
    return {"success": True, "request_id": request_id, "message": "Verification request submitted"}


# ============================================
# BOOST ENDPOINTS
# ============================================

@app.get("/api/boost/status")
async def get_boost_status(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get current boost status"""
    result = await db.execute(
        text("SELECT boost_until, is_vip FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    boost_until = row[0] if row else None
    is_boosted = boost_until and boost_until > datetime.utcnow() if boost_until else False
    
    remaining_minutes = 0
    if is_boosted and boost_until:
        remaining_minutes = int((boost_until - datetime.utcnow()).total_seconds() / 60)
    
    return {
        "is_boosted": is_boosted,
        "boost_until": boost_until.isoformat() if boost_until else None,
        "remaining_minutes": remaining_minutes,
        "is_vip": row[1] if row else False,
        "boost_price_per_hour": 25
    }


class ActivateBoostRequest(BaseModel):
    duration_hours: int = 1


@app.post("/api/boost/activate")
async def activate_boost(
    data: ActivateBoostRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Activate profile boost"""
    BOOST_PRICE_PER_HOUR = 25
    total_cost = BOOST_PRICE_PER_HOUR * data.duration_hours
    
    # Check balance
    result = await db.execute(
        text("SELECT stars_balance, boost_until FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    balance = float(row[0]) if row and row[0] else 0
    current_boost = row[1] if row else None
    
    if balance < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: {total_cost}, Available: {balance}"
        )
    
    # Calculate new boost end time
    now = datetime.utcnow()
    if current_boost and current_boost > now:
        # Extend existing boost
        new_boost_until = current_boost + timedelta(hours=data.duration_hours)
    else:
        new_boost_until = now + timedelta(hours=data.duration_hours)
    
    # Deduct and activate
    await db.execute(
        text("""
            UPDATE users 
            SET stars_balance = stars_balance - :cost, boost_until = :boost_until
            WHERE id = :user_id
        """),
        {"cost": total_cost, "boost_until": new_boost_until, "user_id": current_user_id}
    )
    await db.commit()
    
    return {
        "success": True,
        "boost_until": new_boost_until.isoformat(),
        "duration_hours": data.duration_hours,
        "cost": total_cost,
        "new_balance": balance - total_cost
    }


# ============================================
# SWIPE LIMITS ENDPOINTS
# ============================================

# Constants
DAILY_SWIPE_LIMIT_FREE = 50
DAILY_SWIPE_LIMIT_VIP = 999999
DAILY_SUPERLIKE_LIMIT_FREE = 1
DAILY_SUPERLIKE_LIMIT_VIP = 5
SWIPES_PER_PACK = 10
STARS_PER_SWIPE_PACK = 10
STARS_PER_SUPERLIKE = 5


@app.get("/api/swipes/status")
async def get_swipe_status(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get current swipe limits and usage"""
    # Get user info
    user_result = await db.execute(
        text("SELECT is_vip, bonus_swipes, bonus_superlikes, stars_balance FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    user = user_result.fetchone()
    
    is_vip = user[0] if user else False
    bonus_swipes = user[1] if user and user[1] else 0
    bonus_superlikes = user[2] if user and user[2] else 0
    balance = float(user[3]) if user and user[3] else 0
    
    # Count today's swipes
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    swipes_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM swipes 
            WHERE from_user_id = :user_id AND timestamp >= :today
        """),
        {"user_id": current_user_id, "today": today_start}
    )
    swipes_today = swipes_result.scalar() or 0
    
    superlikes_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM swipes 
            WHERE from_user_id = :user_id AND timestamp >= :today AND action = 'superlike'
        """),
        {"user_id": current_user_id, "today": today_start}
    )
    superlikes_today = superlikes_result.scalar() or 0
    
    # Calculate limits
    daily_limit = DAILY_SWIPE_LIMIT_VIP if is_vip else DAILY_SWIPE_LIMIT_FREE
    superlike_limit = DAILY_SUPERLIKE_LIMIT_VIP if is_vip else DAILY_SUPERLIKE_LIMIT_FREE
    
    swipes_remaining = max(0, daily_limit - swipes_today) + bonus_swipes
    superlikes_remaining = max(0, superlike_limit - superlikes_today) + bonus_superlikes
    
    # Reset time
    tomorrow = (datetime.utcnow() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    return {
        "swipes": {
            "used_today": swipes_today,
            "daily_limit": daily_limit,
            "bonus": bonus_swipes,
            "remaining": swipes_remaining,
            "can_swipe": swipes_remaining > 0
        },
        "superlikes": {
            "used_today": superlikes_today,
            "daily_limit": superlike_limit,
            "bonus": bonus_superlikes,
            "remaining": superlikes_remaining,
            "can_superlike": superlikes_remaining > 0
        },
        "reset_at": tomorrow.isoformat(),
        "is_vip": is_vip,
        "stars_balance": balance,
        "prices": {
            "swipe_pack": {"price": STARS_PER_SWIPE_PACK, "count": SWIPES_PER_PACK},
            "superlike": {"price": STARS_PER_SUPERLIKE, "count": 1}
        }
    }


@app.post("/api/swipes/buy-pack")
async def buy_swipe_pack(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Buy a pack of swipes"""
    # Check balance
    result = await db.execute(
        text("SELECT stars_balance FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    balance = float(row[0]) if row and row[0] else 0
    
    if balance < STARS_PER_SWIPE_PACK:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: {STARS_PER_SWIPE_PACK}, Available: {balance}"
        )
    
    # Deduct and add swipes
    await db.execute(
        text("""
            UPDATE users 
            SET stars_balance = stars_balance - :cost,
                bonus_swipes = COALESCE(bonus_swipes, 0) + :swipes
            WHERE id = :user_id
        """),
        {"cost": STARS_PER_SWIPE_PACK, "swipes": SWIPES_PER_PACK, "user_id": current_user_id}
    )
    await db.commit()
    
    return {
        "success": True,
        "purchased": SWIPES_PER_PACK,
        "cost": STARS_PER_SWIPE_PACK,
        "new_balance": balance - STARS_PER_SWIPE_PACK
    }


@app.post("/api/swipes/buy-superlike")
async def buy_superlike(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Buy a superlike"""
    # Check balance
    result = await db.execute(
        text("SELECT stars_balance FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    balance = float(row[0]) if row and row[0] else 0
    
    if balance < STARS_PER_SUPERLIKE:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Required: {STARS_PER_SUPERLIKE}, Available: {balance}"
        )
    
    # Deduct and add superlike
    await db.execute(
        text("""
            UPDATE users 
            SET stars_balance = stars_balance - :cost,
                bonus_superlikes = COALESCE(bonus_superlikes, 0) + 1
            WHERE id = :user_id
        """),
        {"cost": STARS_PER_SUPERLIKE, "user_id": current_user_id}
    )
    await db.commit()
    
    return {
        "success": True,
        "purchased": 1,
        "cost": STARS_PER_SUPERLIKE,
        "new_balance": balance - STARS_PER_SUPERLIKE
    }


# ============================================
# NOTIFICATION SETTINGS ENDPOINTS
# ============================================

class NotificationSettingsUpdate(BaseModel):
    new_match: Optional[bool] = None
    new_message: Optional[bool] = None
    new_like: Optional[bool] = None
    super_like: Optional[bool] = None
    profile_view: Optional[bool] = None
    match_reminder: Optional[bool] = None
    promotion: Optional[bool] = None


@app.get("/api/settings/notifications")
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get notification settings"""
    result = await db.execute(
        text("SELECT notification_settings FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    defaults = {
        "new_match": True,
        "new_message": True,
        "new_like": True,
        "super_like": True,
        "profile_view": False,
        "match_reminder": True,
        "promotion": False
    }
    
    settings = row[0] if row and row[0] else {}
    return {**defaults, **settings}


@app.put("/api/settings/notifications")
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update notification settings"""
    result = await db.execute(
        text("SELECT notification_settings FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    settings = row[0] if row and row[0] else {}
    
    update_data = data.model_dump(exclude_unset=True)
    settings.update(update_data)
    
    await db.execute(
        text("UPDATE users SET notification_settings = :settings WHERE id = :user_id"),
        {"settings": json.dumps(settings), "user_id": current_user_id}
    )
    await db.commit()
    
    return settings


# ============================================
# ADMIN ENDPOINTS
# ============================================

async def get_admin_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Verify admin access"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    try:
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth format")
        
        user_id = verify_token(parts[1])
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if admin
        result = await db.execute(
            text("SELECT role FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        row = result.fetchone()
        
        if not row or row[0] not in ("admin", "moderator"):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization")


@app.get("/api/admin/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(get_admin_user)
):
    """Get admin dashboard statistics"""
    # Users
    users_result = await db.execute(text("SELECT COUNT(*) FROM users WHERE is_active = true"))
    total_users = users_result.scalar() or 0
    
    # New users today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    new_today = await db.execute(
        text("SELECT COUNT(*) FROM users WHERE created_at >= :today"),
        {"today": today_start}
    )
    new_users_today = new_today.scalar() or 0
    
    # Matches
    matches_result = await db.execute(text("SELECT COUNT(*) FROM matches WHERE is_active = true"))
    total_matches = matches_result.scalar() or 0
    
    # Messages today
    messages_today = await db.execute(
        text("SELECT COUNT(*) FROM messages WHERE created_at >= :today"),
        {"today": today_start}
    )
    messages_count = messages_today.scalar() or 0
    
    # VIP users
    vip_result = await db.execute(text("SELECT COUNT(*) FROM users WHERE is_vip = true"))
    vip_users = vip_result.scalar() or 0
    
    # Pending reports
    reports_result = await db.execute(text("SELECT COUNT(*) FROM reports WHERE status = 'pending'"))
    pending_reports = reports_result.scalar() or 0
    
    # Pending verifications
    verif_result = await db.execute(text("SELECT COUNT(*) FROM verification_requests WHERE status = 'pending'"))
    pending_verifications = verif_result.scalar() or 0
    
    return {
        "users": {
            "total": total_users,
            "new_today": new_users_today,
            "vip": vip_users
        },
        "matches": {
            "total": total_matches
        },
        "messages": {
            "today": messages_count
        },
        "moderation": {
            "pending_reports": pending_reports,
            "pending_verifications": pending_verifications
        }
    }


@app.get("/api/admin/users")
async def get_admin_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(get_admin_user)
):
    """Get users list for admin"""
    offset = (page - 1) * limit
    
    # Build query
    query = """
        SELECT 
            id::text, name, email, phone, telegram_id, 
            is_active, is_vip, is_verified, role, status,
            created_at, stars_balance
        FROM users
        WHERE 1=1
    """
    params = {"limit": limit, "offset": offset}
    
    if search:
        query += " AND (name ILIKE :search OR email ILIKE :search OR phone ILIKE :search)"
        params["search"] = f"%{search}%"
    
    if status:
        query += " AND status = :status"
        params["status"] = status
    
    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    
    users = []
    for r in rows:
        users.append({
            "id": r[0],
            "name": r[1],
            "email": r[2],
            "phone": r[3],
            "telegram_id": r[4],
            "is_active": r[5],
            "is_vip": r[6],
            "is_verified": r[7],
            "role": r[8],
            "status": r[9],
            "created_at": r[10].isoformat() if r[10] else None,
            "stars_balance": float(r[11]) if r[11] else 0
        })
    
    # Get total count
    count_query = "SELECT COUNT(*) FROM users WHERE 1=1"
    if search:
        count_query += " AND (name ILIKE :search OR email ILIKE :search OR phone ILIKE :search)"
    if status:
        count_query += " AND status = :status"
    
    count_result = await db.execute(text(count_query), params)
    total = count_result.scalar() or 0
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@app.get("/api/admin/reports")
async def get_admin_reports(
    status: str = "pending",
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(get_admin_user)
):
    """Get reports for moderation"""
    result = await db.execute(text("""
        SELECT 
            r.id::text, r.reporter_id::text, r.reported_user_id::text,
            r.reason, r.description, r.status, r.created_at,
            u1.name as reporter_name,
            u2.name as reported_name, u2.photos as reported_photos
        FROM reports r
        JOIN users u1 ON r.reporter_id = u1.id
        JOIN users u2 ON r.reported_user_id = u2.id
        WHERE r.status = :status
        ORDER BY r.created_at DESC
        LIMIT :limit
    """), {"status": status, "limit": limit})
    
    rows = result.fetchall()
    
    reports = []
    for r in rows:
        reports.append({
            "id": r[0],
            "reporter_id": r[1],
            "reported_user_id": r[2],
            "reason": r[3],
            "description": r[4],
            "status": r[5],
            "created_at": r[6].isoformat() if r[6] else None,
            "reporter_name": r[7],
            "reported_name": r[8],
            "reported_photo": r[9][0] if r[9] else None
        })
    
    return {"reports": reports, "total": len(reports)}


class ResolveReportRequest(BaseModel):
    action: str  # dismiss, warn, ban
    notes: Optional[str] = None


@app.post("/api/admin/reports/{report_id}/resolve")
async def resolve_report(
    report_id: str,
    data: ResolveReportRequest,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(get_admin_user)
):
    """Resolve a report"""
    # Get report
    result = await db.execute(
        text("SELECT reported_user_id FROM reports WHERE id = :report_id"),
        {"report_id": report_id}
    )
    report = result.fetchone()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Update report status
    await db.execute(
        text("UPDATE reports SET status = 'resolved', resolved_at = NOW() WHERE id = :report_id"),
        {"report_id": report_id}
    )
    
    # Take action
    if data.action == "ban":
        await db.execute(
            text("UPDATE users SET status = 'banned', is_active = false WHERE id = :user_id"),
            {"user_id": str(report[0])}
        )
    elif data.action == "warn":
        # Could send notification or increment warning count
        pass
    
    await db.commit()
    
    return {"success": True, "action": data.action}


@app.get("/api/admin/verifications")
async def get_admin_verifications(
    status: str = "pending",
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(get_admin_user)
):
    """Get verification requests"""
    result = await db.execute(text("""
        SELECT 
            vr.id::text, vr.user_id::text, vr.status, vr.created_at,
            u.name, u.photos, u.verification_selfie
        FROM verification_requests vr
        JOIN users u ON vr.user_id = u.id
        WHERE vr.status = :status
        ORDER BY vr.created_at ASC
        LIMIT :limit
    """), {"status": status, "limit": limit})
    
    rows = result.fetchall()
    
    requests = []
    for r in rows:
        requests.append({
            "id": r[0],
            "user_id": r[1],
            "status": r[2],
            "created_at": r[3].isoformat() if r[3] else None,
            "user_name": r[4],
            "user_photos": r[5] or [],
            "verification_selfie": r[6]
        })
    
    return {"requests": requests, "total": len(requests)}


class ResolveVerificationRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None


@app.post("/api/admin/verifications/{request_id}/resolve")
async def resolve_verification(
    request_id: str,
    data: ResolveVerificationRequest,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(get_admin_user)
):
    """Approve or reject verification request"""
    # Get request
    result = await db.execute(
        text("SELECT user_id FROM verification_requests WHERE id = :request_id"),
        {"request_id": request_id}
    )
    request = result.fetchone()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    new_status = "approved" if data.approved else "rejected"
    
    # Update request
    await db.execute(
        text("UPDATE verification_requests SET status = :status, reviewed_at = NOW() WHERE id = :request_id"),
        {"status": new_status, "request_id": request_id}
    )
    
    # Update user if approved
    if data.approved:
        await db.execute(
            text("UPDATE users SET is_verified = true WHERE id = :user_id"),
            {"user_id": str(request[0])}
        )
    
    await db.commit()
    
    return {"success": True, "status": new_status}


# ============================================
# DEV ENDPOINTS (only in development)
# ============================================

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")


@app.post("/api/dev/add-stars")
async def dev_add_stars(
    amount: int = Query(100, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """DEV ONLY: Add stars to balance"""
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    await db.execute(
        text("UPDATE users SET stars_balance = COALESCE(stars_balance, 0) + :amount WHERE id = :user_id"),
        {"amount": amount, "user_id": current_user_id}
    )
    await db.commit()
    
    # Get new balance
    result = await db.execute(
        text("SELECT stars_balance FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    new_balance = result.scalar() or 0
    
    return {"success": True, "added": amount, "new_balance": float(new_balance)}


@app.post("/api/dev/set-vip")
async def dev_set_vip(
    is_vip: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """DEV ONLY: Set VIP status"""
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    await db.execute(
        text("UPDATE users SET is_vip = :is_vip WHERE id = :user_id"),
        {"is_vip": is_vip, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"success": True, "is_vip": is_vip}


# Vercel handler
handler = app
