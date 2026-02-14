# Auth API - Эндпоинты регистрации и авторизации с PostgreSQL

import json
import os
import random
import string
import traceback
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

# Core & Security
from backend.core.security import verify_password, create_access_token, TokenResponse
from backend.db.session import get_db
# Models & Schemas
from backend.models.user import User, Gender
from backend.schemas.user import UserCreate, UserResponse, Location
# CRUD
from backend.crud.user import (
    create_user, 
    get_user_by_email, 
    get_user_by_phone, 
    create_user_via_phone,
    get_user_by_telegram_id,
    get_user_by_username
)
# Auth Logic
from backend.auth import (
    save_otp, verify_otp, generate_otp, send_otp_via_telegram, 
    validate_telegram_data
)
from backend.config.settings import settings
from backend.core.redis import redis_manager
from backend.services.geo import geo_service
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- Request/Response Schemas ---
class LoginRequest(BaseModel):
    """Схема запроса на вход по Email"""
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    identifier: str

class OTPLoginRequest(BaseModel):
    identifier: str
    otp: str


class RegisterResponse(BaseModel):
    """Ответ при регистрации"""
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class TelegramLoginRequest(BaseModel):
    init_data: str


# --- Endpoints ---
@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Регистрация нового пользователя.
    
    - Проверяет, что email не занят
    - Хэширует пароль
    - Сохраняет в PostgreSQL
    - Создаёт JWT токен
    """
    # Check if email already exists
    if user_data.email:
        existing_user = await get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create user in database
    db_user = await create_user(db, user_data)
    
    # Create token
    access_token = create_access_token(db_user.id)
    
    # Sync to Redis if location provided
    if db_user.latitude and db_user.longitude:
        try:
             await geo_service.update_location(
                str(db_user.id), 
                db_user.latitude, 
                db_user.longitude,
                metadata={"name": db_user.name or "", "age": db_user.age or 0}
            )
        except Exception as e:
            logger.error(f"Failed to sync new user location to Redis: {e}")
    
    # Build location for response
    location = None
    if db_user.latitude and db_user.longitude:
        location = Location(lat=db_user.latitude, lon=db_user.longitude)
    
    # Build response
    user_response = UserResponse(
        id=db_user.id,
        email=db_user.email,
        name=db_user.name,
        age=db_user.age,
        gender=db_user.gender,
        bio=db_user.bio,
        photos=db_user.photos,
        interests=db_user.interests,
        location=location,
        is_vip=db_user.is_vip,
        created_at=db_user.created_at,
        is_active=db_user.is_active,
    )
    
    return RegisterResponse(
        user=user_response,
        access_token=access_token,
        token_type="bearer"
    )


@router.post("/login/email", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Вход в систему.
    
    - Проверяет email и пароль в PostgreSQL
    - Возвращает JWT токен
    """
    # FIX: Rate limit to prevent brute force (5 attempts per 5 min per email)
    # Skip rate limiting in development mode to avoid Redis connection issues
    is_allowed = True
    if settings.ENVIRONMENT != "development":
        is_allowed = await redis_manager.rate_limit(
            f"login_attempt:{credentials.email}", 
            limit=5, 
            period=300
        )
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in 5 minutes."
        )
    
    # Get user from database
    user = await get_user_by_email(db, credentials.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is disabled"
        )
    
    
    # Create and return token
    access_token = create_access_token(user.id)
    
    return TokenResponse(access_token=access_token, has_profile=user.is_complete)


@router.post("/request-otp")
async def request_otp(data: OTPRequest, db: AsyncSession = Depends(get_db)):
    # Rate Limit: max 3 requests per 10 minutes per identifier
    is_allowed = await redis_manager.rate_limit(f"otp_request:{data.identifier}", limit=3, period=600)
    if not is_allowed:
        raise HTTPException(
            status_code=429, 
            detail="Too many requests. Please try again later."
        )

    try:
        user = None
        # Try to find user
        if data.identifier.startswith("@"):
            # Lookup by username
            username = data.identifier.lstrip("@")
            user = await get_user_by_username(db, username)
        else:
            # Lookup by phone
            user = await get_user_by_phone(db, data.identifier)
        
        otp = generate_otp()
        await save_otp(data.identifier, otp)
        
        if user and user.telegram_id:
            success = await send_otp_via_telegram(user.telegram_id, otp)
            if success:
                 return {"success": True, "message": "OTP sent via Telegram"}
            else:
                 logger.warning(f"Failed to send Telegram message to {user.telegram_id}")
        
        # Fallback to debug/console
        if settings.ENVIRONMENT == "development":
            # FIX (SEC-001): Log OTP only to server console, never return in response
            logger.info(f"DEBUG OTP for {data.identifier}: {otp}")
            msg = "OTP generated (Demo mode - check server logs)."
            if data.identifier.startswith("@") and not user:
                msg += " (User not found in DB, cannot send to Telegram)"
            return {"success": True, "message": msg}
        else:
            # In prod, logging exact OTP is careless, just log the event
            logger.info(f"OTP generated for {data.identifier}") 
            return {"success": True, "message": "OTP sent (Console/SMS)"}
            
    except Exception as e:
        logger.error(f"Error in request_otp: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/login", response_model=TokenResponse)
