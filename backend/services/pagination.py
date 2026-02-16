"""
Cursor Pagination Service
==========================
Курсорная пагинация для infinite scroll.

Преимущества перед offset pagination:
- Более эффективна для больших таблиц
- Не пропускает/дублирует записи при добавлении новых
- Идеально подходит для infinite scroll

Формат курсора: base64(created_at:id)
"""

import base64
import json
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, asc, exists
from backend import models

# ============================================================================
# SCHEMAS
# ============================================================================

class PaginatedResponse(BaseModel):
    """Ответ с курсорной пагинацией"""
    items: List[Dict[str, Any]]
    next_cursor: Optional[str] = None
    prev_cursor: Optional[str] = None
    has_more: bool = False
    total_count: Optional[int] = None  # Опционально, для UI


class CursorInfo(BaseModel):
    """Информация о курсоре"""
    created_at: str
    id: str


# ============================================================================
# CURSOR ENCODING/DECODING
# ============================================================================

def encode_cursor(created_at: str, item_id: str) -> str:
    """
    Закодировать курсор в base64.
    
    Args:
        created_at: Дата создания записи (ISO format)
        item_id: ID записи
    
    Returns:
        Base64 encoded cursor string
    """
    data = {"created_at": str(created_at), "id": str(item_id)}
    json_str = json.dumps(data)
    return base64.b64encode(json_str.encode()).decode()


def decode_cursor(cursor: str) -> Optional[CursorInfo]:
    """
    Декодировать курсор из base64.
    
    Returns:
        CursorInfo or None if invalid
    """
    try:
        json_str = base64.b64decode(cursor.encode()).decode()
        data = json.loads(json_str)
        return CursorInfo(**data)
    except Exception:
        return None


# ============================================================================
# PAGINATED QUERIES
# ============================================================================

async def get_profiles_paginated(
    db: AsyncSession,
    current_user_id: str,
    limit: int = 20,
    cursor: Optional[str] = None,
    exclude_swiped: bool = True
) -> PaginatedResponse:
    """
    Получить профили с курсорной пагинацией.
    
    Args:
        db: Сессия БД
        current_user_id: ID текущего пользователя
        limit: Количество записей на странице
        cursor: Курсор для следующей страницы
        exclude_swiped: Исключить уже просвайпанные профили
    
    Returns:
        PaginatedResponse с профилями
    """
    # Базовый запрос
    from uuid import UUID
    from backend.models.user import UserPhoto
    u_id = UUID(current_user_id) if isinstance(current_user_id, str) else current_user_id

    # Подзапрос: пользователь имеет хотя бы 1 фото
    has_photos = exists(
        select(UserPhoto.id).where(UserPhoto.user_id == models.User.id)
    )

    query = select(models.User).where(
        models.User.id != u_id,
        models.User.is_complete == True,
        has_photos,
        models.User.is_active == True
    )
    
    # Исключаем уже просвайпанные (и лайки, и дизлайки)
    # FIX: Use subquery instead of materializing IDs in memory (scales to 100K+ swipes)
    if exclude_swiped:
        from backend.models.interaction import Swipe
        swiped_subquery = select(Swipe.to_user_id).where(
            Swipe.from_user_id == u_id
        ).scalar_subquery()
        query = query.where(~models.User.id.in_(swiped_subquery))
    
    # Применяем курсор
    if cursor:
        cursor_info = decode_cursor(cursor)
        if cursor_info:
            # Парсим дату для корректного сравнения
            from datetime import datetime
            try:
                cursor_date = datetime.fromisoformat(cursor_info.created_at)
            except (ValueError, TypeError):
                cursor_date = cursor_info.created_at

            # Получаем записи после курсора
            query = query.where(
                (models.User.created_at < cursor_date) |
                ((models.User.created_at == cursor_date) & (models.User.id < cursor_info.id))
            )
    
    # Сортировка по дате создания (новые первые) и ID для стабильности

    # Сортировка по дате создания (новые первые) и ID для стабильности
    query = query.order_by(desc(models.User.created_at), desc(models.User.id))
    
    # Берём limit + 1 чтобы определить, есть ли следующая страница
    query = query.limit(limit + 1)
    
    # FIX: Explicit loading to prevent async issues
    from sqlalchemy.orm import selectinload
    query = query.options(
        selectinload(models.User.photos_rel),
        selectinload(models.User.interests_rel)
    )

    try:
        result = await db.execute(query)
        profiles = result.scalars().all()
    except Exception as e:
        print(f"❌ Error in get_profiles_paginated: {e}")
        import traceback
        traceback.print_exc()
        raise e
    
    # Определяем наличие следующей страницы
    has_more = len(profiles) > limit
    if has_more:
        profiles = profiles[:limit]  # Убираем лишний элемент
    
    # Import chat manager to check online status
    from backend.services.chat import manager
    
    # Формируем ответ
    items = []
    for profile in profiles:
        is_online = await manager.is_online_async(str(profile.id))
        items.append({
            "id": str(profile.id),
            "name": profile.name,
            "age": profile.age,
            "gender": profile.gender,
            "bio": profile.bio,
            "photos": profile.photos or [],
            "interests": profile.interests or [],
            "height": getattr(profile, 'height', None),
            "is_verified": getattr(profile, 'is_verified', False),
            "is_vip": profile.is_vip,
            "is_online": is_online,
            "last_seen": profile.last_seen.isoformat() if getattr(profile, 'last_seen', None) else None,
            "created_at": str(profile.created_at)
        })
    
    # Генерируем курсор для следующей страницы
    next_cursor = None
    if has_more and profiles:
        last = profiles[-1]
        next_cursor = encode_cursor(str(last.created_at), str(last.id))
    
    return PaginatedResponse(
        items=items,
        next_cursor=next_cursor,
        has_more=has_more
    )


