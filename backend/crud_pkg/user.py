# User CRUD - Операции создания и получения пользователей из PostgreSQL

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import hash_password
from backend.models.user import User, Gender
from backend.schemas.user import UserCreate


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Создаёт нового пользователя в базе данных.
    
    Args:
        db: Асинхронная сессия SQLAlchemy
        user_data: Данные для создания пользователя (Pydantic schema)
    
    Returns:
        User: Созданный ORM объект пользователя
    """
    # Hash password (handle optional password for TG users)
    pwd = user_data.password or "dummy"
    hashed_password = hash_password(pwd)
    
    # Extract location if provided
    latitude = user_data.location.lat if user_data.location else None
    longitude = user_data.location.lon if user_data.location else None
    
    # Create ORM model
    db_user = User(
        email=user_data.email,
        phone=user_data.phone,
        telegram_id=user_data.telegram_id,
        username=user_data.username,
        hashed_password=hashed_password,
        name=user_data.name or "Anonymous",
        age=user_data.age or 25,
        gender=user_data.gender if user_data.gender else Gender.OTHER,
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


async def get_user_by_telegram_id(db: AsyncSession, telegram_id: str) -> Optional[User]:
    """
    Получает пользователя по Telegram ID.
    """
    stmt = select(User).where(User.telegram_id == telegram_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """
    Получает пользователя по Telegram username (без @).
    """
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_phone(db: AsyncSession, phone: str) -> Optional[User]:
    """
    Получает пользователя по номеру телефона.
    """
    stmt = select(User).where(User.phone == phone)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_user_via_phone(db: AsyncSession, phone: str) -> User:
    """
    Создаёт пользователя только с телефоном (для OTP входа).
    """
    import random
    import string
    
    # Generate random email since it is required usually? Or keep it None if nullable.
    # Looking at User model (not visible but usually email is unique/required).
    # Let's assume email is nullable OR we generate a fake one.
    # To be safe, generate a fake unique email.
    random_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    fake_email = f"{phone.replace('@', '')}_{random_suffix}@mambax.local"
    
    db_user = User(
        phone=phone,
        email=fake_email, 
        hashed_password="nopassword",
        name=f"User {phone[-4:]}",
        age=18,
        gender=Gender.OTHER, # Required field
        is_active=True,
        is_verified=True, # For demo
        is_complete=False # Profile not filled
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def delete_user(db: AsyncSession, user_id: UUID) -> bool:
    """
    Удаляет пользователя по ID.
    
    Args:
        db: Асинхронная сессия
        user_id: UUID пользователя
    
    Returns:
        bool: True если удален, False если не найден
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        return False
        
    await db.delete(user)
    await db.commit()
    return True


