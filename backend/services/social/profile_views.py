# Profile Views Service - кто смотрел профиль

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from backend.models.social import ProfileView
from backend.models.user import User

logger = logging.getLogger(__name__)

# Настройки
VIEW_COOLDOWN_HOURS = 24  # Один просмотр от пользователя в сутки
MAX_VIEWS_HISTORY = 100   # Максимум записей в истории


async def record_profile_view(
    db: AsyncSession,
    viewer_id: uuid.UUID,
    viewed_id: uuid.UUID,
    source: str = "discover"
) -> Dict[str, Any]:
    """
    Записать просмотр профиля.
    
    Args:
        viewer_id: Кто смотрит
        viewed_id: Чей профиль смотрят
        source: Откуда пришёл (discover, search, spotlight, match)
    
    Returns:
        {"recorded": bool, "message": str}
    """
    # Нельзя записать просмотр своего профиля
    if viewer_id == viewed_id:
        return {"recorded": False, "message": "Self view ignored"}
    
    # Проверяем cooldown - был ли просмотр от этого пользователя за последние 24 часа
    cooldown_time = datetime.utcnow() - timedelta(hours=VIEW_COOLDOWN_HOURS)
    
    existing_stmt = select(ProfileView).where(
        ProfileView.viewer_id == viewer_id,
        ProfileView.viewed_id == viewed_id,
        ProfileView.created_at > cooldown_time
    )
    result = await db.execute(existing_stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        # Обновляем время последнего просмотра
        existing.created_at = datetime.utcnow()
        existing.source = source
        await db.commit()
        return {"recorded": False, "message": "View updated (cooldown)"}
    
    # Создаём новую запись
    view = ProfileView(
        viewer_id=viewer_id,
        viewed_id=viewed_id,
        source=source,
        created_at=datetime.utcnow()
    )
    db.add(view)
    await db.commit()
    
    logger.debug(f"Profile view recorded: {viewer_id} -> {viewed_id} ({source})")
    
    return {"recorded": True, "message": "View recorded"}


async def get_who_viewed_me(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
    is_vip: bool = False
) -> Dict[str, Any]:
    """
    Получить список тех, кто смотрел профиль.
    
    Args:
        user_id: Чей профиль
        limit: Лимит записей
        offset: Смещение для пагинации
        is_vip: VIP пользователь видит полную информацию
    
    Returns:
        {
            "viewers": list,
            "total": int,
            "is_premium_feature": bool,
            "blur_photos": bool
        }
    """
    # Считаем общее количество уникальных просмотров
    total_stmt = select(func.count(func.distinct(ProfileView.viewer_id))).where(
        ProfileView.viewed_id == user_id
    )
    result = await db.execute(total_stmt)
    total = result.scalar() or 0
    
    if total == 0:
        return {
            "viewers": [],
            "total": 0,
            "is_premium_feature": not is_vip,
            "blur_photos": not is_vip
        }
    
    # Получаем просмотры с информацией о пользователях
    # Группируем по viewer_id, берём последний просмотр
    views_stmt = (
        select(
            ProfileView.viewer_id,
            ProfileView.source,
            func.max(ProfileView.created_at).label("last_viewed_at")
        )
        .where(ProfileView.viewed_id == user_id)
        .group_by(ProfileView.viewer_id, ProfileView.source)
        .order_by(func.max(ProfileView.created_at).desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(views_stmt)
    views = result.all()
    
    viewers = []
    for view in views:
        viewer_id = view.viewer_id
        
        # Получаем данные пользователя
        viewer = await db.get(User, viewer_id)
        if not viewer:
            continue
        
        viewer_data = {
            "id": str(viewer_id),
            "viewed_at": view.last_viewed_at.isoformat() if view.last_viewed_at else None,
            "source": view.source
        }
        
        if is_vip:
            # VIP видит полную информацию
            viewer_data.update({
                "name": viewer.name,
                "age": _calculate_age(viewer.birthdate),
                "photo_url": viewer.photo_url,
                "is_verified": viewer.is_verified,
                "is_online": _is_online(viewer.last_active),
                "city": viewer.city
            })
        else:
            # Бесплатные пользователи видят размытые данные
            viewer_data.update({
                "name": _blur_name(viewer.name),
                "age": _calculate_age(viewer.birthdate),
                "photo_url": viewer.photo_url,  # Фронтенд размоет
                "is_verified": viewer.is_verified,
                "is_online": None,
                "city": None,
                "blurred": True
            })
        
        viewers.append(viewer_data)
    
    return {
        "viewers": viewers,
        "total": total,
        "is_premium_feature": not is_vip,
        "blur_photos": not is_vip
    }


async def get_view_count(
    db: AsyncSession,
    user_id: uuid.UUID,
    days: int = 7
) -> int:
    """Получить количество просмотров за последние N дней."""
    since = datetime.utcnow() - timedelta(days=days)
    
    stmt = select(func.count(ProfileView.id)).where(
        ProfileView.viewed_id == user_id,
        ProfileView.created_at > since
    )
    result = await db.execute(stmt)
    return result.scalar() or 0


async def get_view_stats(
    db: AsyncSession,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Получить статистику просмотров профиля.
    """
    now = datetime.utcnow()
    
    # За сегодня
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_stmt = select(func.count(ProfileView.id)).where(
        ProfileView.viewed_id == user_id,
        ProfileView.created_at >= today_start
    )
    result = await db.execute(today_stmt)
    today_count = result.scalar() or 0
    
    # За неделю
    week_ago = now - timedelta(days=7)
    week_stmt = select(func.count(ProfileView.id)).where(
        ProfileView.viewed_id == user_id,
        ProfileView.created_at >= week_ago
    )
    result = await db.execute(week_stmt)
    week_count = result.scalar() or 0
    
    # За месяц
    month_ago = now - timedelta(days=30)
    month_stmt = select(func.count(ProfileView.id)).where(
        ProfileView.viewed_id == user_id,
        ProfileView.created_at >= month_ago
    )
    result = await db.execute(month_stmt)
    month_count = result.scalar() or 0
    
    # Всего уникальных
    unique_stmt = select(func.count(func.distinct(ProfileView.viewer_id))).where(
        ProfileView.viewed_id == user_id
    )
    result = await db.execute(unique_stmt)
    unique_count = result.scalar() or 0
    
    return {
        "today": today_count,
        "this_week": week_count,
        "this_month": month_count,
        "unique_viewers": unique_count
    }


def _calculate_age(birthdate: Optional[datetime]) -> Optional[int]:
    """Вычислить возраст по дате рождения."""
    if not birthdate:
        return None
    today = datetime.utcnow()
    age = today.year - birthdate.year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1
    return age


def _is_online(last_active: Optional[datetime]) -> bool:
    """Проверить, онлайн ли пользователь (активен в последние 5 минут)."""
    if not last_active:
        return False
    return (datetime.utcnow() - last_active).total_seconds() < 300


def _blur_name(name: Optional[str]) -> str:
    """Размыть имя для бесплатных пользователей."""
    if not name:
        return "***"
    if len(name) <= 2:
        return name[0] + "*"
    return name[0] + "*" * (len(name) - 1)