async def get_matches_paginated(
    db: AsyncSession,
    user_id: str,
    limit: int = 20,
    cursor: Optional[str] = None
) -> PaginatedResponse:
    """
    Получить матчи с курсорной пагинацией.
    """
    from backend import crud
    
    query = select(models.Match).where(
        (models.Match.user1_id == user_id) | (models.Match.user2_id == user_id)
    )
    
    if cursor:
        cursor_info = decode_cursor(cursor)
        if cursor_info:
            query = query.where(
                (models.Match.created_at < cursor_info.created_at) |
                ((models.Match.created_at == cursor_info.created_at) & (models.Match.id < cursor_info.id))
            )
    
    query = query.order_by(desc(models.Match.created_at), desc(models.Match.id))
    query = query.limit(limit + 1)
    
    result = await db.execute(query)
    matches = result.scalars().all()
    
    has_more = len(matches) > limit
    if has_more:
        matches = matches[:limit]
    
    # FIX: Batch fetch all partner profiles in ONE query (N+1 -> 2 queries)
    partner_ids = set()
    for match in matches:
        other_id = match.user2_id if str(match.user1_id) == user_id else match.user1_id
        partner_ids.add(other_id)
    
    # Single query to fetch all partners
    profiles_map = {}
    if partner_ids:
        from sqlalchemy import select as sa_select
        profiles_result = await db.execute(
            sa_select(models.User).where(models.User.id.in_(partner_ids))
        )
        for p in profiles_result.scalars().all():
            profiles_map[p.id] = p
    
    # Import chat manager to check online status
    from backend.services.chat import manager
    
    items = []
    for match in matches:
        other_id = match.user2_id if str(match.user1_id) == user_id else match.user1_id
        profile = profiles_map.get(other_id)
        
        if profile:
            is_online = await manager.is_online_async(str(profile.id))
            items.append({
                "id": str(match.id),
                "created_at": str(match.created_at),
                "user": {
                    "id": str(profile.id),
                    "name": profile.name,
                    "age": profile.age,
                    "photos": profile.photos or [],
                    "is_verified": getattr(profile, 'is_verified', False),
                    "is_online": is_online,
                    "last_seen": profile.last_seen.isoformat() if getattr(profile, 'last_seen', None) else None
                }
            })
    
    next_cursor = None
    if has_more and matches:
        last = matches[-1]
        next_cursor = encode_cursor(str(last.created_at), str(last.id))
    
    return PaginatedResponse(
        items=items,
        next_cursor=next_cursor,
        has_more=has_more
    )


async def get_messages_paginated(
    db: AsyncSession,
    match_id: str,
    limit: int = 50,
    cursor: Optional[str] = None,
    direction: str = "older"  # older or newer
) -> PaginatedResponse:
    """
    Получить сообщения с курсорной пагинацией.
    
    Args:
        direction: "older" (вниз по истории) или "newer" (новые сообщения)
    """
    query = select(models.Message).where(models.Message.match_id == match_id)
    
    if cursor:
        cursor_info = decode_cursor(cursor)
        if cursor_info:
            if direction == "older":
                query = query.where(
                    (models.Message.created_at < cursor_info.created_at) |
                    ((models.Message.created_at == cursor_info.created_at) & (models.Message.id < cursor_info.id))
                )
            else:  # newer
                query = query.where(
                    (models.Message.created_at > cursor_info.created_at) |
                    ((models.Message.created_at == cursor_info.created_at) & (models.Message.id > cursor_info.id))
                )
    
    if direction == "older":
        query = query.order_by(desc(models.Message.created_at), desc(models.Message.id))
    else:
        query = query.order_by(asc(models.Message.created_at), asc(models.Message.id))
    
    query = query.limit(limit + 1)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]
    
    # Для older direction разворачиваем, чтобы новые были внизу
    if direction == "older":
        messages = list(reversed(messages))
    
    items = []
    for msg in messages:
        items.append({
            "id": str(msg.id),
            "sender_id": str(msg.sender_id),
            "text": msg.text,
            "type": msg.type,
            "audio_url": msg.audio_url,
            "duration": msg.duration,
            "created_at": str(msg.created_at)
        })
    
    next_cursor = None
    prev_cursor = None
    
    if has_more:
        if direction == "older" and messages:
            # Курсор на самое старое сообщение
            oldest = messages[0]
            next_cursor = encode_cursor(str(oldest.created_at), str(oldest.id))
        elif direction == "newer" and messages:
            # Курсор на самое новое сообщение
            newest = messages[-1]
            next_cursor = encode_cursor(str(newest.created_at), str(newest.id))
    
    return PaginatedResponse(
        items=items,
        next_cursor=next_cursor,
        prev_cursor=prev_cursor,
        has_more=has_more
    )
