# User ORM Model - SQLAlchemy таблица users для PostgreSQL

import uuid
import enum
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, JSON, Uuid, Numeric, Enum as SQLAlchemyEnum
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"
    PENDING = "pending"


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    GOLD = "gold"
    PLATINUM = "platinum"


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"


class User(Base):
    """
    ORM модель пользователя дейтинг-платформы.
    
    Таблица: users
    
    Атрибуты:
        id: Уникальный идентификатор (UUID)
        email: Email пользователя (уникальный)
        hashed_password: Хэш пароля (bcrypt)
        name: Имя пользователя
        age: Возраст (18-120)
        gender: Пол (male/female/other)
        bio: Описание профиля
        photos: Список URL фотографий
        interests: Список интересов (теги)
        latitude: Широта для геопоиска
        longitude: Долгота для геопоиска
        is_vip: VIP статус (монетизация)
        is_active: Активен ли аккаунт
        created_at: Дата создания
        updated_at: Дата обновления
    """
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    age: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    gender: Mapped[Gender] = mapped_column(
        SQLAlchemyEnum(Gender),
        nullable=False,
    )
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    photos: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    interests: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    
    # Extended profile fields for filtering
    height: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Height in cm (150-220)"
    )
    smoking: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="never, sometimes, regularly"
    )
    drinking: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="never, socially, regularly"
    )
    education: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="high_school, bachelor, master, phd"
    )
    looking_for: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="relationship, friendship, casual, not_sure"
    )
    children: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="have, want, dont_want, maybe"
    )
    latitude: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    longitude: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    is_vip: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Added fields for CRUD compatibility
    phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=True,
    )
    telegram_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=True,
    )
    username: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    is_complete: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Verification fields
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    verification_selfie: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Admin & Status fields
    status: Mapped[UserStatus] = mapped_column(
        SQLAlchemyEnum(UserStatus),
        default=UserStatus.ACTIVE,
        nullable=False,
    )
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        SQLAlchemyEnum(SubscriptionTier),
        default=SubscriptionTier.FREE,
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        SQLAlchemyEnum(UserRole),
        default=UserRole.USER,
        nullable=False,
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="User's city for display"
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="User's full location string"
    )

    # Telegram Stars balance for in-app purchases (gifts, boosts, etc.)
    stars_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        nullable=False,
        comment="User's Telegram Stars balance"
    )

    @property
    def user_id(self):
        return self.id
    
    def __repr__(self) -> str:
        return f"<User {self.name} ({self.email})>"
