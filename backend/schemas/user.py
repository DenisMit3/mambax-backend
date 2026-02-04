# User schemas - Pydantic схемы (DTO) для пользователей

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from backend.models.user import Gender, UserStatus, SubscriptionTier, UserRole


class Location(BaseModel):
    """Геолокация"""
    lat: float
    lon: float


class UserBase(BaseModel):
    """Базовые поля пользователя"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    username: Optional[str] = None
    
    name: Optional[str] = Field(None, max_length=100)
    age: int = Field(..., ge=18, le=120)
    gender: Optional[Gender] = None
    bio: Optional[str] = Field(None, max_length=500)
    photos: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    location: Optional[Location] = None


class UserCreate(UserBase):
    """Схема для создания пользователя"""
    password: Optional[str] = None  # Optional for TG users


class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    bio: Optional[str] = None
    photos: Optional[list[str]] = None
    interests: Optional[list[str]] = None
    location: Optional[Location] = None
    is_vip: Optional[bool] = None


class UserInDB(UserBase):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        from_attributes = True


class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    is_active: bool
    status: UserStatus = UserStatus.ACTIVE
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE
    role: UserRole = UserRole.USER
    stars_balance: Decimal = Decimal(0)
    gifts_received: Optional[int] = None
    is_complete: bool = False
    verification_selfie: Optional[str] = None
    
    class Config:
        from_attributes = True


# Aliases for Profile (Backward compatibility / Main.py usage)
class ProfileCreate(UserBase):
    pass

class ProfileResponse(UserResponse):
    pass

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    bio: Optional[str] = None
    photos: Optional[list[str]] = None
    interests: Optional[list[str]] = None
