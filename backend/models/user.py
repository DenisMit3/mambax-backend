# User ORM Model - SQLAlchemy таблица users для PostgreSQL

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


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
        UUID(as_uuid=True),
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
    gender: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    photos: Mapped[List[str]] = mapped_column(
        ARRAY(String),
        default=list,
        nullable=False,
    )
    interests: Mapped[List[str]] = mapped_column(
        ARRAY(String),
        default=list,
        nullable=False,
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
    
    def __repr__(self) -> str:
        return f"<User {self.name} ({self.email})>"
