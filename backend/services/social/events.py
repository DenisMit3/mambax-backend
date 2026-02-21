# Events Service - события для знакомств
# Адаптировано под существующую модель DatingEvent

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from backend.models.advanced import DatingEvent
from backend.models.user import User

logger = logging.getLogger(__name__)


async def get_events(
    db: AsyncSession,
    user_id: uuid.UUID,
    city: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Получить список доступных событий.
    
    Args:
        city: Фильтр по городу (не используется в текущей модели)
        category: Фильтр по типу события (event_type)
        limit: Лимит
        offset: Смещение
    
    Returns:
        {
            "events": list,
            "total": int,
            "categories": list
        }
    """
    now = datetime.utcnow()
    
    # Базовый запрос - только будущие события со статусом upcoming или active
    conditions = [
        DatingEvent.status.in_(["upcoming", "active"]),
        DatingEvent.start_date > now
    ]
    
    if category:
        conditions.append(DatingEvent.event_type == category)
    
    # Считаем общее количество
    count_stmt = select(func.count(DatingEvent.id)).where(and_(*conditions))
    result = await db.execute(count_stmt)
    total = result.scalar() or 0
    
    # Получаем события
    events_stmt = (
        select(DatingEvent)
        .where(and_(*conditions))
        .order_by(DatingEvent.start_date.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(events_stmt)
    events = result.scalars().all()
    
    events_list = []
    for event in events:
        events_list.append({
            "id": str(event.id),
            "title": event.name,
            "description": f"Событие от {event.host_name}",
            "category": event.event_type,
            "event_date": event.start_date.isoformat(),
            "max_participants": event.max_participants,
            "current_participants": event.current_participants,
            "is_full": event.current_participants >= event.max_participants if event.max_participants else False,
            "spots_left": max(0, (event.max_participants or 999) - event.current_participants),
            "is_premium": event.is_premium,
            "host_name": event.host_name,
            "status": event.status
        })
    
    # Получаем доступные категории
    categories = await _get_event_categories(db)
    
    return {
        "events": events_list,
        "total": total,
        "categories": categories
    }


async def get_event_details(
    db: AsyncSession,
    event_id: uuid.UUID,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Получить детали события.
    """
    event = await db.get(DatingEvent, event_id)
    
    if not event:
        return {"error": "Событие не найдено"}
    
    return {
        "id": str(event.id),
        "title": event.name,
        "description": f"Событие от {event.host_name}",
        "category": event.event_type,
        "event_date": event.start_date.isoformat(),
        "max_participants": event.max_participants,
        "current_participants": event.current_participants,
        "spots_left": max(0, (event.max_participants or 999) - event.current_participants),
        "is_full": event.current_participants >= event.max_participants if event.max_participants else False,
        "is_premium": event.is_premium,
        "host_name": event.host_name,
        "status": event.status,
        "created_at": event.created_at.isoformat() if event.created_at else None
    }


async def register_for_event(
    db: AsyncSession,
    event_id: uuid.UUID,
    user_id: uuid.UUID,
    use_stars: bool = False
) -> Dict[str, Any]:
    """
    Зарегистрироваться на событие.
    
    Args:
        use_stars: Оплатить звёздами (для premium событий)
    
    Returns:
        {"success": bool, "message": str, "registration": dict}
    """
    event = await db.get(DatingEvent, event_id)
    
    if not event:
        return {"success": False, "message": "Событие не найдено"}
    
    if event.status not in ["upcoming", "active"]:
        return {"success": False, "message": "Регистрация на это событие закрыта"}
    
    if event.start_date < datetime.utcnow():
        return {"success": False, "message": "Событие уже началось"}
    
    # Проверяем места
    if event.max_participants and event.current_participants >= event.max_participants:
        return {"success": False, "message": "Все места заняты"}
    
    user = await db.get(User, user_id)
    if not user:
        return {"success": False, "message": "Пользователь не найден"}
    
    # Для premium событий проверяем VIP или оплату
    if event.is_premium:
        is_vip = getattr(user, 'is_vip', False)
        if not is_vip and not use_stars:
            return {
                "success": False,
                "message": "Это премиум событие. Нужен VIP статус или оплата звёздами.",
                "is_premium": True
            }
        
        if use_stars and not is_vip:
            # Списываем звёзды (например, 100 за премиум событие)
            premium_cost = 100
            if (user.stars_balance or 0) < premium_cost:
                return {
                    "success": False,
                    "message": f"Недостаточно звёзд. Нужно {premium_cost} ⭐",
                    "cost": premium_cost,
                    "balance": float(user.stars_balance or 0)
                }
            user.stars_balance = (user.stars_balance or Decimal(0)) - Decimal(premium_cost)
    
    # Увеличиваем счётчик участников
    event.current_participants += 1
    
    await db.commit()
    
    logger.info(f"User {user_id} registered for event {event_id}")
    
    return {
        "success": True,
        "message": "Регистрация успешна!",
        "registration": {
            "event_id": str(event_id),
            "event_title": event.name,
            "event_date": event.start_date.isoformat(),
            "host": event.host_name
        }
    }


async def cancel_registration(
    db: AsyncSession,
    event_id: uuid.UUID,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Отменить регистрацию на событие.
    """
    event = await db.get(DatingEvent, event_id)
    
    if not event:
        return {"success": False, "message": "Событие не найдено"}
    
    # Уменьшаем счётчик (упрощённая логика без проверки регистрации)
    if event.current_participants > 0:
        event.current_participants -= 1
        await db.commit()
    
    logger.info(f"User {user_id} cancelled registration for event {event_id}")
    
    return {
        "success": True,
        "message": "Регистрация отменена"
    }


async def get_my_events(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_past: bool = False
) -> List[Dict[str, Any]]:
    """
    Получить события пользователя.
    Примечание: текущая модель не хранит регистрации, 
    поэтому возвращаем пустой список.
    """
    # TODO: Добавить таблицу event_registrations для хранения регистраций
    return []


async def _get_event_categories(db: AsyncSession) -> List[Dict[str, Any]]:
    """Получить список категорий событий."""
    return [
        {"id": "speed_dating", "name": "Speed Dating", "icon": "⚡"},
        {"id": "mixer", "name": "Mixer", "icon": "🎉"},
        {"id": "party", "name": "Вечеринки", "icon": "🎊"},
        {"id": "activity", "name": "Активности", "icon": "🎯"},
        {"id": "online", "name": "Онлайн", "icon": "💻"},
        {"id": "workshop", "name": "Мастер-классы", "icon": "🎨"},
    ]


async def create_event(
    db: AsyncSession,
    data: Dict[str, Any],
    organizer_id: Optional[uuid.UUID] = None
) -> Dict[str, Any]:
    """
    Создать новое событие (для админов).
    """
    event = DatingEvent(
        name=data["title"],
        event_type=data.get("category", "activity"),
        status="upcoming",
        start_date=datetime.fromisoformat(data["event_date"]),
        max_participants=data.get("max_participants", 100),
        current_participants=0,
        is_premium=data.get("is_premium", False),
        host_name=data.get("host_name", "MambaX")
    )
    
    db.add(event)
    await db.commit()
    await db.refresh(event)
    
    logger.info(f"Created event {event.id}: {event.name}")
    
    return {"success": True, "event_id": str(event.id)}
