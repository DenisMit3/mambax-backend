# Stories Service - истории 24ч как в Instagram

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete

from backend.models.social import Story, StoryView, StoryReaction
from backend.models.interaction import Match
from backend.models.user import User

logger = logging.getLogger(__name__)

# Настройки
STORY_DURATION_HOURS = 24
MAX_STORIES_PER_USER = 10
MAX_STORY_CAPTION_LENGTH = 500


async def create_story(
    db: AsyncSession,
    user_id: uuid.UUID,
    media_url: str,
    media_type: str = "image",
    caption: Optional[str] = None
) -> Dict[str, Any]:
    """
    Создать новую историю.
    
    Args:
        media_url: URL загруженного медиа
        media_type: "image" или "video"
        caption: Подпись (опционально)
    
    Returns:
        {"success": bool, "story": dict, "message": str}
    """
    # Валидация media_type
    if media_type not in ("image", "video"):
        return {"success": False, "message": "Неверный тип медиа"}
    
    # Валидация caption
    if caption:
        caption = caption.strip()[:MAX_STORY_CAPTION_LENGTH]
    
    # Проверяем лимит активных историй
    active_count_stmt = select(func.count(Story.id)).where(
        Story.user_id == user_id,
        Story.is_active == True,
        Story.expires_at > datetime.utcnow()
    )
    result = await db.execute(active_count_stmt)
    active_count = result.scalar() or 0
    
    if active_count >= MAX_STORIES_PER_USER:
        return {
            "success": False,
            "message": f"Достигнут лимит ({MAX_STORIES_PER_USER} историй). Дождись истечения старых."
        }
    
    # Создаём историю
    expires_at = datetime.utcnow() + timedelta(hours=STORY_DURATION_HOURS)
    
    story = Story(
        user_id=user_id,
        media_url=media_url,
        media_type=media_type,
        caption=caption,
        expires_at=expires_at,
        is_active=True,
        view_count=0
    )
    db.add(story)
    await db.commit()
    await db.refresh(story)
    
    logger.info(f"User {user_id} created story {story.id}")
    
    return {
        "success": True,
        "story": {
            "id": str(story.id),
            "media_url": story.media_url,
            "media_type": story.media_type,
            "caption": story.caption,
            "expires_at": story.expires_at.isoformat(),
            "created_at": story.created_at.isoformat()
        },
        "message": "История создана"
    }


