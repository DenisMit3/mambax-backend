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
from backend.crud_pkg.user import (
    create_user, 
    get_user_by_email, 
    get_user_by_phone, 
    create_user_via_phone,
    get_user_by_telegram_id
)
# Auth Logic
from backend.auth import (
    save_otp, verify_otp, generate_otp, send_otp_via_telegram, 
    validate_telegram_data
)
from backend.config.settings import settings


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
    
    return TokenResponse(access_token=access_token)


@router.post("/request-otp")
async def request_otp(data: OTPRequest, db: AsyncSession = Depends(get_db)):
    # Try to find user to see if they have Telegram connected
    user = await get_user_by_phone(db, data.identifier)
    
    otp = generate_otp()
    save_otp(data.identifier, otp)
    
    if user and user.telegram_id:
        success = await send_otp_via_telegram(user.telegram_id, otp)
        if success:
             return {"success": True, "message": "OTP sent via Telegram"}
    
    # Fallback to debug/console
    if settings.ENVIRONMENT == "development":
        print(f"DEBUG: Generated OTP for {data.identifier}: {otp}")
        return {"success": True, "message": "OTP generated (Demo mode)", "debug_otp": otp}
    else:
        # In prod, we might use SMS here if configured, otherwise just console/log
        print(f"OTP generated for {data.identifier}") 
        return {"success": True, "message": "OTP sent (Console/SMS)"}


@router.post("/login", response_model=TokenResponse)
async def login_otp(
    data: OTPLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Вход по одноразовому коду (OTP).
    Если пользователь не найден - создает нового.
    """
    try:
        if not verify_otp(data.identifier, data.otp):
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
                print(f"Error creating user: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")
                
        access_token = create_access_token(user.id)
        return TokenResponse(access_token=access_token)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unhandled error in login_otp: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unhandled internal error: {str(e)}")


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
    auth_data = validate_telegram_data(data.init_data)
    
    if not auth_data:
        # Development override: If init_data is just a JSON string (mock), allow it?
        if os.getenv("ENVIRONMENT", "development") == "development" and "hash=" not in data.init_data:
             try:
                 mock_user = json.loads(data.init_data)
                 auth_data = {
                     "id": str(mock_user.get("id", "00000")), 
                     "username": mock_user.get("username", "mock_user"),
                     "first_name": mock_user.get("first_name", "Mock User")
                 }
             except Exception:
                 pass
    
    if not auth_data:         
        raise HTTPException(status_code=401, detail="Invalid Telegram data")

    telegram_id = str(auth_data["id"])
    username = auth_data.get("username")
    
    # Find or Create User
    user = await get_user_by_telegram_id(db, telegram_id)
    
    if not user:
        # Create new user
        random_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
        fake_email = f"tg_{telegram_id}_{random_suffix}@mambax.local"
        
        user = User(
            telegram_id=telegram_id,
            username=username or f"user_{telegram_id}",
            email=fake_email,
            hashed_password="nopassword",
            name=auth_data.get("first_name", username),
            age=18,
            gender=Gender.OTHER,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif username and user.username != username:
        # Update username if changed
        user.username = username
        await db.commit()
    
    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token)
