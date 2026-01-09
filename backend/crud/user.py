# User CRUD - Операции создания и получения пользователей из PostgreSQL

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import hash_password
from models.user import User
from schemas.user import UserCreate


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Создаёт нового пользователя в базе данных.
    
    Args:
        db: Асинхронная сессия SQLAlchemy
        user_data: Данные для создания пользователя (Pydantic schema)
    
    Returns:
        User: Созданный ORM объект пользователя
    """
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Extract location if provided
    latitude = user_data.location.lat if user_data.location else None
    longitude = user_data.location.lon if user_data.location else None
    
    # Create ORM model
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        name=user_data.name,
        age=user_data.age,
        gender=user_data.gender.value,  # Enum to string
        bio=user_data.bio,
        photos=user_data.photos,
        interests=user_data.interests,
        latitude=latitude,
        longitude=longitude,
        is_vip=user_data.is_vip,
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    return db_user


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """
    Получает пользователя по email.
    
    Args:
        db: Асинхронная сессия SQLAlchemy
        email: Email пользователя
    
    Returns:
        User | None: Пользователь или None если не найден
    """
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    """
    Получает пользователя по ID.
    
    Args:
        db: Асинхронная сессия SQLAlchemy
        user_id: UUID пользователя
    
    Returns:
        User | None: Пользователь или None если не найден
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def add_user_photo(db: AsyncSession, user: User, photo_url: str) -> User:
    """
    Добавляет URL фото к пользователю.
    
    Args:
        db: Асинхронная сессия
        user: ORM объект пользователя
        photo_url: URL новой фотографии
    
    Returns:
        User: Обновленный пользователь
    """
    # Создаём новый список, чтобы SQLAlchemy заметил изменение MutableList
    new_photos = list(user.photos)
    new_photos.append(photo_url)
    
    user.photos = new_photos
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user