async def get_stories_feed(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Получить ленту историй от матчей.
    Группирует истории по пользователям.
    
    Returns:
        List of {
            "user_id": str,
            "user_name": str,
            "user_photo": str,
            "stories": [...],
            "has_unseen": bool
        }
    """
    now = datetime.utcnow()
    
    # Получаем ID всех матчей пользователя
    matches_stmt = select(Match).where(
        or_(
            Match.user1_id == user_id,
            Match.user2_id == user_id
        ),
        Match.is_active == True
    )
    result = await db.execute(matches_stmt)
    matches = result.scalars().all()
    
    # Собираем ID матчей
    match_user_ids = set()
    for match in matches:
        if match.user1_id == user_id:
            match_user_ids.add(match.user2_id)
        else:
            match_user_ids.add(match.user1_id)
    
    # Добавляем свои истории
    match_user_ids.add(user_id)
    
    if not match_user_ids:
        return []
    
    # Получаем активные истории от матчей
    stories_stmt = (
        select(Story)
        .where(
            Story.user_id.in_(match_user_ids),
            Story.is_active == True,
            Story.expires_at > now
        )
        .order_by(Story.created_at.desc())
    )
    result = await db.execute(stories_stmt)
    stories = result.scalars().all()
    
    # Получаем просмотренные истории текущим пользователем
    viewed_stmt = select(StoryView.story_id).where(StoryView.viewer_id == user_id)
    result = await db.execute(viewed_stmt)
    viewed_story_ids = {row[0] for row in result.all()}
    
    # Группируем по пользователям
    users_stories: Dict[uuid.UUID, List[Story]] = {}
    for story in stories:
        if story.user_id not in users_stories:
            users_stories[story.user_id] = []
        users_stories[story.user_id].append(story)
    
    # Формируем результат
    feed = []
    for story_user_id, user_stories in users_stories.items():
        # Получаем данные пользователя
        user = await db.get(User, story_user_id)
        if not user:
            continue
        
        has_unseen = any(s.id not in viewed_story_ids for s in user_stories)
        
        feed.append({
            "user_id": str(story_user_id),
            "user_name": user.name or "Аноним",
            "user_photo": user.photo_url,
            "is_me": story_user_id == user_id,
            "has_unseen": has_unseen,
            "stories": [
                {
                    "id": str(s.id),
                    "media_url": s.media_url,
                    "media_type": s.media_type,
                    "caption": s.caption,
                    "view_count": s.view_count,
                    "is_viewed": s.id in viewed_story_ids,
                    "expires_at": s.expires_at.isoformat(),
                    "created_at": s.created_at.isoformat()
                }
                for s in sorted(user_stories, key=lambda x: x.created_at)
            ]
        })
    
    # Сортируем: непросмотренные первыми, свои в начале
    feed.sort(key=lambda x: (not x["is_me"], not x["has_unseen"], x["stories"][0]["created_at"] if x["stories"] else ""))
    
    return feed


async def view_story(
    db: AsyncSession,
    story_id: uuid.UUID,
    viewer_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Отметить просмотр истории.
    
    Returns:
        {"success": bool, "view_count": int}
    """
    story = await db.get(Story, story_id)
    
    if not story:
        return {"success": False, "message": "История не найдена"}
    
    if not story.is_active or story.expires_at < datetime.utcnow():
        return {"success": False, "message": "История истекла"}
    
    # Нельзя просматривать свою историю (для статистики)
    if story.user_id == viewer_id:
        return {"success": True, "view_count": story.view_count, "is_own": True}
    
    # Проверяем, не просмотрена ли уже
    existing_stmt = select(StoryView).where(
        StoryView.story_id == story_id,
        StoryView.viewer_id == viewer_id
    )
    result = await db.execute(existing_stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        return {"success": True, "view_count": story.view_count, "already_viewed": True}
    
    # Создаём запись о просмотре
    view = StoryView(
        story_id=story_id,
        viewer_id=viewer_id
    )
    db.add(view)
    
    # Увеличиваем счётчик
    story.view_count += 1
    
    await db.commit()
    
    return {"success": True, "view_count": story.view_count}


async def react_to_story(
    db: AsyncSession,
    story_id: uuid.UUID,
    user_id: uuid.UUID,
    emoji: str
) -> Dict[str, Any]:
    """
    Добавить реакцию на историю.
    
    Args:
        emoji: Эмодзи реакции (❤️, 🔥, 😂, 😮, 😢, 👏)
    
    Returns:
        {"success": bool, "message": str}
    """
    # Валидация эмодзи
    allowed_emojis = {"❤️", "🔥", "😂", "😮", "😢", "👏", "💯", "🥰"}
    if emoji not in allowed_emojis:
        return {"success": False, "message": "Недопустимая реакция"}
    
    story = await db.get(Story, story_id)
    
    if not story:
        return {"success": False, "message": "История не найдена"}
    
    if not story.is_active or story.expires_at < datetime.utcnow():
        return {"success": False, "message": "История истекла"}
    
    # Нельзя реагировать на свою историю
    if story.user_id == user_id:
        return {"success": False, "message": "Нельзя реагировать на свою историю"}
    
    # Проверяем существующую реакцию
    existing_stmt = select(StoryReaction).where(
        StoryReaction.story_id == story_id,
        StoryReaction.user_id == user_id
    )
    result = await db.execute(existing_stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        # Обновляем реакцию
        existing.emoji = emoji
        existing.created_at = datetime.utcnow()
        action = "updated"
    else:
        # Создаём новую реакцию
        reaction = StoryReaction(
            story_id=story_id,
            user_id=user_id,
            emoji=emoji
        )
        db.add(reaction)
        action = "created"
    
    await db.commit()
    
    # TODO: Отправить уведомление автору истории
    
    return {"success": True, "message": "Реакция добавлена", "action": action}


async def get_story_viewers(
    db: AsyncSession,
    story_id: uuid.UUID,
    owner_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Получить список просмотревших историю (только для автора).
    
    Returns:
        {"viewers": list, "total": int}
    """
    story = await db.get(Story, story_id)
    
    if not story:
        return {"error": "История не найдена"}
    
    if story.user_id != owner_id:
        return {"error": "Нет доступа"}
    
    # Получаем просмотры с данными пользователей
    views_stmt = (
        select(StoryView)
        .where(StoryView.story_id == story_id)
        .order_by(StoryView.viewed_at.desc())
        .limit(100)
    )
    result = await db.execute(views_stmt)
    views = result.scalars().all()
    
    # Получаем реакции
    reactions_stmt = select(StoryReaction).where(StoryReaction.story_id == story_id)
    result = await db.execute(reactions_stmt)
    reactions = {r.user_id: r.emoji for r in result.scalars().all()}
    
    viewers = []
    for view in views:
        user = await db.get(User, view.viewer_id)
        if user:
            viewers.append({
                "id": str(view.viewer_id),
                "name": user.name,
                "photo_url": user.photo_url,
                "viewed_at": view.viewed_at.isoformat() if view.viewed_at else None,
                "reaction": reactions.get(view.viewer_id)
            })
    
    return {
        "viewers": viewers,
        "total": story.view_count
    }


async def delete_story(
    db: AsyncSession,
    story_id: uuid.UUID,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Удалить историю.
    """
    story = await db.get(Story, story_id)
    
    if not story:
        return {"success": False, "message": "История не найдена"}
    
    if story.user_id != user_id:
        return {"success": False, "message": "Нет доступа"}
    
    # Удаляем связанные данные
    await db.execute(delete(StoryView).where(StoryView.story_id == story_id))
    await db.execute(delete(StoryReaction).where(StoryReaction.story_id == story_id))
    
    # Удаляем историю
    await db.delete(story)
    await db.commit()
    
    logger.info(f"User {user_id} deleted story {story_id}")
    
    return {"success": True, "message": "История удалена"}


async def cleanup_expired_stories(db: AsyncSession) -> int:
    """
    Очистить истёкшие истории (для cron job).
    
    Returns:
        Количество удалённых историй
    """
    now = datetime.utcnow()
    
    # Находим истёкшие истории
    expired_stmt = select(Story).where(
        Story.expires_at < now,
        Story.is_active == True
    )
    result = await db.execute(expired_stmt)
    expired_stories = result.scalars().all()
    
    count = 0
    for story in expired_stories:
        story.is_active = False
        count += 1
    
    if count > 0:
        await db.commit()
        logger.info(f"Deactivated {count} expired stories")
    
    return count


async def get_my_stories(
    db: AsyncSession,
    user_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Получить свои активные истории.
    """
    now = datetime.utcnow()
    
    stmt = (
        select(Story)
        .where(
            Story.user_id == user_id,
            Story.is_active == True,
            Story.expires_at > now
        )
        .order_by(Story.created_at.desc())
    )
    result = await db.execute(stmt)
    stories = result.scalars().all()
    
    return [
        {
            "id": str(s.id),
            "media_url": s.media_url,
            "media_type": s.media_type,
            "caption": s.caption,
            "view_count": s.view_count,
            "expires_at": s.expires_at.isoformat(),
            "created_at": s.created_at.isoformat(),
            "remaining_hours": max(0, (s.expires_at - now).total_seconds() / 3600)
        }
        for s in stories
    ]
