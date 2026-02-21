# Spotlight Service - витрина профилей

import uuid
import logging
import random
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from backend.models.social import SpotlightEntry, ProfileView
from backend.models.user import User
from backend.models.interaction import Swipe

logger = logging.getLogger(__name__)

# Настройки
SPOTLIGHT_DURATION_HOURS = 1
SPOTLIGHT_COST_STARS = 100
SPOTLIGHT_MAX_PROFILES = 20
SPOTLIGHT_REFRESH_HOURS = 6


async def get_spotlight_profiles(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Получить профили из Spotlight для показа.
    
    Логика:
    1. Активные записи SpotlightEntry (не истёкшие)
    2. Исключаем себя и уже просвайпанных
    3. Сортируем по priority + рандомизация
    
    Returns:
        {
            "profiles": list,
            "total": int,
            "refresh_at": str
        }
    """
    now = datetime.utcnow()
    
    # Получаем ID пользователей, которых уже свайпнули
    swiped_stmt = select(Swipe.to_user_id).where(Swipe.from_user_id == user_id)
    result = await db.execute(swiped_stmt)
    swiped_ids = {row[0] for row in result.all()}
    swiped_ids.add(user_id)  # Исключаем себя
    
    # Получаем активные spotlight записи
    spotlight_stmt = (
        select(SpotlightEntry)
        .where(
            SpotlightEntry.is_active == True,
            SpotlightEntry.expires_at > now,
            SpotlightEntry.user_id.notin_(swiped_ids)
        )
        .order_by(SpotlightEntry.priority.desc(), func.random())
        .limit(limit)
    )
    result = await db.execute(spotlight_stmt)
    entries = result.scalars().all()
    
    profiles = []
    for entry in entries:
        user = await db.get(User, entry.user_id)
        if not user or not user.is_active:
            continue
        
        # Увеличиваем impressions
        entry.impressions += 1
        
        profiles.append({
            "id": str(user.id),
            "name": user.name,
            "age": _calculate_age(user.birthdate),
            "photo_url": user.photo_url,
            "photos": user.photos or [],
            "city": user.city,
            "bio": user.bio,
            "is_verified": user.is_verified,
            "spotlight_source": entry.source,
            "spotlight_priority": entry.priority
        })
    
    await db.commit()
    
    # Время следующего обновления
    refresh_at = now + timedelta(hours=SPOTLIGHT_REFRESH_HOURS)
    
    return {
        "profiles": profiles,
        "total": len(profiles),
        "refresh_at": refresh_at.isoformat()
    }


async def join_spotlight(
    db: AsyncSession,
    user_id: uuid.UUID,
    duration_hours: int = SPOTLIGHT_DURATION_HOURS,
    use_stars: bool = True
) -> Dict[str, Any]:
    """
    Добавить профиль в Spotlight.
    
    Args:
        duration_hours: Длительность в часах
        use_stars: Списать звёзды за участие
    
    Returns:
        {"success": bool, "entry": dict, "message": str}
    """
    now = datetime.utcnow()
    
    # Проверяем, нет ли уже активной записи
    existing_stmt = select(SpotlightEntry).where(
        SpotlightEntry.user_id == user_id,
        SpotlightEntry.is_active == True,
        SpotlightEntry.expires_at > now
    )
    result = await db.execute(existing_stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        remaining = (existing.expires_at - now).total_seconds() / 3600
        return {
            "success": False,
            "message": f"Ты уже в Spotlight! Осталось {remaining:.1f} ч.",
            "expires_at": existing.expires_at.isoformat()
        }
    
    user = await db.get(User, user_id)
    if not user:
        return {"success": False, "message": "Пользователь не найден"}
    
    # Проверяем и списываем звёзды
    cost = SPOTLIGHT_COST_STARS * duration_hours
    if use_stars:
        if (user.stars_balance or 0) < cost:
            return {
                "success": False,
                "message": f"Недостаточно звёзд. Нужно {cost} ⭐",
                "cost": cost,
                "balance": float(user.stars_balance or 0)
            }
        user.stars_balance = (user.stars_balance or Decimal(0)) - Decimal(cost)
    
    # Создаём запись в Spotlight
    expires_at = now + timedelta(hours=duration_hours)
    
    entry = SpotlightEntry(
        user_id=user_id,
        source="boost",
        priority=10,  # Базовый приоритет для платных
        expires_at=expires_at,
        is_active=True
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    
    logger.info(f"User {user_id} joined spotlight for {duration_hours}h (cost: {cost} stars)")
    
    return {
        "success": True,
        "entry": {
            "id": str(entry.id),
            "expires_at": entry.expires_at.isoformat(),
            "duration_hours": duration_hours
        },
        "cost": cost if use_stars else 0,
        "new_balance": float(user.stars_balance) if use_stars else None,
        "message": f"Ты в Spotlight на {duration_hours} ч!"
    }


async def record_spotlight_click(
    db: AsyncSession,
    entry_id: uuid.UUID,
    viewer_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Записать клик по профилю из Spotlight.
    """
    entry = await db.get(SpotlightEntry, entry_id)
    
    if not entry:
        return {"success": False}
    
    entry.clicks += 1
    await db.commit()
    
    return {"success": True, "clicks": entry.clicks}


async def get_spotlight_stats(
    db: AsyncSession,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Получить статистику Spotlight для пользователя.
    """
    now = datetime.utcnow()
    
    # Текущая активная запись
    active_stmt = select(SpotlightEntry).where(
        SpotlightEntry.user_id == user_id,
        SpotlightEntry.is_active == True,
        SpotlightEntry.expires_at > now
    )
    result = await db.execute(active_stmt)
    active = result.scalar_one_or_none()
    
    # Общая статистика
    total_stmt = select(
        func.sum(SpotlightEntry.impressions),
        func.sum(SpotlightEntry.clicks)
    ).where(SpotlightEntry.user_id == user_id)
    result = await db.execute(total_stmt)
    row = result.one()
    total_impressions = row[0] or 0
    total_clicks = row[1] or 0
    
    return {
        "is_active": active is not None,
        "current_entry": {
            "expires_at": active.expires_at.isoformat(),
            "impressions": active.impressions,
            "clicks": active.clicks,
            "remaining_hours": (active.expires_at - now).total_seconds() / 3600
        } if active else None,
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "ctr": (total_clicks / total_impressions * 100) if total_impressions > 0 else 0,
        "cost_per_hour": SPOTLIGHT_COST_STARS
    }


async def add_to_spotlight_by_admin(
    db: AsyncSession,
    user_id: uuid.UUID,
    duration_hours: int = 24,
    priority: int = 50
) -> Dict[str, Any]:
    """
    Добавить пользователя в Spotlight администратором (бесплатно).
    """
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=duration_hours)
    
    entry = SpotlightEntry(
        user_id=user_id,
        source="admin",
        priority=priority,
        expires_at=expires_at,
        is_active=True
    )
    db.add(entry)
    await db.commit()
    
    logger.info(f"Admin added user {user_id} to spotlight for {duration_hours}h")
    
    return {"success": True, "entry_id": str(entry.id)}


async def add_to_spotlight_by_algorithm(
    db: AsyncSession,
    user_id: uuid.UUID,
    reason: str = "high_engagement"
) -> Dict[str, Any]:
    """
    Добавить пользователя в Spotlight алгоритмически.
    Используется для продвижения активных пользователей.
    """
    now = datetime.utcnow()
    
    # Алгоритмические записи на 6 часов с низким приоритетом
    expires_at = now + timedelta(hours=6)
    
    entry = SpotlightEntry(
        user_id=user_id,
        source="algorithm",
        priority=5,  # Низкий приоритет
        expires_at=expires_at,
        is_active=True
    )
    db.add(entry)
    await db.commit()
    
    logger.info(f"Algorithm added user {user_id} to spotlight: {reason}")
    
    return {"success": True}


async def cleanup_expired_spotlight(db: AsyncSession) -> int:
    """
    Деактивировать истёкшие записи Spotlight (для cron).
    """
    now = datetime.utcnow()
    
    stmt = select(SpotlightEntry).where(
        SpotlightEntry.expires_at < now,
        SpotlightEntry.is_active == True
    )
    result = await db.execute(stmt)
    expired = result.scalars().all()
    
    count = 0
    for entry in expired:
        entry.is_active = False
        count += 1
    
    if count > 0:
        await db.commit()
        logger.info(f"Deactivated {count} expired spotlight entries")
    
    return count


def _calculate_age(birthdate: Optional[datetime]) -> Optional[int]:
    """Вычислить возраст."""
    if not birthdate:
        return None
    today = datetime.utcnow()
    age = today.year - birthdate.year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1
    return age
