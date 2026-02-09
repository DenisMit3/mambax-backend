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
    from backend.models.user import UserPhoto, UserInterest
    
    # Hash password (handle optional password for TG users)
    pwd = user_data.password or "dummy"
    hashed_password = hash_password(pwd)
    
    # Extract location if provided
    latitude = user_data.location.lat if user_data.location else None
    longitude = user_data.location.lon if user_data.location else None
    
    # Create User object (WITHOUT photos/interests list)
    db_user = User(
        email=user_data.email,
        phone=user_data.phone,
        telegram_id=user_data.telegram_id,
        username=user_data.username,
        hashed_password=hashed_password,
        name=user_data.name or "Anonymous",
        age=user_data.age,
        gender=user_data.gender if user_data.gender else Gender.OTHER,
        bio=user_data.bio,
        latitude=latitude,
        longitude=longitude,
        is_vip=False,
    )
    
    db.add(db_user)
    # Flush to generate ID
    await db.flush() 
    
    # Add Photos (Limit to 9 for security)
    if user_data.photos:
        for url in user_data.photos[:9]: 
            photo = UserPhoto(user_id=db_user.id, url=url)
            db.add(photo)
            
    # Add Interests
    if user_data.interests:
        for tag in user_data.interests:
            interest = UserInterest(user_id=db_user.id, tag=tag)
            db.add(interest)
    
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


async def get_user_profile(db: AsyncSession, user_id: str) -> Optional[User]:
    """Алиас для get_user_by_id с поддержкой строкового ID"""
    try:
        from uuid import UUID
        u_id = UUID(user_id) if isinstance(user_id, str) else user_id
        return await get_user_by_id(db, u_id)
    except (ValueError, AttributeError):
        return None


async def add_user_photo(db: AsyncSession, user: User, photo_url: str) -> User:
    """
    Добавляет URL фото к пользователю с проверкой лимита (9 фото).
    """
    from backend.models.user import UserPhoto
    
    # Check limit
    if len(user.photos_rel) >= 9:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Maximum 9 photos allowed")

    photo = UserPhoto(user_id=user.id, url=photo_url)
    db.add(photo)
    
    await db.commit()
    # Expire user to force reload of relationships on next access
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
    # FIX: Use hashed placeholder password and neutral gender
    db_user = User(
        phone=phone,
        email=None, 
        hashed_password=hash_password("phone_otp_user"),  # FIX: Properly hashed
        name=f"User {phone[-4:]}",
        age=18,
        gender=Gender.OTHER,  # FIX: Use neutral default, not MALE
        is_active=True,
        is_verified=False, 
        is_complete=False 
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
        
    # 1. Delete photos from disk before deleting from DB
    from backend.services.storage import storage_service
    for photo in user.photos_rel:
        storage_service.delete_file(photo.url)

    # 2. Cleanup Redis Keys (Rate limits, Location, Sessions)
    from backend.core.redis import redis_manager
    try:
        user_id_str = str(user_id)
        r = await redis_manager.get_redis()  # FIX: Safe access to Redis
        if r:
            keys_to_delete = [
                f"loc_update:{user_id_str}",
                f"otp_request:{user.phone}" if user.phone else None,
                f"otp_request:{user.email}" if user.email else None,
            ]
            # Filter None and delete simple keys
            for key in filter(None, keys_to_delete):
                await r.delete(key)
            
            # Pattern delete for rate limit keys
            pattern_key = f"rate_limit:{user_id_str}:*"
            cur = 0
            while True:
                cur, keys = await r.scan(cur, match=pattern_key)
                if keys:
                    await r.delete(*keys)
                if cur == 0:
                    break
                
            # Also remove from Geo Index
            from backend.services.geo import geo_service
            await geo_service.remove_user(user_id_str)
    except Exception as e:
        print(f"Redis cleanup failed for user {user_id}: {e}")

    await db.delete(user)
    await db.commit()
    return True


async def update_profile(db: AsyncSession, user_id: str, update_data: UserCreate) -> Optional[User]:
    """
    Обновляет профиль пользователя, включая связанные таблицы photos и interests.
    Accepts UserCreate schema as struct for update data or dedicated Update schema.
    In discovery.py it uses ProfileUpdate.
    """
    from backend.models.user import UserPhoto, UserInterest
    from backend.schemas.user import ProfileUpdate
    from uuid import UUID
    
    try:
        u_id = UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        return None
        
    user = await get_user_by_id(db, u_id)
    if not user:
        return None
        
    # Update simple fields
    if update_data.name is not None:
        user.name = update_data.name
    if update_data.age is not None:
        user.age = update_data.age
    if hasattr(update_data, 'gender') and update_data.gender is not None:
        user.gender = update_data.gender
    if update_data.bio is not None:
        user.bio = update_data.bio
        
    # Update Photos (Relational) with limit
    if update_data.photos is not None:
        # Strategy: Identify photos to delete from disk
        old_photos = [p.url for p in user.photos_rel]
        new_photos = update_data.photos[:9] # Hard limit to 9
        
        # Files that are in 'old' but not in 'new' should be deleted
        from backend.services.storage import storage_service
        for url in old_photos:
            if url not in new_photos:
                storage_service.delete_file(url)

        # Clear existing
        user.photos_rel = []
        
        for url in new_photos:
            photo = UserPhoto(user_id=user.id, url=url)
            user.photos_rel.append(photo)
            
    # Update Interests (Relational)
    if update_data.interests is not None:
        user.interests_rel = []
        for tag in update_data.interests:
            interest = UserInterest(user_id=user.id, tag=tag)
            user.interests_rel.append(interest)

    # Auto-complete profile logic: requires name, age, real gender (not OTHER), and at least 1 photo
    # This prevents auto-completion for users who just logged in via Telegram without onboarding
    if not user.is_complete:
        has_name = bool(user.name and len(user.name) > 1)
        has_age = bool(user.age and user.age >= 18)
        has_real_gender = bool(user.gender and user.gender != Gender.OTHER)
        has_photos = bool(user.photos and len(user.photos) > 0)
        
        if has_name and has_age and has_real_gender and has_photos:
            user.is_complete = True

    # Update UX Preferences
    if hasattr(update_data, 'ux_preferences') and update_data.ux_preferences is not None:
        # Convert Pydantic model to dict
        new_prefs = update_data.ux_preferences.model_dump()
        # Merge with existing
        current_prefs = user.ux_preferences or {}
        # Ensure we don't overwrite with None, though model_dump handles this usually. 
        # But we want partial updates if the input schema supports it, 
        # however UXPreferences in schema has default values so it might be full replace.
        # UserUpdate schema has ux_preferences: Optional[UXPreferences], and UXPreferences has defaults.
        # If the user sends a partial object, Pydantic fills defaults. 
        # So we probably just replace the dict. 
        user.ux_preferences = new_prefs

    await db.commit()
    await db.refresh(user)
    return user


