# Auth Schemas - Pydantic модели для аутентификации

from typing import Optional
from pydantic import BaseModel, Field


class Token(BaseModel):
    """Схема JWT токена"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Данные внутри токена"""
    user_id: Optional[str] = None


class UserLogin(BaseModel):
    """Данные для входа (OTP/SMS)"""
    identifier: str = Field(..., description="Phone number or email")
    otp: str = Field(..., description="One Time Password")


class OTPRequest(BaseModel):
    """Запрос на получение OTP"""
    identifier: str = Field(..., description="Phone number or email")


class OTPResponse(BaseModel):
    """Ответ на запрос OTP"""
    otp: str = "000000"  # FIX: Updated to 6 digits
    message: Optional[str] = None


class TelegramLogin(BaseModel):
    """Вход через Telegram Mini App"""
    init_data: str = Field(..., description="Telegram WebApp initData string")
