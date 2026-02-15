# Auth API - Login (email, OTP, telegram)

import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from backend.core.security import verify_password, create_access_token, TokenResponse, hash_password
from backend.db.session import get_db
from backend.models.user import User, Gender
from backend.crud.user import (
    get_user_by_email, get_user_by_phone,
    create_user_via_phone, get_user_by_telegram_id,
    get_user_by_username
)
from backend.auth import (
    save_otp, verify_otp, generate_otp,
    send_otp_via_telegram, validate_telegram_data
)
from backend.config.settings import settings
from backend.core.redis import redis_manager
from backend.api.auth.schemas import (
    LoginRequest, OTPRequest, OTPLoginRequest, TelegramLoginRequest
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login/email", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Вход по email и паролю."""
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
    
    user = await get_user_by_email(db, credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is disabled"
        )
    
    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token, has_profile=user.is_complete)


@router.post("/request-otp")
async def request_otp(data: OTPRequest, db: AsyncSession = Depends(get_db)):
    """Запрос OTP кода."""
    is_allowed = await redis_manager.rate_limit(f"otp_request:{data.identifier}", limit=3, period=600)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )

    try:
        user = None
        if data.identifier.startswith("@"):
            username = data.identifier.lstrip("@")
            user = await get_user_by_username(db, username)
        else:
            user = await get_user_by_phone(db, data.identifier)
        
        otp = generate_otp()
        await save_otp(data.identifier, otp)
        
        if user and user.telegram_id:
            success = await send_otp_via_telegram(user.telegram_id, otp)
            if success:
                return {"success": True, "message": "OTP sent via Telegram"}
            else:
                logger.warning(f"Failed to send Telegram message to {user.telegram_id}")
        
        if settings.ENVIRONMENT == "development":
            logger.info(f"DEBUG OTP for {data.identifier}: {otp}")
            msg = "OTP generated (Demo mode - check server logs)."
            if data.identifier.startswith("@") and not user:
                msg += " (User not found in DB, cannot send to Telegram)"
            return {"success": True, "message": msg}
        else:
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
    """Вход по одноразовому коду (OTP)."""
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
            
        user = await get_user_by_phone(db, data.identifier)
        
        if not user:
            try:
                user = await create_user_via_phone(db, data.identifier)
            except Exception as e:
                logger.error(f"Error creating user: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Failed to create user during OTP login")
        
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
    """Авторизация через Telegram Mini App."""
    init_data_length = len(data.init_data) if data.init_data else 0
    logger.info(f"Telegram login attempt, initData length: {init_data_length}")
    
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
        safe_preview = data.init_data[:50] if len(data.init_data) > 50 else data.init_data
        logger.error(f"[AUTH-FLOW] FAIL: Telegram validation failed for initData: {safe_preview}...")
        raise HTTPException(
            status_code=401,
            detail="Invalid Telegram data. Please restart the bot with /start command."
        )

    telegram_id = str(auth_data["id"])
    username = auth_data.get("username")
    
    logger.info(f"[AUTH-FLOW] Step 3: Validated tg_id={telegram_id}, username={username}, auth_data={auth_data}")
    
    logger.info(f"[AUTH-FLOW] Step 4: Looking up user by telegram_id={telegram_id}")
    user = await get_user_by_telegram_id(db, telegram_id)
    logger.info(f"[AUTH-FLOW] Step 5: get_user_by_telegram_id returned: {user is not None} (user_id={user.id if user else 'N/A'})")
    
    if not user:
        random_pwd = secrets.token_urlsafe(32)
        
        logger.info(f"Creating new user from Telegram: {telegram_id} (username: {username})")
        
        user = User(
            telegram_id=telegram_id,
            username=username or f"user_{telegram_id}",
            email=None,
            hashed_password=hash_password(random_pwd),
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
        logger.info(f"Updating username for user {user.id}: {user.username} -> {username}")
        user.username = username
        await db.commit()
    
    if not user.is_active or (user.status and str(user.status).lower() == "banned"):
        logger.warning(f"Telegram login blocked for banned/inactive user: {user.id}")
        raise HTTPException(status_code=401, detail="User account is disabled or banned")
    
    access_token = create_access_token(user.id)
    logger.info(f"[AUTH-FLOW] Step 7: Token created for user_id={user.id}, has_profile={user.is_complete}, is_active={user.is_active}, role={user.role}")
    return TokenResponse(access_token=access_token, has_profile=user.is_complete)
