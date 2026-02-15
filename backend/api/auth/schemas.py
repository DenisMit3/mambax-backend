# Auth API - Схемы запросов/ответов

from pydantic import BaseModel, EmailStr
from backend.schemas.user import UserResponse


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
