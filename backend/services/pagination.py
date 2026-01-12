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
from sqlalchemy import desc, asc
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
    query = select(models.User).where(
        models.User.id != current_user_id,
        models.User.is_complete == True,
        models.User.is_active == True
    )
    
    # Исключаем уже просвайпанные
    if exclude_swiped:
        # Получаем ID профилей, которые уже лайкнули/пропустили
        swiped_query = select(models.Like.liked_id).where(
            models.Like.liker_id == current_user_id
        )
        swiped_result = await db.execute(swiped_query)
        swiped_ids = [str(lid) for lid in swiped_result.scalars().all()]
        
        if swiped_ids:
            query = query.where(~models.User.id.in_(swiped_ids))
    
    # Применяем курсор
    if cursor:
        cursor_info = decode_cursor(cursor)
        if cursor_info:
            # Получаем записи после курсора
            query = query.where(
                (models.User.created_at < cursor_info.created_at) |
                ((models.User.created_at == cursor_info.created_at) & (models.User.id < cursor_info.id))
            )
    
    # Сортировка по дате создания (новые первые) и ID для стабильности
    query = query.order_by(desc(models.User.created_at), desc(models.User.id))
    
    # Берём limit + 1 чтобы определить, есть ли следующая страница
    query = query.limit(limit + 1)
    
    result = await db.execute(query)
    profiles = result.scalars().all()
    
    # Определяем наличие следующей страницы
    has_more = len(profiles) > limit
    if has_more:
        profiles = profiles[:limit]  # Убираем лишний элемент
    
    # Формируем ответ
    items = []
    for profile in profiles:
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
    
    items = []
    for match in matches:
        other_id = match.user2_id if str(match.user1_id) == user_id else match.user1_id
        profile = await crud.get_user_profile(db, str(other_id))
        
        if profile:
            items.append({
                "id": str(match.id),
                "created_at": str(match.created_at),
                "user": {
                    "id": str(profile.id),
                    "name": profile.name,
                    "age": profile.age,
                    "photos": profile.photos or [],
                    "is_verified": getattr(profile, 'is_verified', False)
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