async def login_otp(
    data: OTPLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Вход по одноразовому коду (OTP).
    Если пользователь не найден - создает нового.
    """
    # FIX (SEC-004): Rate limit OTP verification - max 5 attempts per 15 minutes
    is_allowed = await redis_manager.rate_limit(f"otp_verify:{data.identifier}", limit=5, period=900)
    if not is_allowed:
        raise HTTPException(
            status_code=429, 
            detail="Too many failed attempts. Please try again later."
        )
    
    try:
        if not await verify_otp(data.identifier, data.otp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid OTP"
            )
            
        # Check if user exists by phone
        user = await get_user_by_phone(db, data.identifier)
        
        if not user:
            # Create new user if valid phone format
            try:
                user = await create_user_via_phone(db, data.identifier)
            except Exception as e:
                logger.error(f"Error creating user: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Failed to create user during OTP login")
        
        # Security Check: Banned/inactive users
        if not user.is_active or (user.status and str(user.status).lower() == "banned"):
             raise HTTPException(status_code=401, detail="User account is disabled or banned")
                
        access_token = create_access_token(user.id)
        return TokenResponse(access_token=access_token, has_profile=user.is_complete)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error in login_otp: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Unhandled internal error")


@router.post("/telegram", response_model=TokenResponse)
async def login_telegram(
    data: TelegramLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Авторизация через Telegram Mini App.
    Принимает init_data (строка запуска), валидирует её через бота
    и возвращает токен.
    """
    # Логирование входящего запроса
    init_data_length = len(data.init_data) if data.init_data else 0
    logger.info(f"Telegram login attempt, initData length: {init_data_length}")
    
    # Проверка на пустой initData
    if not data.init_data or not data.init_data.strip():
        logger.error("Telegram login failed: empty initData received")
        raise HTTPException(
            status_code=401, 
            detail="Empty Telegram data. Please restart the bot with /start command."
        )
    
    logger.info(f"[AUTH-FLOW] Step 1: Calling validate_telegram_data, initData length={init_data_length}")
    auth_data = validate_telegram_data(data.init_data)
    logger.info(f"[AUTH-FLOW] Step 2: validate_telegram_data returned: {auth_data is not None}")
    
    if not auth_data:
        # Логируем первые 50 символов для отладки (без чувствительных данных)
        safe_preview = data.init_data[:50] if len(data.init_data) > 50 else data.init_data
        logger.error(f"[AUTH-FLOW] FAIL: Telegram validation failed for initData: {safe_preview}...")
        raise HTTPException(
            status_code=401, 
            detail="Invalid Telegram data. Please restart the bot with /start command."
        )

    telegram_id = str(auth_data["id"])
    username = auth_data.get("username")
    
    logger.info(f"[AUTH-FLOW] Step 3: Validated tg_id={telegram_id}, username={username}, auth_data={auth_data}")
    
    # Find or Create User
    logger.info(f"[AUTH-FLOW] Step 4: Looking up user by telegram_id={telegram_id}")
    user = await get_user_by_telegram_id(db, telegram_id)
    logger.info(f"[AUTH-FLOW] Step 5: get_user_by_telegram_id returned: {user is not None} (user_id={user.id if user else 'N/A'})")
    
    if not user:
        # Generate random password placeholder for security
        import secrets
        from backend.core.security import hash_password
        random_pwd = secrets.token_urlsafe(32)
        
        logger.info(f"Creating new user from Telegram: {telegram_id} (username: {username})")
        
        user = User(
            telegram_id=telegram_id,
            username=username or f"user_{telegram_id}",
            email=None,
            hashed_password=hash_password(random_pwd),  # Properly hashed
            name=auth_data.get("first_name", username or "Telegram User"),
            age=18,
            gender=Gender.OTHER,
            is_active=True,
            is_verified=False,
            is_complete=False
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(f"New user created successfully: {user.id} (telegram_id: {telegram_id})")
    elif username and user.username != username:
        # Update username if changed
        logger.info(f"Updating username for user {user.id}: {user.username} -> {username}")
        user.username = username
        await db.commit()
    
    # Security Check: Banned/inactive users
    if not user.is_active or (user.status and str(user.status).lower() == "banned"):
            logger.warning(f"Telegram login blocked for banned/inactive user: {user.id}")
            raise HTTPException(status_code=401, detail="User account is disabled or banned")
    
    access_token = create_access_token(user.id)
    logger.info(f"[AUTH-FLOW] Step 7: Token created for user_id={user.id}, has_profile={user.is_complete}, is_active={user.is_active}, role={user.role}")
    return TokenResponse(access_token=access_token, has_profile=user.is_complete)
