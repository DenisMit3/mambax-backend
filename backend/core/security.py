# Core Security - Хэширование паролей, создание и валидация JWT токенов

import os
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel


# --- Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Хэширует пароль с использованием bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет соответствие пароля хэшу."""
    return pwd_context.verify(plain_password, hashed_password)


# --- JWT Token Schemas ---
class TokenData(BaseModel):
    """Данные внутри JWT токена"""
    user_id: str
    exp: Optional[datetime] = None


class TokenResponse(BaseModel):
    """Ответ API с токеном"""
    access_token: str
    token_type: str = "bearer"


# --- JWT Token Functions ---
def create_access_token(user_id: UUID, expires_delta: Optional[timedelta] = None) -> str:
    """
    Создаёт JWT access token для пользователя.
    
    Args:
        user_id: UUID пользователя
        expires_delta: Время жизни токена (по умолчанию 7 дней)
    
    Returns:
        str: Закодированный JWT токен
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """
    Декодирует и валидирует JWT токен.
    
    Args:
        token: JWT токен
    
    Returns:
        TokenData если токен валидный, иначе None
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        exp: datetime = payload.get("exp")
        
        if user_id is None:
            return None
        
        return TokenData(user_id=user_id, exp=exp)
    except JWTError:
        return None


def verify_token(token: str) -> Optional[str]:
    """
    Проверяет токен и возвращает user_id если валидный.
    
    Args:
        token: JWT токен
    
    Returns:
        user_id если токен валидный, иначе None
    """
    token_data = decode_access_token(token)
    if token_data is None:
        return None
    return token_data.user_id
