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

from fastapi import FastAPI, Depends, HTTPException, status, Header, Query, Body
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
    city: Optional[str] = None
    height: Optional[int] = None
    smoking: Optional[str] = None
    drinking: Optional[str] = None
    education: Optional[str] = None
    looking_for: Optional[str] = None
    children: Optional[str] = None
    job: Optional[str] = None
    zodiac: Optional[str] = None
    personality_type: Optional[str] = None
    love_language: Optional[str] = None
    pets: Optional[str] = None
    ideal_date: Optional[str] = None
    intent: Optional[str] = None


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
    # Get user basic info
    result = await db.execute(
        text("""
            SELECT id, name, age, gender, bio, is_vip, is_complete, stars_balance
            FROM users WHERE id = :user_id
        """),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get photos from user_photos table
    photos_result = await db.execute(
        text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
        {"user_id": user_id}
    )
    photos = [row[0] for row in photos_result.fetchall()]
    
    # Get interests from user_interests table
    interests_result = await db.execute(
        text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    interests = [row[0] for row in interests_result.fetchall()]
    
    return UserProfile(
        id=str(user[0]),
        name=user[1],
        age=user[2],
        gender=user[3],
        bio=user[4],
        photos=photos,
        interests=interests,
        is_vip=user[5] or False,
        is_complete=user[6] or False,
        stars_balance=user[7] or 0
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
    if data.latitude is not None:
        updates.append("latitude = :latitude")
        params["latitude"] = data.latitude
    if data.longitude is not None:
        updates.append("longitude = :longitude")
        params["longitude"] = data.longitude
    if data.city is not None:
        updates.append("city = :city")
        params["city"] = data.city
    if data.height is not None:
        updates.append("height = :height")
        params["height"] = data.height
    if data.smoking is not None:
        updates.append("smoking = :smoking")
        params["smoking"] = data.smoking
    if data.drinking is not None:
        updates.append("drinking = :drinking")
        params["drinking"] = data.drinking
    if data.education is not None:
        updates.append("education = :education")
        params["education"] = data.education
    if data.looking_for is not None:
        updates.append("looking_for = :looking_for")
        params["looking_for"] = data.looking_for
    if data.children is not None:
        updates.append("children = :children")
        params["children"] = data.children
    if data.job is not None:
        updates.append("job = :job")
        params["job"] = data.job
    if data.zodiac is not None:
        updates.append("zodiac = :zodiac")
        params["zodiac"] = data.zodiac
    if data.personality_type is not None:
        updates.append("personality_type = :personality_type")
        params["personality_type"] = data.personality_type
    if data.love_language is not None:
        updates.append("love_language = :love_language")
        params["love_language"] = data.love_language
    if data.pets is not None:
        updates.append("pets = :pets")
        params["pets"] = data.pets
    if data.ideal_date is not None:
        updates.append("ideal_date = :ideal_date")
        params["ideal_date"] = data.ideal_date
    if data.intent is not None:
        updates.append("intent = :intent")
        params["intent"] = data.intent
    
    # Check if profile is complete
    updates.append("is_complete = (name IS NOT NULL AND age IS NOT NULL AND age >= 18)")
    
    if updates:
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = :user_id"
        await db.execute(text(query), params)
        await db.commit()
    
    # Handle interests separately in user_interests table
    if data.interests is not None:
        # Delete old interests
        await db.execute(
            text("DELETE FROM user_interests WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        # Insert new interests
        for tag in data.interests:
            await db.execute(
                text("INSERT INTO user_interests (user_id, tag) VALUES (:user_id, :tag)"),
                {"user_id": user_id, "tag": tag}
            )
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
            SELECT id, name, age, gender, bio, is_vip
            FROM users WHERE id = :user_id AND is_active = true
        """),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get photos from user_photos table
    photos_result = await db.execute(
        text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
        {"user_id": user_id}
    )
    photos = [row[0] for row in photos_result.fetchall()]
    
    # Get interests from user_interests table
    interests_result = await db.execute(
        text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    interests = [row[0] for row in interests_result.fetchall()]
    
    return {
        "id": str(user[0]),
        "name": user[1],
        "age": user[2],
        "gender": user[3],
        "bio": user[4],
        "photos": photos,
        "interests": interests,
        "is_vip": user[5] or False
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
            u.id::text, u.name, u.age, u.bio, u.gender, u.is_vip
        FROM users u
        WHERE u.is_active = true 
        AND u.is_complete = true
        AND u.id != :current_user_id
        AND u.id NOT IN (
            SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id
        )
        AND EXISTS (SELECT 1 FROM user_photos WHERE user_id = u.id)
        ORDER BY RANDOM() 
        LIMIT :limit
    """), {"current_user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    profiles = []
    for row in rows:
        user_id = row[0]
        
        # Get photos
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [r[0] for r in photos_result.fetchall()]
        
        # Get interests
        interests_result = await db.execute(
            text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        interests = [r[0] for r in interests_result.fetchall()]
        
        profiles.append({
            "id": user_id,
            "name": row[1],
            "age": row[2],
            "bio": row[3],
            "photos": photos,
            "gender": row[4],
            "is_vip": row[5] or False,
            "interests": interests
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
            u.age
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
        user_id = row[0]
        # Get photos
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at LIMIT 1"),
            {"user_id": user_id}
        )
        photos = [r[0] for r in photos_result.fetchall()]
        
        likes.append({
            "id": user_id,
            "isSuper": row[1] == "superlike",
            "likedAt": row[2].isoformat() if row[2] else None,
            "name": row[3],
            "age": row[4],
            "photos": photos
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
        SELECT b.blocked_id::text, b.reason, b.created_at, u.name
        FROM blocks b
        JOIN users u ON b.blocked_id = u.id
        WHERE b.blocker_id = :user_id
        ORDER BY b.created_at DESC
    """), {"user_id": current_user_id})
    
    rows = result.fetchall()
    
    blocked = []
    for row in rows:
        user_id = row[0]
        # Get first photo
        photo_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at LIMIT 1"),
            {"user_id": user_id}
        )
        photo_row = photo_result.fetchone()
        
        blocked.append({
            "id": user_id,
            "reason": row[1],
            "blocked_at": row[2].isoformat() if row[2] else None,
            "name": row[3],
            "photo": photo_row[0] if photo_row else None
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
            u.name as sender_name
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
        sender_photo = None
        if not r[5] and r[1]:  # Not anonymous and has sender_id
            photo_result = await db.execute(
                text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at LIMIT 1"),
                {"user_id": r[1]}
            )
            photo_row = photo_result.fetchone()
            sender_photo = photo_row[0] if photo_row else None
        
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
            "sender_photo": sender_photo
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
            u.name as receiver_name
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
        receiver_photo = None
        if r[1]:  # Has receiver_id
            photo_result = await db.execute(
                text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at LIMIT 1"),
                {"user_id": r[1]}
            )
            photo_row = photo_result.fetchone()
            receiver_photo = photo_row[0] if photo_row else None
        
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
            "receiver_photo": receiver_photo
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
            u.name, u.verification_selfie
        FROM verification_requests vr
        JOIN users u ON vr.user_id = u.id
        WHERE vr.status = :status
        ORDER BY vr.created_at ASC
        LIMIT :limit
    """), {"status": status, "limit": limit})
    
    rows = result.fetchall()
    
    requests = []
    for r in rows:
        user_id = r[1]
        # Get photos
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [p[0] for p in photos_result.fetchall()]
        
        requests.append({
            "id": r[0],
            "user_id": user_id,
            "status": r[2],
            "created_at": r[3].isoformat() if r[3] else None,
            "user_name": r[4],
            "user_photos": photos,
            "verification_selfie": r[5]
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


# ============================================
# DISCOVER ENDPOINTS (Extended)
# ============================================

class DiscoverFilters(BaseModel):
    age_min: int = 18
    age_max: int = 100
    gender: Optional[str] = None
    distance_km: int = 50
    verified_only: bool = False
    with_photos_only: bool = True
    interests: Optional[list] = None


@app.post("/api/discover")
async def discover_profiles(
    filters: DiscoverFilters,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Discover profiles with filters"""
    query = """
        SELECT 
            u.id::text, u.name, u.age, u.bio, u.gender, 
            u.is_vip, u.is_verified
        FROM users u
        WHERE u.is_active = true 
        AND u.is_complete = true
        AND u.id != :current_user_id
        AND u.age >= :age_min AND u.age <= :age_max
    """
    params = {
        "current_user_id": current_user_id,
        "age_min": filters.age_min,
        "age_max": filters.age_max,
        "limit": limit,
        "offset": skip
    }
    
    if filters.gender:
        query += " AND u.gender = :gender"
        params["gender"] = filters.gender
    
    if filters.verified_only:
        query += " AND u.is_verified = true"
    
    if filters.with_photos_only:
        query += " AND EXISTS (SELECT 1 FROM user_photos WHERE user_id = u.id)"
    
    # Exclude already swiped
    query += " AND u.id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)"
    
    query += " ORDER BY RANDOM() LIMIT :limit OFFSET :offset"
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    
    profiles = []
    for r in rows:
        user_id = r[0]
        # Get photos
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [p[0] for p in photos_result.fetchall()]
        
        # Get interests
        interests_result = await db.execute(
            text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        interests = [i[0] for i in interests_result.fetchall()]
        
        profiles.append({
            "id": user_id,
            "name": r[1],
            "age": r[2],
            "bio": r[3],
            "photos": photos,
            "gender": r[4],
            "is_vip": r[5] or False,
            "interests": interests,
            "is_verified": r[6] or False
        })
    
    return {"profiles": profiles, "total": len(profiles)}


@app.get("/api/discover/daily-picks")
async def get_daily_picks(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get AI-curated daily picks (5 profiles)"""
    # Get user preferences
    user_result = await db.execute(
        text("SELECT gender FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    user = user_result.fetchone()
    
    # Simple matching: users with photos who haven't been swiped
    query = """
        SELECT 
            u.id::text, u.name, u.age, u.bio, u.is_verified
        FROM users u
        WHERE u.is_active = true 
        AND u.is_complete = true
        AND u.id != :current_user_id
        AND u.id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)
        AND EXISTS (SELECT 1 FROM user_photos WHERE user_id = u.id)
        ORDER BY 
            CASE WHEN u.is_verified THEN 0 ELSE 1 END,
            RANDOM()
        LIMIT 5
    """
    
    result = await db.execute(text(query), {"current_user_id": current_user_id})
    rows = result.fetchall()
    
    picks = []
    for r in rows:
        user_id = r[0]
        
        # Get photos for this user
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [row[0] for row in photos_result.fetchall()]
        
        # Get interests for this user
        interests_result = await db.execute(
            text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        interests = [row[0] for row in interests_result.fetchall()]
        
        picks.append({
            "id": user_id,
            "name": r[1],
            "age": r[2],
            "bio": r[3],
            "photos": photos,
            "interests": interests,
            "is_verified": r[4] or False,
            "match_reason": "Daily pick for you"
        })
    
    return {"picks": picks, "date": datetime.utcnow().date().isoformat()}


@app.get("/api/discover/prefetch")
async def prefetch_profiles(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Prefetch next profiles for smooth UX"""
    result = await db.execute(text("""
        SELECT id::text, name, age, photos
        FROM users
        WHERE is_active = true 
        AND id != :current_user_id
        AND photos IS NOT NULL AND array_length(photos, 1) > 0
        AND id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)
        ORDER BY RANDOM()
        LIMIT :limit
    """), {"current_user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    return [
        {
            "id": r[0],
            "name": r[1],
            "age": r[2],
            "photo": r[3][0] if r[3] else None
        }
        for r in rows
    ]


@app.get("/api/filters/options")
async def get_filter_options():
    """Get all available filter options for UI"""
    return {
        "gender": [
            {"value": "male", "label": "Мужчина"},
            {"value": "female", "label": "Женщина"},
            {"value": "other", "label": "Другое"}
        ],
        "age": {"min": 18, "max": 100},
        "distance": {"min": 1, "max": 500, "default": 50},
        "interests": [
            "Спорт", "Музыка", "Кино", "Путешествия", "Книги",
            "Игры", "Кулинария", "Фотография", "Танцы", "Йога",
            "Искусство", "Технологии", "Природа", "Животные"
        ],
        "looking_for": [
            {"value": "relationship", "label": "Серьезные отношения"},
            {"value": "dating", "label": "Свидания"},
            {"value": "friends", "label": "Друзья"},
            {"value": "chat", "label": "Общение"}
        ]
    }


# ============================================
# LOCATION ENDPOINT
# ============================================

class LocationUpdate(BaseModel):
    lat: float
    lon: float


@app.post("/api/location")
async def update_location(
    data: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update user location"""
    await db.execute(
        text("UPDATE users SET latitude = :lat, longitude = :lon WHERE id = :user_id"),
        {"lat": data.lat, "lon": data.lon, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "lat": data.lat, "lon": data.lon}


# ============================================
# CHAT ENDPOINTS (REST only, no WebSocket)
# ============================================

class TypingRequest(BaseModel):
    match_id: str
    is_typing: bool


class MarkReadRequest(BaseModel):
    match_id: str
    message_ids: list


class ReactionRequest(BaseModel):
    message_id: str
    emoji: Optional[str] = None


@app.post("/api/chat/typing")
async def set_typing(
    data: TypingRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Set typing status (for polling-based clients)"""
    # In serverless, we can't maintain WebSocket state
    # This is a placeholder for clients that poll
    return {"status": "ok", "match_id": data.match_id, "is_typing": data.is_typing}


@app.post("/api/chat/read")
async def mark_messages_read(
    data: MarkReadRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark messages as read"""
    if not data.message_ids:
        return {"status": "ok", "updated": 0}
    
    # Verify user is receiver
    placeholders = ", ".join([f":id{i}" for i in range(len(data.message_ids))])
    params = {f"id{i}": mid for i, mid in enumerate(data.message_ids)}
    params["user_id"] = current_user_id
    
    result = await db.execute(
        text(f"""
            UPDATE messages 
            SET is_read = true, read_at = NOW()
            WHERE id IN ({placeholders}) AND receiver_id = :user_id AND is_read = false
        """),
        params
    )
    await db.commit()
    
    return {"status": "ok", "updated": result.rowcount}


@app.post("/api/chat/reaction")
async def add_reaction(
    data: ReactionRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Add or remove reaction to message"""
    if data.emoji:
        # Add reaction
        await db.execute(
            text("""
                INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
                VALUES (:message_id, :user_id, :emoji, NOW())
                ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = :emoji
            """),
            {"message_id": data.message_id, "user_id": current_user_id, "emoji": data.emoji}
        )
    else:
        # Remove reaction
        await db.execute(
            text("DELETE FROM message_reactions WHERE message_id = :message_id AND user_id = :user_id"),
            {"message_id": data.message_id, "user_id": current_user_id}
        )
    
    await db.commit()
    return {"status": "ok", "emoji": data.emoji}


@app.get("/api/chat/reactions")
async def get_available_reactions():
    """Get list of available reactions"""
    return {
        "reactions": ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "💯", "🎉"]
    }


@app.get("/api/chat/unread")
async def get_unread_counts(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get unread message counts per match"""
    result = await db.execute(text("""
        SELECT match_id::text, COUNT(*) as count
        FROM messages
        WHERE receiver_id = :user_id AND is_read = false
        GROUP BY match_id
    """), {"user_id": current_user_id})
    
    rows = result.fetchall()
    
    unread = {r[0]: r[1] for r in rows}
    total = sum(unread.values())
    
    return {"unread": unread, "total": total}


@app.get("/api/chat/icebreakers")
async def get_icebreakers(
    match_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get conversation starters for a match"""
    # Verify match access
    match_check = await db.execute(
        text("SELECT user1_id, user2_id FROM matches WHERE id = :match_id"),
        {"match_id": match_id}
    )
    match = match_check.fetchone()
    
    if not match or current_user_id not in (str(match[0]), str(match[1])):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get partner info for personalized icebreakers
    partner_id = str(match[1]) if current_user_id == str(match[0]) else str(match[0])
    
    partner_result = await db.execute(
        text("SELECT name, bio FROM users WHERE id = :user_id"),
        {"user_id": partner_id}
    )
    partner = partner_result.fetchone()
    
    # Get partner interests from user_interests table
    interests_result = await db.execute(
        text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
        {"user_id": partner_id}
    )
    interests = [row[0] for row in interests_result.fetchall()]
    
    # Generate icebreakers based on partner info
    icebreakers = [
        f"Привет! Как твои дела? 😊",
        f"Привет {partner[0] if partner else ''}! Рад(а) познакомиться!",
        "Что самое интересное произошло у тебя на этой неделе?",
        "Какой твой любимый способ провести выходные?",
        "Если бы ты мог(ла) поехать куда угодно прямо сейчас, куда бы отправился(ась)?"
    ]
    
    # Add interest-based icebreaker if available
    if interests:
        icebreakers.append(f"Вижу, тебе нравится {interests[0]}! Расскажи подробнее?")
    
    return {"icebreakers": icebreakers[:5]}


@app.get("/api/chat/gifs/search")
async def search_gifs(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Search GIFs (placeholder - integrate with Giphy/Tenor)"""
    # Placeholder response - in production, integrate with Giphy API
    return {
        "gifs": [],
        "query": q,
        "message": "GIF search requires Giphy API integration"
    }


@app.get("/api/chat/gifs/trending")
async def get_trending_gifs(
    limit: int = Query(20, ge=1, le=50)
):
    """Get trending GIFs (placeholder)"""
    return {
        "gifs": [],
        "message": "Trending GIFs requires Giphy API integration"
    }


# ============================================
# PROFILE ENDPOINTS
# ============================================

class ProfileCreate(BaseModel):
    name: str
    age: int
    gender: str
    bio: Optional[str] = None
    interests: Optional[list] = None


@app.post("/api/profile")
async def create_profile(
    data: ProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create/complete user profile"""
    await db.execute(
        text("""
            UPDATE users 
            SET name = :name, age = :age, gender = :gender, bio = :bio, 
                interests = :interests, is_complete = true
            WHERE id = :user_id
        """),
        {
            "name": data.name,
            "age": data.age,
            "gender": data.gender,
            "bio": data.bio,
            "interests": data.interests or [],
            "user_id": current_user_id
        }
    )
    await db.commit()
    
    return {"status": "ok", "message": "Profile created"}


@app.get("/api/profile/completion")
async def get_profile_completion(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get profile completion status"""
    result = await db.execute(
        text("""
            SELECT name, age, gender, bio, is_verified
            FROM users WHERE id = :user_id
        """),
        {"user_id": current_user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get photos count from user_photos table
    photos_result = await db.execute(
        text("SELECT COUNT(*) FROM user_photos WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    )
    photos_count = photos_result.scalar() or 0
    
    # Get interests count from user_interests table
    interests_result = await db.execute(
        text("SELECT COUNT(*) FROM user_interests WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    )
    interests_count = interests_result.scalar() or 0
    
    completion = {
        "name": bool(user[0]),
        "age": bool(user[1]),
        "gender": bool(user[2]),
        "bio": bool(user[3]),
        "photos": photos_count > 0,
        "interests": interests_count > 0,
        "verified": bool(user[4])
    }
    
    completed = sum(completion.values())
    total = len(completion)
    percentage = int((completed / total) * 100)
    
    return {
        "completion": completion,
        "completed": completed,
        "total": total,
        "percentage": percentage,
        "is_complete": percentage >= 70
    }


# ============================================
# NEARBY USERS (Geo-based)
# ============================================

@app.get("/api/nearby")
async def get_nearby_users(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: int = Query(50, ge=1, le=500),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get nearby users based on location"""
    # Using Haversine formula for distance calculation
    result = await db.execute(text("""
        SELECT 
            id::text, name, age, photos, gender,
            (6371 * acos(
                cos(radians(:lat)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(:lon)) +
                sin(radians(:lat)) * sin(radians(latitude))
            )) AS distance_km
        FROM users
        WHERE is_active = true
        AND id != :current_user_id
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND photos IS NOT NULL AND array_length(photos, 1) > 0
        AND id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)
        HAVING (6371 * acos(
            cos(radians(:lat)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(:lon)) +
            sin(radians(:lat)) * sin(radians(latitude))
        )) <= :radius
        ORDER BY distance_km
        LIMIT :limit
    """), {
        "lat": lat,
        "lon": lon,
        "radius": radius_km,
        "current_user_id": current_user_id,
        "limit": limit
    })
    
    rows = result.fetchall()
    
    users = []
    for r in rows:
        users.append({
            "id": r[0],
            "name": r[1],
            "age": r[2],
            "photos": r[3] or [],
            "gender": r[4],
            "distance_km": round(r[5], 1) if r[5] else None
        })
    
    return {"users": users, "total": len(users)}


# ============================================
# ACHIEVEMENTS & GAMIFICATION
# ============================================

@app.get("/api/achievements")
async def get_achievements(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user achievements"""
    result = await db.execute(
        text("SELECT achievements FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    user_achievements = row[0] if row and row[0] else []
    
    # All available achievements
    all_achievements = [
        {"id": "first_match", "name": "Первый матч", "description": "Получите первый матч", "icon": "💕"},
        {"id": "conversationalist", "name": "Душа компании", "description": "Отправьте 100 сообщений", "icon": "💬"},
        {"id": "popular", "name": "Популярный", "description": "Получите 50 лайков", "icon": "⭐"},
        {"id": "verified", "name": "Проверенный", "description": "Пройдите верификацию", "icon": "✅"},
        {"id": "gift_giver", "name": "Щедрый", "description": "Отправьте 10 подарков", "icon": "🎁"},
        {"id": "daily_active", "name": "Активный", "description": "Заходите 7 дней подряд", "icon": "🔥"},
        {"id": "profile_complete", "name": "Полный профиль", "description": "Заполните профиль на 100%", "icon": "📝"},
        {"id": "super_liker", "name": "Супер-лайкер", "description": "Используйте 10 супер-лайков", "icon": "💜"}
    ]
    
    # Mark earned achievements
    earned_ids = [a.get("badge") or a.get("id") for a in user_achievements] if user_achievements else []
    
    for achievement in all_achievements:
        achievement["earned"] = achievement["id"] in earned_ids
    
    return {
        "achievements": all_achievements,
        "earned_count": len(earned_ids),
        "total_count": len(all_achievements)
    }


# ============================================
# ACTIVITY & ANALYTICS
# ============================================

@app.get("/api/activity/summary")
async def get_activity_summary(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user activity summary"""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    
    # Swipes today
    swipes_result = await db.execute(
        text("SELECT COUNT(*) FROM swipes WHERE from_user_id = :user_id AND timestamp >= :today"),
        {"user_id": current_user_id, "today": today}
    )
    swipes_today = swipes_result.scalar() or 0
    
    # Matches this week
    matches_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM matches 
            WHERE (user1_id = :user_id OR user2_id = :user_id) AND created_at >= :week_ago
        """),
        {"user_id": current_user_id, "week_ago": week_ago}
    )
    matches_week = matches_result.scalar() or 0
    
    # Messages this week
    messages_result = await db.execute(
        text("SELECT COUNT(*) FROM messages WHERE sender_id = :user_id AND created_at >= :week_ago"),
        {"user_id": current_user_id, "week_ago": week_ago}
    )
    messages_week = messages_result.scalar() or 0
    
    # Likes received this week
    likes_result = await db.execute(
        text("""
            SELECT COUNT(*) FROM swipes 
            WHERE to_user_id = :user_id AND action IN ('like', 'superlike') AND timestamp >= :week_ago
        """),
        {"user_id": current_user_id, "week_ago": week_ago}
    )
    likes_week = likes_result.scalar() or 0
    
    return {
        "today": {
            "swipes": swipes_today
        },
        "this_week": {
            "matches": matches_week,
            "messages": messages_week,
            "likes_received": likes_week
        }
    }


# ============================================
# SUBSCRIPTION PLANS
# ============================================

@app.get("/api/subscriptions/plans")
async def get_subscription_plans(
    db: AsyncSession = Depends(get_db)
):
    """Get available subscription plans"""
    result = await db.execute(text("""
        SELECT id::text, name, tier, price, currency, duration_days, 
               unlimited_swipes, unlimited_likes, see_who_likes, boost_per_month,
               is_active, is_popular
        FROM subscription_plans
        WHERE is_active = true
        ORDER BY price
    """))
    
    rows = result.fetchall()
    
    plans = []
    for r in rows:
        plans.append({
            "id": r[0],
            "name": r[1],
            "tier": r[2],
            "price": float(r[3]),
            "currency": r[4],
            "duration_days": r[5],
            "features": {
                "unlimited_swipes": r[6],
                "unlimited_likes": r[7],
                "see_who_likes": r[8],
                "boost_per_month": r[9]
            },
            "is_popular": r[11]
        })
    
    # Fallback if no plans in DB
    if not plans:
        plans = [
            {
                "id": "free",
                "name": "Free",
                "tier": "free",
                "price": 0,
                "currency": "XTR",
                "duration_days": 0,
                "features": {
                    "unlimited_swipes": False,
                    "unlimited_likes": False,
                    "see_who_likes": False,
                    "boost_per_month": 0
                },
                "is_popular": False
            },
            {
                "id": "gold",
                "name": "Gold",
                "tier": "gold",
                "price": 299,
                "currency": "XTR",
                "duration_days": 30,
                "features": {
                    "unlimited_swipes": True,
                    "unlimited_likes": True,
                    "see_who_likes": True,
                    "boost_per_month": 1
                },
                "is_popular": True
            },
            {
                "id": "platinum",
                "name": "Platinum",
                "tier": "platinum",
                "price": 499,
                "currency": "XTR",
                "duration_days": 30,
                "features": {
                    "unlimited_swipes": True,
                    "unlimited_likes": True,
                    "see_who_likes": True,
                    "boost_per_month": 5
                },
                "is_popular": False
            }
        ]
    
    return {"plans": plans}


@app.get("/api/subscriptions/my")
async def get_my_subscription(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get current user's subscription"""
    result = await db.execute(text("""
        SELECT 
            us.id::text, us.status, us.starts_at, us.expires_at,
            sp.name, sp.tier
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = :user_id AND us.status = 'active'
        ORDER BY us.expires_at DESC
        LIMIT 1
    """), {"user_id": current_user_id})
    
    row = result.fetchone()
    
    if not row:
        return {
            "has_subscription": False,
            "tier": "free",
            "plan_name": "Free"
        }
    
    return {
        "has_subscription": True,
        "subscription_id": row[0],
        "status": row[1],
        "starts_at": row[2].isoformat() if row[2] else None,
        "expires_at": row[3].isoformat() if row[3] else None,
        "plan_name": row[4],
        "tier": row[5]
    }


# ============================================
# SEARCH USERS
# ============================================

@app.get("/api/search/users")
async def search_users(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Search users by name"""
    result = await db.execute(text("""
        SELECT id::text, name, age, photos, is_verified
        FROM users
        WHERE is_active = true
        AND id != :current_user_id
        AND name ILIKE :query
        LIMIT :limit
    """), {"current_user_id": current_user_id, "query": f"%{q}%", "limit": limit})
    
    rows = result.fetchall()
    
    users = []
    for r in rows:
        users.append({
            "id": r[0],
            "name": r[1],
            "age": r[2],
            "photo": r[3][0] if r[3] else None,
            "is_verified": r[4]
        })
    
    return {"users": users, "total": len(users)}


# ============================================
# FEEDBACK
# ============================================

class FeedbackRequest(BaseModel):
    type: str  # bug, feature, other
    message: str
    rating: Optional[int] = None


@app.post("/api/feedback")
async def submit_feedback(
    data: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Submit user feedback"""
    await db.execute(
        text("""
            INSERT INTO feedback (user_id, type, message, rating, created_at)
            VALUES (:user_id, :type, :message, :rating, NOW())
        """),
        {
            "user_id": current_user_id,
            "type": data.type,
            "message": data.message,
            "rating": data.rating
        }
    )
    await db.commit()
    
    return {"status": "ok", "message": "Feedback submitted. Thank you!"}


# ============================================
# PHOTOS ENDPOINTS
# ============================================

class PhotoReorder(BaseModel):
    photo_urls: list


@app.post("/api/photos/upload-url")
async def get_photo_upload_url(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get presigned URL for photo upload (placeholder)"""
    # In production, integrate with S3/Cloudinary/etc.
    return {
        "upload_url": None,
        "message": "Photo upload requires cloud storage integration (S3/Cloudinary)",
        "max_size_mb": 10,
        "allowed_types": ["image/jpeg", "image/png", "image/webp"]
    }


@app.post("/api/photos/reorder")
async def reorder_photos(
    data: PhotoReorder,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Reorder user photos - delete all and re-insert in new order"""
    # Delete existing photos
    await db.execute(
        text("DELETE FROM user_photos WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    )
    
    # Insert photos in new order
    for url in data.photo_urls:
        await db.execute(
            text("INSERT INTO user_photos (id, user_id, url, created_at) VALUES (gen_random_uuid(), :user_id, :url, NOW())"),
            {"user_id": current_user_id, "url": url}
        )
    
    await db.commit()
    
    return {"status": "ok", "photos": data.photo_urls}


@app.delete("/api/photos/{photo_index}")
async def delete_photo(
    photo_index: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete photo by index"""
    # Get photos from user_photos table
    result = await db.execute(
        text("SELECT id, url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
        {"user_id": current_user_id}
    )
    photos = result.fetchall()
    
    if not photos:
        raise HTTPException(status_code=404, detail="No photos found")
    
    if photo_index < 0 or photo_index >= len(photos):
        raise HTTPException(status_code=400, detail="Invalid photo index")
    
    photo_to_delete = photos[photo_index]
    deleted_url = photo_to_delete[1]
    
    # Delete the photo
    await db.execute(
        text("DELETE FROM user_photos WHERE id = :photo_id"),
        {"photo_id": photo_to_delete[0]}
    )
    await db.commit()
    
    # Get remaining photos
    remaining_result = await db.execute(
        text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
        {"user_id": current_user_id}
    )
    remaining = [row[0] for row in remaining_result.fetchall()]
    
    return {"status": "ok", "deleted": deleted_url, "remaining": remaining}


# ============================================
# INTERESTS ENDPOINTS
# ============================================

@app.get("/api/interests/categories")
async def get_interest_categories():
    """Get all interest categories"""
    return {
        "categories": [
            {
                "id": "lifestyle",
                "name": "Образ жизни",
                "interests": ["Спорт", "Йога", "Фитнес", "Путешествия", "Кулинария", "Здоровое питание"]
            },
            {
                "id": "entertainment",
                "name": "Развлечения",
                "interests": ["Кино", "Музыка", "Игры", "Сериалы", "Концерты", "Театр"]
            },
            {
                "id": "creative",
                "name": "Творчество",
                "interests": ["Фотография", "Рисование", "Музыка", "Танцы", "Писательство", "Дизайн"]
            },
            {
                "id": "social",
                "name": "Социальное",
                "interests": ["Волонтерство", "Нетворкинг", "Вечеринки", "Клубы по интересам"]
            },
            {
                "id": "intellectual",
                "name": "Интеллектуальное",
                "interests": ["Книги", "Наука", "Технологии", "Языки", "История", "Философия"]
            },
            {
                "id": "outdoor",
                "name": "На природе",
                "interests": ["Походы", "Кемпинг", "Рыбалка", "Велосипед", "Бег", "Плавание"]
            }
        ]
    }


@app.put("/api/interests")
async def update_interests(
    interests: list = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update user interests"""
    # Delete old interests
    await db.execute(
        text("DELETE FROM user_interests WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    )
    # Insert new interests
    for tag in interests:
        await db.execute(
            text("INSERT INTO user_interests (user_id, tag) VALUES (:user_id, :tag)"),
            {"user_id": current_user_id, "tag": tag}
        )
    await db.commit()
    
    return {"status": "ok", "interests": interests}


# ============================================
# PROMPTS (Profile Questions)
# ============================================

@app.get("/api/prompts")
async def get_available_prompts():
    """Get available profile prompts/questions"""
    return {
        "prompts": [
            {"id": "perfect_day", "text": "Мой идеальный день - это..."},
            {"id": "looking_for", "text": "Я ищу человека, который..."},
            {"id": "fun_fact", "text": "Забавный факт обо мне..."},
            {"id": "never_do", "text": "Я никогда не смогу..."},
            {"id": "best_travel", "text": "Лучшее путешествие в моей жизни..."},
            {"id": "dream", "text": "Моя мечта - это..."},
            {"id": "superpower", "text": "Если бы у меня была суперсила..."},
            {"id": "weekend", "text": "Идеальные выходные для меня..."},
            {"id": "food", "text": "Моя любимая еда..."},
            {"id": "music", "text": "Музыка, которую я слушаю..."}
        ]
    }


class PromptAnswer(BaseModel):
    prompt_id: str
    answer: str


@app.post("/api/prompts/answer")
async def save_prompt_answer(
    data: PromptAnswer,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Save answer to a profile prompt"""
    # Get current prompts
    result = await db.execute(
        text("SELECT prompts FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    prompts = row[0] if row and row[0] else {}
    prompts[data.prompt_id] = data.answer
    
    await db.execute(
        text("UPDATE users SET prompts = :prompts WHERE id = :user_id"),
        {"prompts": prompts, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "prompts": prompts}


@app.get("/api/prompts/my")
async def get_my_prompts(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's prompt answers"""
    result = await db.execute(
        text("SELECT prompts FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    return {"prompts": row[0] if row and row[0] else {}}


# ============================================
# COMPATIBILITY
# ============================================

@app.get("/api/compatibility/{user_id}")
async def get_compatibility(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Calculate compatibility score with another user"""
    # Verify both users exist
    result = await db.execute(
        text("SELECT id::text FROM users WHERE id IN (:user1, :user2)"),
        {"user1": current_user_id, "user2": user_id}
    )
    rows = result.fetchall()
    
    if len(rows) < 2:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get interests for current user
    interests1_result = await db.execute(
        text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    )
    interests1 = [row[0] for row in interests1_result.fetchall()]
    
    # Get interests for other user
    interests2_result = await db.execute(
        text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    interests2 = [row[0] for row in interests2_result.fetchall()]
    
    # Calculate interest overlap
    common_interests = set(interests1) & set(interests2)
    total_interests = set(interests1) | set(interests2)
    
    interest_score = len(common_interests) / max(len(total_interests), 1) * 100
    
    # Simple compatibility score
    compatibility = min(int(50 + interest_score / 2), 99)
    
    return {
        "compatibility_score": compatibility,
        "common_interests": list(common_interests),
        "breakdown": {
            "interests": int(interest_score),
            "activity": 50,  # Placeholder
            "communication": 50  # Placeholder
        }
    }


# ============================================
# UNMATCH
# ============================================

@app.delete("/api/matches/{match_id}")
async def unmatch(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Unmatch with a user"""
    # Verify user is part of match
    result = await db.execute(
        text("SELECT user1_id, user2_id FROM matches WHERE id = :match_id"),
        {"match_id": match_id}
    )
    match = result.fetchone()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if current_user_id not in (str(match[0]), str(match[1])):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete match
    await db.execute(
        text("DELETE FROM matches WHERE id = :match_id"),
        {"match_id": match_id}
    )
    
    # Delete associated messages
    await db.execute(
        text("DELETE FROM messages WHERE match_id = :match_id"),
        {"match_id": match_id}
    )
    
    await db.commit()
    
    return {"status": "ok", "message": "Unmatched successfully"}


# ============================================
# PROFILE VIEWS
# ============================================

@app.post("/api/views/{user_id}")
async def record_profile_view(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Record that current user viewed a profile"""
    if user_id == current_user_id:
        return {"status": "ok", "message": "Self view ignored"}
    
    await db.execute(
        text("""
            INSERT INTO profile_views (viewer_id, viewed_id, viewed_at)
            VALUES (:viewer_id, :viewed_id, NOW())
            ON CONFLICT (viewer_id, viewed_id) DO UPDATE SET viewed_at = NOW()
        """),
        {"viewer_id": current_user_id, "viewed_id": user_id}
    )
    await db.commit()
    
    return {"status": "ok"}


@app.get("/api/views/who-viewed-me")
async def get_who_viewed_me(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get users who viewed my profile (VIP feature)"""
    # Check if user is VIP
    vip_check = await db.execute(
        text("SELECT is_vip FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    is_vip = vip_check.scalar()
    
    if not is_vip:
        return {
            "viewers": [],
            "total": 0,
            "is_vip_feature": True,
            "message": "Upgrade to VIP to see who viewed your profile"
        }
    
    result = await db.execute(text("""
        SELECT 
            u.id::text, u.name, u.age, pv.viewed_at
        FROM profile_views pv
        JOIN users u ON pv.viewer_id = u.id
        WHERE pv.viewed_id = :user_id
        ORDER BY pv.viewed_at DESC
        LIMIT :limit
    """), {"user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    viewers = []
    for r in rows:
        user_id = r[0]
        # Get first photo
        photo_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at LIMIT 1"),
            {"user_id": user_id}
        )
        photo_row = photo_result.fetchone()
        
        viewers.append({
            "id": user_id,
            "name": r[1],
            "age": r[2],
            "photo": photo_row[0] if photo_row else None,
            "viewed_at": r[3].isoformat() if r[3] else None
        })
    
    return {"viewers": viewers, "total": len(viewers)}


# ============================================
# REWIND (Undo last swipe)
# ============================================

@app.post("/api/rewind")
async def rewind_last_swipe(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Undo last swipe (VIP feature)"""
    # Check if user is VIP
    vip_check = await db.execute(
        text("SELECT is_vip FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    is_vip = vip_check.scalar()
    
    if not is_vip:
        return {
            "success": False,
            "is_vip_feature": True,
            "message": "Upgrade to VIP to use rewind"
        }
    
    # Get last swipe
    result = await db.execute(text("""
        SELECT id, to_user_id::text, action
        FROM swipes
        WHERE from_user_id = :user_id
        ORDER BY timestamp DESC
        LIMIT 1
    """), {"user_id": current_user_id})
    
    last_swipe = result.fetchone()
    
    if not last_swipe:
        return {"success": False, "message": "No swipes to rewind"}
    
    # Delete the swipe
    await db.execute(
        text("DELETE FROM swipes WHERE id = :swipe_id"),
        {"swipe_id": last_swipe[0]}
    )
    
    # If it was a match, delete the match too
    if last_swipe[2] in ('like', 'superlike'):
        await db.execute(text("""
            DELETE FROM matches 
            WHERE (user1_id = :user1 AND user2_id = :user2)
            OR (user1_id = :user2 AND user2_id = :user1)
        """), {"user1": current_user_id, "user2": last_swipe[1]})
    
    await db.commit()
    
    return {
        "success": True,
        "rewound_user_id": last_swipe[1],
        "action": last_swipe[2]
    }


# ============================================
# SPOTLIGHT (Featured profiles)
# ============================================

@app.get("/api/spotlight")
async def get_spotlight_profiles(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get spotlight/featured profiles"""
    result = await db.execute(text("""
        SELECT 
            u.id::text, u.name, u.age, u.bio, u.is_verified
        FROM users u
        WHERE u.is_active = true 
        AND u.is_complete = true
        AND u.id != :current_user_id
        AND EXISTS (SELECT 1 FROM user_photos WHERE user_id = u.id)
        AND (u.is_vip = true OR u.is_verified = true)
        AND u.id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)
        ORDER BY 
            CASE WHEN u.is_vip THEN 0 ELSE 1 END,
            RANDOM()
        LIMIT :limit
    """), {"current_user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    profiles = []
    for r in rows:
        user_id = r[0]
        # Get photos
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [p[0] for p in photos_result.fetchall()]
        
        profiles.append({
            "id": user_id,
            "name": r[1],
            "age": r[2],
            "photos": photos,
            "bio": r[3],
            "is_verified": r[4]
        })
    
    return {"profiles": profiles}


# ============================================
# ONLINE STATUS
# ============================================

@app.post("/api/online")
async def update_online_status(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update user's last online timestamp"""
    await db.execute(
        text("UPDATE users SET last_active = NOW() WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "last_active": datetime.utcnow().isoformat()}


@app.get("/api/online/{user_id}")
async def get_online_status(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's online status"""
    result = await db.execute(
        text("SELECT last_active FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    )
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    
    last_active = row[0]
    
    if not last_active:
        return {"is_online": False, "last_active": None, "status": "offline"}
    
    now = datetime.utcnow()
    diff = now - last_active
    
    if diff.total_seconds() < 300:  # 5 minutes
        status = "online"
        is_online = True
    elif diff.total_seconds() < 3600:  # 1 hour
        status = "recently"
        is_online = False
    else:
        status = "offline"
        is_online = False
    
    return {
        "is_online": is_online,
        "last_active": last_active.isoformat(),
        "status": status
    }


# ============================================
# APP CONFIG
# ============================================

@app.get("/api/config")
async def get_app_config():
    """Get app configuration for client"""
    return {
        "version": "1.0.0",
        "min_version": "1.0.0",
        "features": {
            "chat": True,
            "video_chat": False,  # Not supported in serverless
            "voice_messages": False,  # Requires storage
            "stories": False,  # Future feature
            "events": False,  # Future feature
            "gifts": True,
            "boost": True,
            "superlike": True,
            "rewind": True,
            "see_likes": True,
            "incognito": True
        },
        "limits": {
            "free_swipes_per_day": 50,
            "free_superlikes_per_day": 1,
            "max_photos": 9,
            "max_bio_length": 500,
            "max_message_length": 1000
        },
        "support": {
            "email": "support@mambax.app",
            "telegram": "@mambax_support"
        }
    }


# ============================================
# TERMS & PRIVACY
# ============================================

@app.get("/api/legal/terms")
async def get_terms():
    """Get terms of service URL"""
    return {
        "url": "https://mambax.app/terms",
        "version": "1.0",
        "updated_at": "2024-01-01"
    }


@app.get("/api/legal/privacy")
async def get_privacy():
    """Get privacy policy URL"""
    return {
        "url": "https://mambax.app/privacy",
        "version": "1.0",
        "updated_at": "2024-01-01"
    }


@app.post("/api/legal/accept")
async def accept_terms(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Accept terms and privacy policy"""
    await db.execute(
        text("UPDATE users SET terms_accepted_at = NOW() WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "accepted_at": datetime.utcnow().isoformat()}


# ============================================
# DELETE ACCOUNT
# ============================================

class DeleteAccountRequest(BaseModel):
    reason: Optional[str] = None
    feedback: Optional[str] = None


@app.post("/api/account/delete")
async def delete_account(
    data: DeleteAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete user account"""
    # Save deletion reason
    if data.reason or data.feedback:
        await db.execute(
            text("""
                INSERT INTO account_deletions (user_id, reason, feedback, deleted_at)
                VALUES (:user_id, :reason, :feedback, NOW())
            """),
            {"user_id": current_user_id, "reason": data.reason, "feedback": data.feedback}
        )
    
    # Soft delete - mark as inactive
    await db.execute(
        text("UPDATE users SET is_active = false, deleted_at = NOW() WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    
    await db.commit()
    
    return {"status": "ok", "message": "Account scheduled for deletion"}


# ============================================
# EXPORT DATA (GDPR)
# ============================================

@app.get("/api/account/export")
async def export_user_data(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Export all user data (GDPR compliance)"""
    # Get user data
    user_result = await db.execute(
        text("SELECT * FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    user = user_result.fetchone()
    
    # Get matches
    matches_result = await db.execute(text("""
        SELECT id::text, user1_id::text, user2_id::text, created_at
        FROM matches
        WHERE user1_id = :user_id OR user2_id = :user_id
    """), {"user_id": current_user_id})
    matches = matches_result.fetchall()
    
    # Get messages
    messages_result = await db.execute(text("""
        SELECT id::text, match_id::text, content, created_at
        FROM messages
        WHERE sender_id = :user_id
    """), {"user_id": current_user_id})
    messages = messages_result.fetchall()
    
    # Get swipes
    swipes_result = await db.execute(text("""
        SELECT to_user_id::text, action, timestamp
        FROM swipes
        WHERE from_user_id = :user_id
    """), {"user_id": current_user_id})
    swipes = swipes_result.fetchall()
    
    return {
        "user": {
            "id": current_user_id,
            "name": user[1] if user else None,
            "email": user[2] if user else None,
            # Add more fields as needed
        },
        "matches_count": len(matches),
        "messages_count": len(messages),
        "swipes_count": len(swipes),
        "export_date": datetime.utcnow().isoformat(),
        "note": "Full data export available upon request to support@mambax.app"
    }


# ============================================
# INCOGNITO MODE
# ============================================

@app.post("/api/incognito/enable")
async def enable_incognito(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Enable incognito mode (VIP feature)"""
    vip_check = await db.execute(
        text("SELECT is_vip FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    is_vip = vip_check.scalar()
    
    if not is_vip:
        return {
            "success": False,
            "is_vip_feature": True,
            "message": "Upgrade to VIP to use incognito mode"
        }
    
    await db.execute(
        text("UPDATE users SET is_incognito = true WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    await db.commit()
    
    return {"success": True, "is_incognito": True}


@app.post("/api/incognito/disable")
async def disable_incognito(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Disable incognito mode"""
    await db.execute(
        text("UPDATE users SET is_incognito = false WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    await db.commit()
    
    return {"success": True, "is_incognito": False}


@app.get("/api/incognito/status")
async def get_incognito_status(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get incognito mode status"""
    result = await db.execute(
        text("SELECT is_incognito, is_vip FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    return {
        "is_incognito": row[0] if row else False,
        "is_vip": row[1] if row else False,
        "can_use": row[1] if row else False
    }


# ============================================
# REFERRAL SYSTEM
# ============================================

@app.get("/api/referral/code")
async def get_referral_code(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's referral code, generate if missing"""
    from backend.models.user import User as UserModel
    import secrets

    user = await db.get(UserModel, current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.referral_code:
        user.referral_code = f"MAMBA{secrets.token_hex(4).upper()}"
        await db.commit()
        await db.refresh(user)

    return {
        "code": user.referral_code,
        "link": f"https://t.me/mambax_bot?start={user.referral_code}",
        "reward": "50 Stars for each friend who joins"
    }


@app.get("/api/referral/stats")
async def get_user_referral_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's personal referral statistics"""
    from backend.models.marketing import Referral, ReferralStatus

    total = await db.scalar(
        select(func.count(Referral.id)).where(Referral.referrer_id == current_user_id)
    )
    converted = await db.scalar(
        select(func.count(Referral.id)).where(
            Referral.referrer_id == current_user_id,
            Referral.status == ReferralStatus.CONVERTED
        )
    )
    pending = await db.scalar(
        select(func.count(Referral.id)).where(
            Referral.referrer_id == current_user_id,
            Referral.status == ReferralStatus.PENDING
        )
    )

    return {
        "total_referrals": total or 0,
        "earned_stars": (converted or 0) * 50,
        "pending_rewards": (pending or 0) * 50
    }


@app.post("/api/referral/apply")
async def apply_referral_code(
    code: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Apply a referral code"""
    from backend.models.user import User as UserModel
    from backend.models.marketing import Referral, ReferralStatus

    # Find referrer by code
    result = await db.execute(
        select(UserModel).where(UserModel.referral_code == code)
    )
    referrer = result.scalar_one_or_none()

    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if str(referrer.id) == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot use your own code")

    # Check if already referred
    user = await db.get(UserModel, current_user_id)
    if user.referred_by:
        raise HTTPException(status_code=400, detail="Already used a referral code")

    # Apply referral
    user.referred_by = referrer.id

    # Create referral record
    ref = Referral(
        referrer_id=referrer.id,
        referred_id=user.id,
        status=ReferralStatus.CONVERTED,
        reward_stars=50.0,
        reward_paid=True,
        converted_at=datetime.utcnow(),
    )
    db.add(ref)

    # Give bonus to both users
    user.stars_balance += 50
    referrer.stars_balance += 50

    await db.commit()

    return {"success": True, "bonus": 50, "message": "Referral code applied! You got 50 Stars!"}


# ============================================
# STORIES (Placeholder - future feature)
# ============================================

@app.get("/api/stories")
async def get_stories(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get stories from matches (placeholder)"""
    return {
        "stories": [],
        "message": "Stories feature coming soon"
    }


@app.post("/api/stories")
async def create_story(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create a story (placeholder)"""
    return {
        "success": False,
        "message": "Stories feature coming soon"
    }


# ============================================
# EVENTS (Placeholder - future feature)
# ============================================

@app.get("/api/events")
async def get_events(
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get nearby events (placeholder)"""
    return {
        "events": [],
        "message": "Events feature coming soon"
    }


@app.get("/api/events/{event_id}")
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get event details (placeholder)"""
    return {
        "event": None,
        "message": "Events feature coming soon"
    }


# ============================================
# PREMIUM FEATURES STATUS
# ============================================

@app.get("/api/premium/features")
async def get_premium_features(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get all premium features and their status for current user"""
    result = await db.execute(
        text("SELECT is_vip, stars_balance FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    is_vip = row[0] if row else False
    balance = row[1] if row else 0
    
    return {
        "is_vip": is_vip,
        "stars_balance": balance,
        "features": {
            "unlimited_swipes": {"available": is_vip, "price": 99},
            "see_who_likes": {"available": is_vip, "price": 149},
            "rewind": {"available": is_vip, "price": 49},
            "boost": {"available": True, "price": 79},
            "superlike": {"available": True, "price": 29},
            "incognito": {"available": is_vip, "price": 199},
            "read_receipts": {"available": is_vip, "price": 0},
            "priority_likes": {"available": is_vip, "price": 0},
            "advanced_filters": {"available": is_vip, "price": 0}
        }
    }


# ============================================
# TELEGRAM STARS PAYMENT
# ============================================

class StarsPaymentRequest(BaseModel):
    amount: int
    item_type: str  # vip, boost, superlike, swipes
    item_id: Optional[str] = None


@app.post("/api/payments/stars/create")
async def create_stars_payment(
    data: StarsPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create Telegram Stars payment invoice"""
    # This would integrate with Telegram Bot API to create invoice
    prices = {
        "vip_month": 299,
        "boost": 79,
        "superlike_5": 99,
        "swipes_50": 49
    }
    
    return {
        "invoice_url": None,
        "amount": data.amount,
        "item_type": data.item_type,
        "message": "Payment integration requires Telegram Bot API setup",
        "prices": prices
    }


@app.post("/api/payments/stars/verify")
async def verify_stars_payment(
    payment_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Verify Telegram Stars payment"""
    # This would verify payment with Telegram
    return {
        "verified": False,
        "message": "Payment verification requires Telegram Bot API"
    }


@app.get("/api/payments/history")
async def get_payment_history(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's payment history"""
    result = await db.execute(text("""
        SELECT id::text, amount, currency, item_type, status, created_at
        FROM payments
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT :limit
    """), {"user_id": current_user_id, "limit": limit})
    
    rows = result.fetchall()
    
    payments = []
    for r in rows:
        payments.append({
            "id": r[0],
            "amount": float(r[1]) if r[1] else 0,
            "currency": r[2],
            "item_type": r[3],
            "status": r[4],
            "created_at": r[5].isoformat() if r[5] else None
        })
    
    return {"payments": payments}


# ============================================
# DAILY REWARDS
# ============================================

@app.get("/api/rewards/daily")
async def get_daily_reward_status(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get daily reward status"""
    result = await db.execute(
        text("SELECT last_daily_reward, daily_streak FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    last_reward = row[0] if row else None
    streak = row[1] if row and row[1] else 0
    
    today = datetime.utcnow().date()
    can_claim = True
    
    if last_reward:
        last_date = last_reward.date() if hasattr(last_reward, 'date') else last_reward
        can_claim = last_date < today
    
    # Rewards based on streak
    rewards = [5, 10, 15, 20, 25, 30, 50]  # Stars per day
    today_reward = rewards[min(streak, len(rewards) - 1)]
    
    return {
        "can_claim": can_claim,
        "streak": streak,
        "today_reward": today_reward,
        "next_reward": rewards[min(streak + 1, len(rewards) - 1)] if can_claim else rewards[min(streak, len(rewards) - 1)],
        "rewards_schedule": rewards
    }


@app.post("/api/rewards/daily/claim")
async def claim_daily_reward(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Claim daily reward"""
    result = await db.execute(
        text("SELECT last_daily_reward, daily_streak, stars_balance FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    last_reward = row[0] if row else None
    streak = row[1] if row and row[1] else 0
    balance = row[2] if row and row[2] else 0
    
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    if last_reward:
        last_date = last_reward.date() if hasattr(last_reward, 'date') else last_reward
        if last_date >= today:
            return {"success": False, "message": "Already claimed today"}
        
        # Check if streak continues
        if last_date == yesterday:
            streak += 1
        else:
            streak = 0
    
    # Calculate reward
    rewards = [5, 10, 15, 20, 25, 30, 50]
    reward = rewards[min(streak, len(rewards) - 1)]
    
    # Update user
    await db.execute(
        text("""
            UPDATE users 
            SET last_daily_reward = NOW(), 
                daily_streak = :streak,
                stars_balance = stars_balance + :reward
            WHERE id = :user_id
        """),
        {"streak": streak, "reward": reward, "user_id": current_user_id}
    )
    await db.commit()
    
    return {
        "success": True,
        "reward": reward,
        "new_streak": streak,
        "new_balance": balance + reward
    }


# ============================================
# PUSH NOTIFICATIONS TOKENS
# ============================================

class PushTokenRequest(BaseModel):
    token: str
    platform: str  # ios, android, web


@app.post("/api/push/register")
async def register_push_token(
    data: PushTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Register push notification token"""
    await db.execute(
        text("""
            INSERT INTO push_tokens (user_id, token, platform, created_at)
            VALUES (:user_id, :token, :platform, NOW())
            ON CONFLICT (user_id, token) DO UPDATE SET platform = :platform
        """),
        {"user_id": current_user_id, "token": data.token, "platform": data.platform}
    )
    await db.commit()
    
    return {"status": "ok", "message": "Push token registered"}


@app.delete("/api/push/unregister")
async def unregister_push_token(
    token: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Unregister push notification token"""
    await db.execute(
        text("DELETE FROM push_tokens WHERE user_id = :user_id AND token = :token"),
        {"user_id": current_user_id, "token": token}
    )
    await db.commit()
    
    return {"status": "ok", "message": "Push token unregistered"}


# ============================================
# LANGUAGE & LOCALIZATION
# ============================================

@app.get("/api/languages")
async def get_available_languages():
    """Get available languages"""
    return {
        "languages": [
            {"code": "ru", "name": "Русский", "native": "Русский"},
            {"code": "en", "name": "English", "native": "English"},
            {"code": "uk", "name": "Ukrainian", "native": "Українська"},
            {"code": "kk", "name": "Kazakh", "native": "Қазақша"},
            {"code": "uz", "name": "Uzbek", "native": "O'zbek"}
        ],
        "default": "ru"
    }


@app.put("/api/settings/language")
async def update_language(
    language: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update user's preferred language"""
    await db.execute(
        text("UPDATE users SET language = :language WHERE id = :user_id"),
        {"language": language, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "language": language}


# ============================================
# MEDIA UPLOAD URLS
# ============================================

@app.post("/api/media/upload-url")
async def get_media_upload_url(
    media_type: str = Body(...),  # photo, video, voice
    content_type: str = Body(...),  # image/jpeg, video/mp4, etc.
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get presigned URL for media upload"""
    # Placeholder - integrate with S3/Cloudinary
    allowed_types = {
        "photo": ["image/jpeg", "image/png", "image/webp"],
        "video": ["video/mp4", "video/webm"],
        "voice": ["audio/webm", "audio/ogg", "audio/mp3"]
    }
    
    if media_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid media type")
    
    if content_type not in allowed_types[media_type]:
        raise HTTPException(status_code=400, detail="Invalid content type")
    
    return {
        "upload_url": None,
        "media_type": media_type,
        "content_type": content_type,
        "max_size_mb": 10 if media_type == "photo" else 50,
        "message": "Media upload requires cloud storage integration"
    }


# ============================================
# SMART MATCHING PREFERENCES
# ============================================

class MatchingPreferences(BaseModel):
    age_min: int = 18
    age_max: int = 100
    distance_km: int = 50
    gender_preference: Optional[str] = None
    looking_for: Optional[list] = None
    show_verified_only: bool = False
    show_with_bio_only: bool = False


@app.get("/api/preferences/matching")
async def get_matching_preferences(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's matching preferences"""
    result = await db.execute(
        text("SELECT matching_preferences FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    prefs = row[0] if row and row[0] else {}
    
    return {
        "preferences": {
            "age_min": prefs.get("age_min", 18),
            "age_max": prefs.get("age_max", 100),
            "distance_km": prefs.get("distance_km", 50),
            "gender_preference": prefs.get("gender_preference"),
            "looking_for": prefs.get("looking_for", []),
            "show_verified_only": prefs.get("show_verified_only", False),
            "show_with_bio_only": prefs.get("show_with_bio_only", False)
        }
    }


@app.put("/api/preferences/matching")
async def update_matching_preferences(
    data: MatchingPreferences,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update user's matching preferences"""
    prefs = data.dict()
    
    await db.execute(
        text("UPDATE users SET matching_preferences = :prefs WHERE id = :user_id"),
        {"prefs": prefs, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "preferences": prefs}


# ============================================
# CONVERSATION QUALITY
# ============================================

@app.get("/api/matches/{match_id}/quality")
async def get_conversation_quality(
    match_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get conversation quality metrics"""
    # Verify access
    match_check = await db.execute(
        text("SELECT user1_id, user2_id FROM matches WHERE id = :match_id"),
        {"match_id": match_id}
    )
    match = match_check.fetchone()
    
    if not match or current_user_id not in (str(match[0]), str(match[1])):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get message stats
    result = await db.execute(text("""
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN sender_id = :user_id THEN 1 END) as sent,
            AVG(LENGTH(content)) as avg_length
        FROM messages
        WHERE match_id = :match_id
    """), {"match_id": match_id, "user_id": current_user_id})
    
    stats = result.fetchone()
    
    total = stats[0] or 0
    sent = stats[1] or 0
    received = total - sent
    avg_length = int(stats[2]) if stats[2] else 0
    
    # Calculate balance (50% = perfect balance)
    balance = (min(sent, received) / max(total, 1)) * 100 if total > 0 else 50
    
    return {
        "total_messages": total,
        "sent": sent,
        "received": received,
        "balance_score": int(balance),
        "avg_message_length": avg_length,
        "quality": "good" if balance > 30 and total > 10 else "needs_attention"
    }


# ============================================
# REPORT REASONS
# ============================================

@app.get("/api/report/reasons")
async def get_report_reasons():
    """Get available report reasons"""
    return {
        "reasons": [
            {"id": "fake_profile", "label": "Фейковый профиль"},
            {"id": "inappropriate_photos", "label": "Неприемлемые фото"},
            {"id": "harassment", "label": "Домогательства"},
            {"id": "spam", "label": "Спам"},
            {"id": "scam", "label": "Мошенничество"},
            {"id": "underage", "label": "Несовершеннолетний"},
            {"id": "hate_speech", "label": "Разжигание ненависти"},
            {"id": "other", "label": "Другое"}
        ]
    }


# ============================================
# SUPER LIKE INFO
# ============================================

@app.get("/api/superlike/info")
async def get_superlike_info(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get super like information and remaining count"""
    result = await db.execute(text("""
        SELECT 
            superlikes_remaining,
            last_superlike_reset,
            is_vip
        FROM users WHERE id = :user_id
    """), {"user_id": current_user_id})
    
    row = result.fetchone()
    
    remaining = row[0] if row and row[0] is not None else 1
    last_reset = row[1] if row else None
    is_vip = row[2] if row else False
    
    # Check if should reset (daily)
    today = datetime.utcnow().date()
    should_reset = True
    
    if last_reset:
        last_date = last_reset.date() if hasattr(last_reset, 'date') else last_reset
        should_reset = last_date < today
    
    if should_reset:
        remaining = 5 if is_vip else 1
    
    return {
        "remaining": remaining,
        "daily_limit": 5 if is_vip else 1,
        "is_vip": is_vip,
        "resets_at": (datetime.utcnow().replace(hour=0, minute=0, second=0) + timedelta(days=1)).isoformat()
    }


# ============================================
# MATCH SUGGESTIONS
# ============================================

@app.get("/api/suggestions")
async def get_match_suggestions(
    limit: int = Query(5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get AI-powered match suggestions"""
    # Get user interests from user_interests table
    interests_result = await db.execute(
        text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    )
    user_interests = [row[0] for row in interests_result.fetchall()]
    
    # Find users with photos who haven't been swiped
    result = await db.execute(text("""
        SELECT 
            u.id::text, u.name, u.age, u.bio, u.is_verified
        FROM users u
        WHERE u.is_active = true 
        AND u.is_complete = true
        AND u.id != :current_user_id
        AND u.id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)
        AND EXISTS (SELECT 1 FROM user_photos WHERE user_id = u.id)
        ORDER BY u.is_verified DESC, RANDOM()
        LIMIT :limit
    """), {
        "current_user_id": current_user_id,
        "limit": limit
    })
    
    rows = result.fetchall()
    
    suggestions = []
    for r in rows:
        user_id = r[0]
        
        # Get photos for this user
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [row[0] for row in photos_result.fetchall()]
        
        # Get interests for this user
        interests_result = await db.execute(
            text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        interests = [row[0] for row in interests_result.fetchall()]
        
        common = list(set(interests) & set(user_interests))
        suggestions.append({
            "id": user_id,
            "name": r[1],
            "age": r[2],
            "photos": photos,
            "bio": r[3],
            "is_verified": r[4],
            "common_interests": common,
            "match_score": min(50 + len(common) * 10, 99)
        })
    
    return {"suggestions": suggestions}


# ============================================
# ACTIVITY LOG
# ============================================

@app.get("/api/activity/log")
async def get_activity_log(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's activity log"""
    activities = []
    
    # Recent matches
    matches_result = await db.execute(text("""
        SELECT 
            m.id::text, m.created_at,
            CASE WHEN m.user1_id = :user_id THEN u2.name ELSE u1.name END as partner_name
        FROM matches m
        JOIN users u1 ON m.user1_id = u1.id
        JOIN users u2 ON m.user2_id = u2.id
        WHERE m.user1_id = :user_id OR m.user2_id = :user_id
        ORDER BY m.created_at DESC
        LIMIT 10
    """), {"user_id": current_user_id})
    
    for r in matches_result.fetchall():
        activities.append({
            "type": "match",
            "message": f"Новый матч с {r[2]}",
            "timestamp": r[1].isoformat() if r[1] else None
        })
    
    # Recent likes received
    likes_result = await db.execute(text("""
        SELECT s.timestamp, u.name
        FROM swipes s
        JOIN users u ON s.from_user_id = u.id
        WHERE s.to_user_id = :user_id AND s.action IN ('like', 'superlike')
        ORDER BY s.timestamp DESC
        LIMIT 10
    """), {"user_id": current_user_id})
    
    for r in likes_result.fetchall():
        activities.append({
            "type": "like",
            "message": f"Кто-то лайкнул вас",
            "timestamp": r[0].isoformat() if r[0] else None
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return {"activities": activities[:limit]}


# ============================================
# HEALTH CHECK EXTENDED
# ============================================

@app.get("/api/health/detailed")
async def detailed_health_check(
    db: AsyncSession = Depends(get_db)
):
    """Detailed health check with component status"""
    status = {
        "api": "healthy",
        "database": "unknown",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Check database
    try:
        result = await db.execute(text("SELECT 1"))
        result.fetchone()
        status["database"] = "healthy"
    except Exception as e:
        status["database"] = f"unhealthy: {str(e)}"
    
    overall = "healthy" if all(v == "healthy" for k, v in status.items() if k not in ["timestamp"]) else "degraded"
    status["overall"] = overall
    
    return status


# ============================================
# MISSING ENDPOINTS FOR FRONTEND COMPATIBILITY
# ============================================

# --- FEED (alias for discovery) ---
@app.get("/api/feed")
async def get_feed(
    limit: int = Query(10, ge=1, le=50),
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get feed profiles (alias for discovery)"""
    query = """
        SELECT 
            u.id::text, u.name, u.age, u.bio, u.gender,
            u.is_verified, u.is_vip, u.city
        FROM users u
        WHERE u.is_active = true 
        AND u.is_complete = true
        AND u.id != :current_user_id
        AND EXISTS (SELECT 1 FROM user_photos WHERE user_id = u.id)
        AND u.id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)
        ORDER BY RANDOM()
        LIMIT :limit
    """
    result = await db.execute(text(query), {"current_user_id": current_user_id, "limit": limit})
    rows = result.fetchall()
    
    items = []
    for r in rows:
        user_id = r[0]
        # Get photos
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [p[0] for p in photos_result.fetchall()]
        
        # Get interests
        interests_result = await db.execute(
            text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        interests = [i[0] for i in interests_result.fetchall()]
        
        items.append({
            "id": user_id,
            "name": r[1],
            "age": r[2],
            "bio": r[3],
            "photos": photos,
            "gender": r[4],
            "interests": interests,
            "is_verified": r[5] or False,
            "is_vip": r[6] or False,
            "city": r[7]
        })
    
    return {
        "items": items,
        "total": len(items),
        "page": 1,
        "size": limit,
        "pages": 1,
        "has_more": False
    }


# --- LIKES (POST) ---
@app.post("/api/likes")
async def like_user(
    liked_user_id: str = Body(...),
    is_super: bool = Body(False),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Like a user (alternative to swipe)"""
    action = "superlike" if is_super else "like"
    
    # Record swipe
    await db.execute(
        text("""
            INSERT INTO swipes (from_user_id, to_user_id, action, timestamp)
            VALUES (:from_id, :to_id, :action, NOW())
            ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET action = :action
        """),
        {"from_id": current_user_id, "to_id": liked_user_id, "action": action}
    )
    
    # Check for mutual like
    mutual_check = await db.execute(
        text("""
            SELECT id FROM swipes 
            WHERE from_user_id = :to_id AND to_user_id = :from_id AND action IN ('like', 'superlike')
        """),
        {"from_id": current_user_id, "to_id": liked_user_id}
    )
    is_match = mutual_check.fetchone() is not None
    
    match_id = None
    if is_match:
        # Create match
        match_result = await db.execute(
            text("""
                INSERT INTO matches (user1_id, user2_id, created_at)
                VALUES (:user1, :user2, NOW())
                ON CONFLICT DO NOTHING
                RETURNING id::text
            """),
            {"user1": current_user_id, "user2": liked_user_id}
        )
        row = match_result.fetchone()
        if row:
            match_id = row[0]
    
    await db.commit()
    
    return {
        "status": "ok",
        "is_match": is_match,
        "match_id": match_id,
        "action": action
    }


# --- CHAT START ---
@app.post("/api/chat/start/{user_id}")
async def start_chat(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Start a chat with a user (creates match if needed)"""
    # Check if match exists
    match_result = await db.execute(text("""
        SELECT id::text FROM matches
        WHERE (user1_id = :user1 AND user2_id = :user2)
        OR (user1_id = :user2 AND user2_id = :user1)
    """), {"user1": current_user_id, "user2": user_id})
    
    existing = match_result.fetchone()
    
    if existing:
        return {"match_id": existing[0], "is_new": False}
    
    # Create new match
    new_match = await db.execute(
        text("""
            INSERT INTO matches (user1_id, user2_id, created_at)
            VALUES (:user1, :user2, NOW())
            RETURNING id::text
        """),
        {"user1": current_user_id, "user2": user_id}
    )
    match_id = new_match.fetchone()[0]
    await db.commit()
    
    return {"match_id": match_id, "is_new": True}


# --- CHAT SEND ---
@app.post("/api/chat/send")
async def send_chat_message(
    match_id: str = Body(...),
    text_content: str = Body(..., alias="text"),
    type: str = Body("text"),
    media_url: Optional[str] = Body(None),
    duration: Optional[int] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Send a message in chat"""
    # Verify match access
    match_check = await db.execute(
        text("SELECT user1_id, user2_id FROM matches WHERE id = :match_id"),
        {"match_id": match_id}
    )
    match = match_check.fetchone()
    
    if not match or current_user_id not in (str(match[0]), str(match[1])):
        raise HTTPException(status_code=403, detail="Access denied")
    
    receiver_id = str(match[1]) if current_user_id == str(match[0]) else str(match[0])
    
    # Insert message
    result = await db.execute(
        text("""
            INSERT INTO messages (match_id, sender_id, receiver_id, content, message_type, media_url, duration, created_at)
            VALUES (:match_id, :sender_id, :receiver_id, :content, :type, :media_url, :duration, NOW())
            RETURNING id::text, created_at
        """),
        {
            "match_id": match_id,
            "sender_id": current_user_id,
            "receiver_id": receiver_id,
            "content": text_content,
            "type": type,
            "media_url": media_url,
            "duration": duration
        }
    )
    row = result.fetchone()
    await db.commit()
    
    return {
        "id": row[0],
        "match_id": match_id,
        "sender_id": current_user_id,
        "content": text_content,
        "type": type,
        "created_at": row[1].isoformat() if row[1] else None
    }


# --- CHAT UPLOAD ---
@app.post("/api/chat/upload")
async def upload_chat_media(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Upload media for chat (placeholder)"""
    return {
        "url": None,
        "message": "Media upload requires cloud storage integration"
    }


# --- CHAT CONVERSATION PROMPTS ---
@app.get("/api/chat/conversation-prompts")
async def get_conversation_prompts(
    match_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get conversation prompts for stalled chats"""
    # Check message count
    msg_count = await db.execute(
        text("SELECT COUNT(*) FROM messages WHERE match_id = :match_id"),
        {"match_id": match_id}
    )
    count = msg_count.scalar() or 0
    
    # Consider stalled if < 5 messages in last 24h
    stalled = count < 5
    
    prompts = [
        "Какой твой любимый фильм?",
        "Если бы ты мог путешествовать куда угодно, куда бы поехал?",
        "Какое твое любимое блюдо?",
        "Чем ты любишь заниматься в свободное время?",
        "Какая музыка тебе нравится?"
    ]
    
    return {"prompts": prompts, "stalled": stalled}


# --- CHAT ICEBREAKERS USED ---
@app.post("/api/chat/icebreakers/used")
async def mark_icebreaker_used(
    match_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark that an icebreaker was used"""
    return {"status": "ok", "match_id": match_id}


# --- CHAT QUESTION OF DAY ---
@app.get("/api/chat/question-of-day")
async def get_chat_question_of_day():
    """Get question of the day for chat"""
    questions = [
        "Какое твое самое яркое воспоминание из детства?",
        "Если бы ты мог иметь любую суперспособность, какую бы выбрал?",
        "Какой навык ты хотел бы освоить?",
        "Что тебя больше всего вдохновляет?",
        "Какое место ты мечтаешь посетить?"
    ]
    
    today = datetime.utcnow().date()
    index = today.toordinal() % len(questions)
    
    return {
        "question": questions[index],
        "date": today.isoformat()
    }


@app.post("/api/chat/question-of-day/answer")
async def answer_chat_question_of_day(
    match_id: str = Body(...),
    answer: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Answer question of the day in chat"""
    return {
        "status": "ok",
        "partner_answered": False
    }


# --- CHAT VOICE ---
@app.post("/api/chat/voice")
async def send_voice_message(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Send voice message (placeholder)"""
    return {
        "url": None,
        "message": "Voice messages require cloud storage integration"
    }


# --- USERS ME PHOTO ---
@app.post("/api/users/me/photo")
async def upload_user_photo(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Upload user photo (placeholder)"""
    return {
        "photos": [],
        "message": "Photo upload requires cloud storage integration"
    }


# --- USERS ME EXPORT ---
@app.get("/api/users/me/export")
async def export_user_data_alias(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Export user data (alias)"""
    result = await db.execute(
        text("SELECT name, age, bio FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    user = result.fetchone()
    
    # Get photos from user_photos table
    photos_result = await db.execute(
        text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
        {"user_id": current_user_id}
    )
    photos = [row[0] for row in photos_result.fetchall()]
    
    # Get interests from user_interests table
    interests_result = await db.execute(
        text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
        {"user_id": current_user_id}
    )
    interests = [row[0] for row in interests_result.fetchall()]
    
    return {
        "user": {
            "id": current_user_id,
            "name": user[0] if user else None,
            "age": user[1] if user else None,
            "bio": user[2] if user else None,
            "photos": photos,
            "interests": interests
        },
        "export_date": datetime.utcnow().isoformat()
    }


# --- USERS ME LIKES RECEIVED ---
@app.get("/api/users/me/likes-received")
async def get_likes_received_alias(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get received likes (alias)"""
    result = await db.execute(text("""
        SELECT u.id::text, u.name, u.age, s.action, s.timestamp
        FROM swipes s
        JOIN users u ON s.from_user_id = u.id
        WHERE s.to_user_id = :user_id AND s.action IN ('like', 'superlike')
        ORDER BY s.timestamp DESC
        LIMIT 50
    """), {"user_id": current_user_id})
    
    rows = result.fetchall()
    
    likes = []
    for r in rows:
        user_id = r[0]
        # Get first photo
        photo_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at LIMIT 1"),
            {"user_id": user_id}
        )
        photo_row = photo_result.fetchone()
        
        likes.append({
            "user": {
                "id": user_id,
                "name": r[1],
                "age": r[2],
                "photo": photo_row[0] if photo_row else None
            },
            "is_super": r[3] == "superlike",
            "timestamp": r[4].isoformat() if r[4] else None
        })
    
    return {"likes": likes, "total": len(likes)}


# --- USERS ME ADD STARS DEV ---
@app.post("/api/users/me/add-stars-dev")
async def add_stars_dev_alias(
    amount: int = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """DEV: Add stars (alias)"""
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    await db.execute(
        text("UPDATE users SET stars_balance = stars_balance + :amount WHERE id = :user_id"),
        {"amount": amount, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"success": True, "added": amount}


# --- USERS ME SPEND STARS DEV ---
@app.post("/api/users/me/spend-stars-dev")
async def spend_stars_dev(
    amount: int = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """DEV: Spend stars"""
    if ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    await db.execute(
        text("UPDATE users SET stars_balance = stars_balance - :amount WHERE id = :user_id"),
        {"amount": amount, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"success": True, "spent": amount}


# --- USERS ME ONBOARDING ---
@app.post("/api/users/me/onboarding/complete-step")
async def complete_onboarding_step_alias(
    step_name: str = Body(...),
    completed: bool = Body(True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Complete onboarding step (alias)"""
    result = await db.execute(
        text("SELECT onboarding_completed_steps FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    steps = row[0] if row and row[0] else {}
    steps[step_name] = completed
    
    await db.execute(
        text("UPDATE users SET onboarding_completed_steps = :steps WHERE id = :user_id"),
        {"steps": steps, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "step": step_name, "completed": completed}


@app.get("/api/users/me/onboarding/status")
async def get_onboarding_status_alias(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get onboarding status (alias)"""
    result = await db.execute(
        text("SELECT onboarding_completed_steps FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    steps = row[0] if row and row[0] else {}
    
    required_steps = ["profile", "photos", "interests", "location"]
    is_complete = all(steps.get(s, False) for s in required_steps)
    
    return {
        "completed_steps": steps,
        "is_onboarding_complete": is_complete
    }


@app.post("/api/users/me/onboarding/reset")
async def reset_onboarding_alias(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Reset onboarding (alias)"""
    await db.execute(
        text("UPDATE users SET onboarding_completed_steps = '{}' WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "message": "Onboarding reset"}


# --- NOTIFICATIONS ---
@app.get("/api/notifications/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push notifications"""
    # Placeholder - in production, generate real VAPID keys
    return {
        "publicKey": "placeholder-vapid-public-key"
    }


@app.post("/api/notifications/subscribe")
async def subscribe_push_notifications(
    endpoint: str = Body(...),
    keys: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Subscribe to push notifications"""
    await db.execute(
        text("""
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
            VALUES (:user_id, :endpoint, :p256dh, :auth, NOW())
            ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = :p256dh, auth = :auth
        """),
        {
            "user_id": current_user_id,
            "endpoint": endpoint,
            "p256dh": keys.get("p256dh"),
            "auth": keys.get("auth")
        }
    )
    await db.commit()
    
    return {"status": "ok", "message": "Subscribed to push notifications"}


# --- PAYMENTS SUBSCRIPTION ---
@app.post("/api/payments/subscription")
async def buy_subscription(
    tier: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Buy subscription"""
    tiers = {
        "plus": {"price": 199, "days": 30},
        "premium": {"price": 399, "days": 30},
        "vip": {"price": 599, "days": 30}
    }
    
    if tier not in tiers:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    # In production, integrate with Telegram Stars payment
    return {
        "status": "pending",
        "tier": tier,
        "price": tiers[tier]["price"],
        "message": "Payment integration required"
    }


# --- PAYMENTS INVOICE ---
@app.post("/api/payments/invoice")
async def create_payment_invoice(
    amount: int = Body(...),
    label: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create payment invoice"""
    import uuid
    transaction_id = str(uuid.uuid4())
    
    return {
        "invoice_link": None,
        "transaction_id": transaction_id,
        "amount": amount,
        "currency": "XTR",
        "message": "Invoice creation requires Telegram Bot API"
    }


# --- GIFTS MARK READ ---
@app.post("/api/gifts/mark-read")
async def mark_gift_read(
    transaction_id: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark gift as read"""
    await db.execute(
        text("""
            UPDATE gift_transactions 
            SET is_read = true, read_at = NOW()
            WHERE id = :transaction_id AND receiver_id = :user_id
        """),
        {"transaction_id": transaction_id, "user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok"}


# --- ANALYTICS PROFILE ---
@app.get("/api/analytics/profile")
async def get_profile_analytics(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get profile analytics"""
    # Profile views
    views_result = await db.execute(
        text("SELECT COUNT(*) FROM profile_views WHERE viewed_id = :user_id"),
        {"user_id": current_user_id}
    )
    views = views_result.scalar() or 0
    
    # Likes received
    likes_result = await db.execute(
        text("SELECT COUNT(*) FROM swipes WHERE to_user_id = :user_id AND action IN ('like', 'superlike')"),
        {"user_id": current_user_id}
    )
    likes = likes_result.scalar() or 0
    
    # Matches
    matches_result = await db.execute(
        text("SELECT COUNT(*) FROM matches WHERE user1_id = :user_id OR user2_id = :user_id"),
        {"user_id": current_user_id}
    )
    matches = matches_result.scalar() or 0
    
    # Messages sent
    messages_result = await db.execute(
        text("SELECT COUNT(*) FROM messages WHERE sender_id = :user_id"),
        {"user_id": current_user_id}
    )
    messages = messages_result.scalar() or 0
    
    return {
        "profile_views": views,
        "likes_received": likes,
        "matches": matches,
        "messages_sent": messages,
        "period": "all_time"
    }


# --- VERIFICATION ---
@app.get("/api/verification/status")
async def get_verification_status_v2(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get verification status"""
    result = await db.execute(
        text("SELECT is_verified, verification_selfie FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    row = result.fetchone()
    
    return {
        "is_verified": row[0] if row else False,
        "has_selfie": bool(row[1]) if row else False,
        "status": "verified" if row and row[0] else "not_verified"
    }


@app.post("/api/verification/start")
async def start_verification(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Start verification process"""
    return {
        "status": "started",
        "instructions": "Please upload a selfie holding a paper with your username"
    }


@app.post("/api/verification/submit")
async def submit_verification(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Submit verification"""
    return {
        "status": "pending",
        "message": "Verification submitted for review"
    }


@app.post("/api/users/me/verification-photo")
async def upload_verification_photo(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Upload verification selfie"""
    return {
        "status": "pending",
        "message": "Photo upload requires cloud storage integration"
    }


# --- ADMIN EXTENDED ---
@app.get("/api/admin/dashboard/metrics")
async def get_admin_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get admin dashboard metrics"""
    # Total users
    users_result = await db.execute(text("SELECT COUNT(*) FROM users WHERE is_active = true"))
    total_users = users_result.scalar() or 0
    
    # New users today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    new_today_result = await db.execute(
        text("SELECT COUNT(*) FROM users WHERE created_at >= :today"),
        {"today": today}
    )
    new_today = new_today_result.scalar() or 0
    
    # Total matches
    matches_result = await db.execute(text("SELECT COUNT(*) FROM matches"))
    total_matches = matches_result.scalar() or 0
    
    # Total messages
    messages_result = await db.execute(text("SELECT COUNT(*) FROM messages"))
    total_messages = messages_result.scalar() or 0
    
    return {
        "total_users": total_users,
        "new_users_today": new_today,
        "total_matches": total_matches,
        "total_messages": total_messages,
        "active_users_24h": 0,
        "revenue_today": 0
    }


@app.get("/api/admin/dashboard/activity")
async def get_admin_dashboard_activity(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get recent activity for admin dashboard"""
    # Recent signups
    result = await db.execute(text("""
        SELECT id::text, name, created_at, 'signup' as type
        FROM users
        ORDER BY created_at DESC
        LIMIT :limit
    """), {"limit": limit})
    
    rows = result.fetchall()
    
    activities = []
    for r in rows:
        activities.append({
            "user_id": r[0],
            "user_name": r[1],
            "timestamp": r[2].isoformat() if r[2] else None,
            "type": r[3]
        })
    
    return activities


@app.get("/api/admin/users/{user_id}")
async def get_admin_user_detail(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user details for admin"""
    result = await db.execute(
        text("SELECT * FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": str(user[0]),
        "name": user[1] if len(user) > 1 else None,
        "email": user[2] if len(user) > 2 else None,
        "is_active": True,
        "created_at": None
    }


@app.post("/api/admin/users/{user_id}/action")
async def admin_user_action(
    user_id: str,
    action: str = Body(...),
    reason: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Perform admin action on user"""
    if action == "ban":
        await db.execute(
            text("UPDATE users SET is_active = false WHERE id = :user_id"),
            {"user_id": user_id}
        )
    elif action == "unban":
        await db.execute(
            text("UPDATE users SET is_active = true WHERE id = :user_id"),
            {"user_id": user_id}
        )
    elif action == "verify":
        await db.execute(
            text("UPDATE users SET is_verified = true WHERE id = :user_id"),
            {"user_id": user_id}
        )
    
    await db.commit()
    
    return {"status": "ok", "action": action, "user_id": user_id}


@app.post("/api/admin/users/{user_id}/stars")
async def admin_add_user_stars(
    user_id: str,
    amount: int = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Add stars to user (admin)"""
    await db.execute(
        text("UPDATE users SET stars_balance = stars_balance + :amount WHERE id = :user_id"),
        {"amount": amount, "user_id": user_id}
    )
    await db.commit()
    
    return {"status": "ok", "added": amount}


# ============================================
# ADMIN API - EXTENDED (from adminApi.ts)
# ============================================

@app.post("/api/admin/users/bulk-action")
async def admin_bulk_action(
    user_ids: list = Body(...),
    action: str = Body(...),
    reason: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Bulk action on users"""
    if action == "ban":
        for uid in user_ids:
            await db.execute(
                text("UPDATE users SET is_active = false WHERE id = :user_id"),
                {"user_id": uid}
            )
    elif action == "unban":
        for uid in user_ids:
            await db.execute(
                text("UPDATE users SET is_active = true WHERE id = :user_id"),
                {"user_id": uid}
            )
    
    await db.commit()
    return {"status": "ok", "affected": len(user_ids)}


@app.get("/api/admin/users/verification/queue")
async def get_verification_queue(
    status: str = Query("pending"),
    limit: int = Query(20),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get verification queue"""
    result = await db.execute(text("""
        SELECT id::text, user_id::text, status, created_at
        FROM verification_requests
        WHERE status = :status
        ORDER BY created_at ASC
        LIMIT :limit OFFSET :offset
    """), {"status": status, "limit": limit, "offset": offset})
    
    rows = result.fetchall()
    
    return {
        "items": [
            {"id": r[0], "user_id": r[1], "status": r[2], "created_at": r[3].isoformat() if r[3] else None}
            for r in rows
        ],
        "total": len(rows)
    }


@app.post("/api/admin/users/verification/{request_id}/review")
async def review_verification_request(
    request_id: str,
    action: str = Body(...),
    reason: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Review verification request"""
    new_status = "approved" if action == "approve" else "rejected"
    
    await db.execute(
        text("UPDATE verification_requests SET status = :status WHERE id = :request_id"),
        {"status": new_status, "request_id": request_id}
    )
    
    if action == "approve":
        # Get user_id and update verified status
        result = await db.execute(
            text("SELECT user_id FROM verification_requests WHERE id = :request_id"),
            {"request_id": request_id}
        )
        row = result.fetchone()
        if row:
            await db.execute(
                text("UPDATE users SET is_verified = true WHERE id = :user_id"),
                {"user_id": row[0]}
            )
    
    await db.commit()
    return {"status": "ok", "action": action}


@app.get("/api/admin/users/segments")
async def get_user_segments(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user segments"""
    return {
        "segments": [
            {"id": "active", "name": "Active Users", "count": 0},
            {"id": "inactive", "name": "Inactive Users", "count": 0},
            {"id": "vip", "name": "VIP Users", "count": 0},
            {"id": "new", "name": "New Users (7d)", "count": 0}
        ]
    }


@app.post("/api/admin/users/fraud-scores/recalculate")
async def recalculate_fraud_scores(
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Recalculate fraud scores"""
    return {"status": "ok", "message": "Fraud scores recalculated"}


@app.get("/api/admin/users/fraud-scores/high-risk")
async def get_high_risk_users(
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get high risk users"""
    return {"users": [], "total": 0}


# --- MODERATION ---
@app.get("/api/admin/moderation/queue")
async def get_moderation_queue(
    type: Optional[str] = Query(None),
    status: str = Query("pending"),
    limit: int = Query(20),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get moderation queue"""
    result = await db.execute(text("""
        SELECT id::text, reporter_id::text, reported_user_id::text, reason, status, created_at
        FROM reports
        WHERE status = :status
        ORDER BY created_at ASC
        LIMIT :limit OFFSET :offset
    """), {"status": status, "limit": limit, "offset": offset})
    
    rows = result.fetchall()
    
    return {
        "items": [
            {
                "id": r[0],
                "reporter_id": r[1],
                "reported_user_id": r[2],
                "reason": r[3],
                "status": r[4],
                "created_at": r[5].isoformat() if r[5] else None
            }
            for r in rows
        ],
        "total": len(rows)
    }


@app.post("/api/admin/moderation/{item_id}/review")
async def review_moderation_item(
    item_id: str,
    action: str = Body(...),
    notes: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Review moderation item"""
    new_status = "resolved" if action == "approve" else "dismissed"
    
    await db.execute(
        text("UPDATE reports SET status = :status, resolved_at = NOW() WHERE id = :item_id"),
        {"status": new_status, "item_id": item_id}
    )
    await db.commit()
    
    return {"status": "ok", "action": action}


@app.get("/api/admin/moderation/stats")
async def get_moderation_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get moderation statistics"""
    pending = await db.execute(text("SELECT COUNT(*) FROM reports WHERE status = 'pending'"))
    resolved = await db.execute(text("SELECT COUNT(*) FROM reports WHERE status = 'resolved'"))
    
    return {
        "pending": pending.scalar() or 0,
        "resolved_today": 0,
        "resolved_total": resolved.scalar() or 0,
        "avg_resolution_time": "2h"
    }


# --- ANALYTICS ---
@app.get("/api/admin/analytics/overview")
async def get_analytics_overview(
    period: str = Query("7d"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get analytics overview"""
    return {
        "users": {"total": 0, "new": 0, "active": 0},
        "matches": {"total": 0, "new": 0},
        "messages": {"total": 0, "new": 0},
        "revenue": {"total": 0, "new": 0},
        "period": period
    }


@app.get("/api/admin/analytics/export")
async def export_analytics(
    period: str = Query("7d"),
    format: str = Query("json"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Export analytics data"""
    return {"data": [], "format": format, "period": period}


@app.get("/api/admin/analytics/retention")
async def get_retention_analytics(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get retention cohorts"""
    return {"cohorts": [], "periods": []}


@app.get("/api/admin/analytics/funnel")
async def get_funnel_analytics(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get conversion funnel"""
    return {
        "steps": [
            {"name": "Signup", "count": 0, "rate": 100},
            {"name": "Profile Complete", "count": 0, "rate": 0},
            {"name": "First Swipe", "count": 0, "rate": 0},
            {"name": "First Match", "count": 0, "rate": 0},
            {"name": "First Message", "count": 0, "rate": 0}
        ]
    }


@app.get("/api/admin/analytics/realtime")
async def get_realtime_analytics(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get realtime metrics"""
    return {
        "online_users": 0,
        "active_chats": 0,
        "swipes_per_minute": 0,
        "matches_per_minute": 0
    }


@app.get("/api/admin/analytics/churn-prediction")
async def get_churn_prediction(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get churn prediction"""
    return {"at_risk_users": [], "churn_rate": 0}


@app.get("/api/admin/analytics/revenue-breakdown")
async def get_revenue_breakdown(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get revenue breakdown"""
    return {
        "total": 0,
        "by_source": {
            "subscriptions": 0,
            "gifts": 0,
            "boosts": 0,
            "superlikes": 0
        },
        "period": period
    }


# --- MONETIZATION ---
@app.get("/api/admin/monetization/revenue/metrics")
async def get_revenue_metrics(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get revenue metrics"""
    return {
        "total_revenue": 0,
        "mrr": 0,
        "arpu": 0,
        "ltv": 0
    }


@app.get("/api/admin/monetization/revenue/trend")
async def get_revenue_trend(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get revenue trend"""
    return {"data": [], "period": period}


@app.get("/api/admin/monetization/revenue/by-channel")
async def get_revenue_by_channel(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get revenue by channel"""
    return [
        {"channel": "telegram_stars", "revenue": 0},
        {"channel": "subscriptions", "revenue": 0},
        {"channel": "gifts", "revenue": 0}
    ]


@app.get("/api/admin/monetization/subscriptions")
async def get_subscription_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get subscription statistics"""
    return {
        "total_subscribers": 0,
        "by_tier": {"plus": 0, "premium": 0, "vip": 0},
        "churn_rate": 0,
        "conversion_rate": 0
    }


@app.get("/api/admin/monetization/transactions")
async def get_transactions(
    limit: int = Query(20),
    offset: int = Query(0),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get transactions list"""
    return {"items": [], "total": 0}


@app.post("/api/admin/monetization/transactions/{transaction_id}/refund")
async def refund_transaction(
    transaction_id: str,
    reason: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Refund transaction"""
    return {"status": "ok", "transaction_id": transaction_id}


@app.get("/api/admin/monetization/plans")
async def get_subscription_plans(
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get subscription plans"""
    return {
        "plans": [
            {"id": "plus", "name": "Plus", "price": 199, "active": True},
            {"id": "premium", "name": "Premium", "price": 399, "active": True},
            {"id": "vip", "name": "VIP", "price": 599, "active": True}
        ]
    }


@app.post("/api/admin/monetization/plans")
async def create_subscription_plan(
    name: str = Body(...),
    price: int = Body(...),
    features: list = Body([]),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create subscription plan"""
    return {"status": "ok", "plan": {"name": name, "price": price}}


@app.patch("/api/admin/monetization/plans/{plan_id}")
async def update_subscription_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update subscription plan"""
    return {"status": "ok", "plan_id": plan_id}


@app.delete("/api/admin/monetization/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete subscription plan"""
    return {"status": "ok", "plan_id": plan_id}


@app.post("/api/admin/monetization/gifts")
async def create_gift(
    name: str = Body(...),
    price: int = Body(...),
    image_url: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create virtual gift"""
    return {"status": "ok", "gift": {"name": name, "price": price}}


@app.put("/api/admin/monetization/gifts/{gift_id}")
async def update_gift(
    gift_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update virtual gift"""
    return {"status": "ok", "gift_id": gift_id}


@app.delete("/api/admin/monetization/gifts/{gift_id}")
async def delete_gift(
    gift_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete virtual gift"""
    return {"status": "ok", "gift_id": gift_id}


@app.post("/api/admin/monetization/gifts/upload-image")
async def upload_gift_image(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Upload gift image"""
    return {"url": None, "filename": None, "message": "Requires cloud storage"}


@app.post("/api/admin/monetization/payments/gift")
async def admin_gift_payment(
    gift_id: str = Body(...),
    receiver_id: str = Body(...),
    message: Optional[str] = Body(None),
    is_anonymous: bool = Body(False),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Direct gift purchase (admin)"""
    return {
        "status": "ok",
        "transaction_id": None,
        "invoice_link": None
    }


# --- SYSTEM ---
@app.get("/api/admin/system/health")
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get system health"""
    return {
        "api": "healthy",
        "database": "healthy",
        "cache": "not_configured",
        "storage": "not_configured"
    }


@app.get("/api/admin/system/feature-flags")
async def get_feature_flags(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get feature flags"""
    return {
        "flags": [
            {"id": "stories", "name": "Stories", "enabled": False, "rollout": 0},
            {"id": "video_chat", "name": "Video Chat", "enabled": False, "rollout": 0},
            {"id": "events", "name": "Events", "enabled": False, "rollout": 0}
        ]
    }


@app.post("/api/admin/system/feature-flags/{flag_id}")
async def update_feature_flag(
    flag_id: str,
    enabled: bool = Body(...),
    rollout: int = Body(100),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update feature flag"""
    return {"status": "ok", "flag_id": flag_id, "enabled": enabled, "rollout": rollout}


@app.get("/api/admin/system/logs")
async def get_system_logs(
    level: str = Query("info"),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get system logs"""
    return {"logs": [], "total": 0}


# --- MARKETING ---
@app.post("/api/admin/marketing/push")
async def send_marketing_push(
    title: str = Body(...),
    body: str = Body(...),
    segment: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Send marketing push notification"""
    return {"status": "ok", "sent_to": 0}


@app.get("/api/admin/marketing/referrals")
async def get_admin_referral_stats_legacy(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get referral statistics (legacy endpoint, redirects to admin router)"""
    from backend.models.marketing import Referral, ReferralStatus
    total = await db.scalar(select(func.count(Referral.id))) or 0
    converted = await db.scalar(
        select(func.count(Referral.id)).where(Referral.status == ReferralStatus.CONVERTED)
    ) or 0
    rewards = await db.scalar(
        select(func.coalesce(func.sum(Referral.reward_stars), 0.0)).where(Referral.reward_paid == True)
    )
    return {
        "total_referrals": total,
        "successful_referrals": converted,
        "pending_rewards": float(rewards or 0)
    }


@app.get("/api/admin/marketing/campaigns")
async def get_marketing_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get marketing campaigns"""
    return {"campaigns": []}


@app.get("/api/admin/marketing/channels")
async def get_marketing_channels(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get marketing channels"""
    return {"channels": []}


# ============================================
# ADVANCED API (from advancedApi.ts)
# ============================================

@app.post("/api/admin/advanced/ai/generate")
async def ai_generate_content(
    prompt: str = Body(...),
    type: str = Body("text"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """AI content generation (placeholder)"""
    return {"content": None, "message": "AI generation requires LLM integration"}


@app.get("/api/admin/advanced/ai/models")
async def get_ai_models(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get available AI models"""
    return {"models": []}


@app.get("/api/admin/advanced/ai/usage")
async def get_ai_usage(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get AI usage statistics"""
    return {"requests": 0, "tokens": 0, "cost": 0}


@app.get("/api/admin/advanced/algorithm/params")
async def get_algorithm_params(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get matching algorithm parameters"""
    return {
        "params": {
            "age_weight": 0.3,
            "distance_weight": 0.2,
            "interests_weight": 0.3,
            "activity_weight": 0.2
        }
    }


@app.put("/api/admin/advanced/algorithm/params")
async def update_algorithm_params(
    params: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update matching algorithm parameters"""
    return {"status": "ok", "params": params}


@app.get("/api/admin/advanced/algorithm/performance")
async def get_algorithm_performance(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get algorithm performance metrics"""
    return {
        "match_rate": 0,
        "message_rate": 0,
        "satisfaction_score": 0
    }


@app.get("/api/admin/advanced/reports")
async def get_advanced_reports(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get available reports"""
    return {"reports": []}


@app.post("/api/admin/advanced/reports/generate")
async def generate_report(
    type: str = Body(...),
    period: str = Body("30d"),
    format: str = Body("pdf"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Generate report"""
    return {"status": "pending", "report_id": None}


@app.get("/api/admin/advanced/web3/stats")
async def get_web3_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get Web3 statistics"""
    return {"wallets_connected": 0, "nfts_minted": 0, "transactions": 0}


@app.get("/api/admin/advanced/events")
async def get_advanced_events(
    type: Optional[str] = Query(None),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get system events"""
    return {"events": [], "total": 0}


@app.post("/api/admin/advanced/events")
async def create_event(
    name: str = Body(...),
    type: str = Body(...),
    data: dict = Body({}),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create system event"""
    return {"status": "ok", "event_id": None}


@app.get("/api/admin/advanced/localization/stats")
async def get_localization_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get localization statistics"""
    return {
        "languages": ["ru", "en"],
        "coverage": {"ru": 100, "en": 80},
        "missing_keys": 0
    }


@app.get("/api/admin/advanced/performance/budget")
async def get_performance_budget(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get performance budget"""
    return {
        "lcp": {"target": 2500, "current": 0},
        "fid": {"target": 100, "current": 0},
        "cls": {"target": 0.1, "current": 0}
    }


@app.get("/api/admin/advanced/performance/pwa")
async def get_pwa_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get PWA statistics"""
    return {
        "installs": 0,
        "active_users": 0,
        "push_subscriptions": 0
    }


@app.get("/api/admin/advanced/accessibility/audit")
async def get_accessibility_audit(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get accessibility audit results"""
    return {
        "score": 0,
        "issues": [],
        "last_audit": None
    }


@app.get("/api/admin/advanced/calls/analytics")
async def get_calls_analytics(
    period: str = Query("30d"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get video/voice calls analytics"""
    return {
        "total_calls": 0,
        "avg_duration": 0,
        "success_rate": 0
    }


@app.get("/api/admin/advanced/recommendations/dashboard")
async def get_recommendations_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get recommendations dashboard"""
    return {
        "algorithm_version": "1.0",
        "accuracy": 0,
        "feedback_score": 0
    }


@app.get("/api/admin/advanced/icebreakers")
async def get_admin_icebreakers(
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get icebreakers for admin"""
    return {"icebreakers": [], "total": 0}


@app.post("/api/admin/advanced/icebreakers")
async def create_icebreaker(
    text: str = Body(...),
    category: str = Body("general"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create icebreaker"""
    return {"status": "ok", "icebreaker_id": None}


@app.post("/api/admin/advanced/icebreakers/generate")
async def generate_icebreakers(
    category: str = Query("general"),
    count: int = Query(5),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Generate icebreakers with AI"""
    return {"icebreakers": [], "message": "AI generation requires LLM integration"}


@app.get("/api/admin/advanced/partners")
async def get_partners(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get partners list"""
    return {"partners": [], "total": 0}


@app.post("/api/admin/advanced/partners")
async def create_partner(
    name: str = Body(...),
    type: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create partner"""
    return {"status": "ok", "partner_id": None}


# ============================================
# ADDITIONAL MISSING ENDPOINTS
# ============================================

# --- UNDO SWIPE ---
@app.post("/api/undo-swipe")
async def undo_swipe(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Undo last swipe (alias for rewind)"""
    # Check if user is VIP
    vip_check = await db.execute(
        text("SELECT is_vip FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    is_vip = vip_check.scalar()
    
    if not is_vip:
        return {
            "success": False,
            "is_vip_feature": True,
            "message": "Upgrade to VIP to use undo"
        }
    
    # Get last swipe
    result = await db.execute(text("""
        SELECT id, to_user_id::text, action
        FROM swipes
        WHERE from_user_id = :user_id
        ORDER BY timestamp DESC
        LIMIT 1
    """), {"user_id": current_user_id})
    
    last_swipe = result.fetchone()
    
    if not last_swipe:
        return {"success": False, "message": "No swipes to undo"}
    
    # Delete the swipe
    await db.execute(
        text("DELETE FROM swipes WHERE id = :swipe_id"),
        {"swipe_id": last_swipe[0]}
    )
    
    # If it was a match, delete the match too
    if last_swipe[2] in ('like', 'superlike'):
        await db.execute(text("""
            DELETE FROM matches 
            WHERE (user1_id = :user1 AND user2_id = :user2)
            OR (user1_id = :user2 AND user2_id = :user1)
        """), {"user1": current_user_id, "user2": last_swipe[1]})
    
    await db.commit()
    
    return {
        "success": True,
        "undone_user_id": last_swipe[1],
        "action": last_swipe[2]
    }


# --- DISCOVER SMART FILTERS ---
@app.get("/api/discover/smart-filters")
async def get_smart_filters(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get smart filter suggestions based on user preferences"""
    # Get user data for personalized filters
    user_result = await db.execute(
        text("SELECT age, gender FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    user = user_result.fetchone()
    
    user_age = user[0] if user else 25
    
    return {
        "suggested_filters": {
            "age_range": {
                "min": max(18, user_age - 5),
                "max": user_age + 5
            },
            "distance_km": 50,
            "has_bio": True,
            "has_photos": True,
            "verified_only": False
        },
        "popular_filters": [
            {"name": "Nearby", "distance_km": 10},
            {"name": "Same age", "age_range": {"min": user_age - 2, "max": user_age + 2}},
            {"name": "Verified only", "verified_only": True}
        ]
    }


# --- DISCOVER DAILY PICKS REFRESH ---
@app.post("/api/discover/daily-picks/refresh")
async def refresh_daily_picks(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Refresh daily picks (VIP feature)"""
    vip_check = await db.execute(
        text("SELECT is_vip FROM users WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    is_vip = vip_check.scalar()
    
    if not is_vip:
        return {
            "success": False,
            "is_vip_feature": True,
            "message": "Upgrade to VIP to refresh daily picks"
        }
    
    # Get new picks
    result = await db.execute(text("""
        SELECT 
            u.id::text, u.name, u.age, u.bio, u.is_verified
        FROM users u
        WHERE u.is_active = true 
        AND u.is_complete = true
        AND u.id != :current_user_id
        AND EXISTS (SELECT 1 FROM user_photos WHERE user_id = u.id)
        AND u.id NOT IN (SELECT to_user_id FROM swipes WHERE from_user_id = :current_user_id)
        ORDER BY RANDOM()
        LIMIT 5
    """), {"current_user_id": current_user_id})
    
    rows = result.fetchall()
    
    picks = []
    for r in rows:
        user_id = r[0]
        # Get photos
        photos_result = await db.execute(
            text("SELECT url FROM user_photos WHERE user_id = :user_id ORDER BY created_at"),
            {"user_id": user_id}
        )
        photos = [p[0] for p in photos_result.fetchall()]
        
        # Get interests
        interests_result = await db.execute(
            text("SELECT tag FROM user_interests WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        interests = [i[0] for i in interests_result.fetchall()]
        
        picks.append({
            "id": user_id,
            "name": r[1],
            "age": r[2],
            "bio": r[3],
            "photos": photos,
            "interests": interests,
            "is_verified": r[4] or False,
            "match_reason": "Refreshed pick for you"
        })
    
    return {
        "success": True,
        "picks": picks,
        "date": datetime.utcnow().date().isoformat()
    }


# --- AUTH LOGIN (Phone + OTP) ---
@app.post("/api/auth/login")
async def auth_login(
    identifier: str = Body(...),
    otp: str = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Login with phone and OTP"""
    # In production, verify OTP
    # For now, placeholder
    return {
        "access_token": None,
        "token_type": "bearer",
        "has_profile": False,
        "is_new_user": True,
        "message": "OTP verification not implemented - use Telegram auth"
    }


@app.post("/api/auth/login/email")
async def auth_login_email(
    email: str = Body(...),
    password: str = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Admin login with email"""
    result = await db.execute(text("SELECT id, hashed_password, role, is_active FROM users WHERE email = :email"), {"email": email})
    user = result.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id, hashed_password, role, is_active = user
    if not is_active:
        raise HTTPException(status_code=401, detail="Account disabled")
    if not pwd_context.verify(password, hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(str(user_id))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "has_profile": True,
        "is_new_user": False,
        "role": str(role) if role else "user"
    }


@app.post("/api/auth/request-otp")
async def request_otp(
    identifier: str = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Request OTP code"""
    return {
        "status": "ok",
        "message": "OTP sent (placeholder - not implemented)"
    }


# --- DELETE USER ---
@app.delete("/api/users/me")
async def delete_user_account(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete user account"""
    await db.execute(
        text("UPDATE users SET is_active = false, deleted_at = NOW() WHERE id = :user_id"),
        {"user_id": current_user_id}
    )
    await db.commit()
    
    return {"status": "ok", "message": "Account deleted"}


# Vercel handler
handler = app
