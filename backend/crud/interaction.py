# Interaction CRUD - Лента анкет, свайпы и матчи

from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from models.interaction import Swipe, Match
from schemas.interaction import SwipeCreate, SwipeAction


async def get_user_feed(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 10
) -> list[User]:
    """
    Получает ленту анкет для пользователя.
    
    Исключает:
    - Самого пользователя
    - Пользователей, которых уже свайпнули
    
    Args:
        db: Асинхронная сессия
        user_id: ID текущего пользователя
        limit: Максимальное количество анкет
    
    Returns:
        Список пользователей для показа
    """
    # Подзапрос: ID пользователей, которых мы уже свайпнули
    swiped_users_subquery = (
        select(Swipe.to_user_id)
        .where(Swipe.from_user_id == user_id)
        .scalar_subquery()
    )
    
    # Основной запрос: все активные пользователи
    # Исключаем себя и уже свайпнутых
    stmt = (
        select(User)
        .where(
            and_(
                User.id != user_id,           # Не показываем себя
                User.is_active == True,       # Только активные
                User.id.notin_(swiped_users_subquery)  # Не показываем уже свайпнутых
            )
        )
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_swipe(
    db: AsyncSession,
    from_user_id: UUID,
    swipe_data: SwipeCreate
) -> Tuple[Swipe, bool]:
    """
    Создаёт свайп и проверяет наличие взаимного лайка (матча).
    
    Args:
        db: Асинхронная сессия
        from_user_id: ID пользователя, который свайпает
        swipe_data: Данные свайпа (to_user_id, action)
    
    Returns:
        Tuple[Swipe, bool]: Созданный свайп и флаг is_match
    """
    # Создаём свайп
    db_swipe = Swipe(
        from_user_id=from_user_id,
        to_user_id=swipe_data.to_user_id,
        action=swipe_data.action.value,  # Enum to string
    )
    
    db.add(db_swipe)
    await db.commit()
    await db.refresh(db_swipe)
    
    is_match = False
    
    # Проверяем взаимный лайк только если текущее действие — лайк или суперлайк
    if swipe_data.action in (SwipeAction.LIKE, SwipeAction.SUPERLIKE):
        # Ищем встречный лайк: to_user лайкнул from_user
        reverse_like_stmt = select(Swipe).where(
            and_(
                Swipe.from_user_id == swipe_data.to_user_id,
                Swipe.to_user_id == from_user_id,
                Swipe.action.in_([SwipeAction.LIKE.value, SwipeAction.SUPERLIKE.value])
            )
        )
        
        result = await db.execute(reverse_like_stmt)
        reverse_like = result.scalar_one_or_none()
        
        if reverse_like:
            # Матч! Создаём запись о матче
            is_match = True
            db_match = Match(
                user1_id=from_user_id,
                user2_id=swipe_data.to_user_id,
            )
            db.add(db_match)
            await db.commit()
    
    return db_swipe, is_match


async def get_user_matches(
    db: AsyncSession,
    user_id: UUID
) -> list[Match]:
    """
    Получает все матчи пользователя.
    
    Args:
        db: Асинхронная сессия
        user_id: ID пользователя
    
    Returns:
        Список матчей
    """
    stmt = select(Match).where(
        and_(
            or_(
                Match.user1_id == user_id,
                Match.user2_id == user_id
            ),
            Match.is_active == True
        )
    )
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def check_existing_swipe(
    db: AsyncSession,
    from_user_id: UUID,
    to_user_id: UUID
) -> Optional[Swipe]:
    """
    Проверяет, существует ли уже свайп между пользователями.
    
    Args:
        db: Асинхронная сессия
        from_user_id: ID свайпающего
        to_user_id: ID получателя
    
    Returns:
        Swipe если существует, иначе None
    """
    stmt = select(Swipe).where(
        and_(
            Swipe.from_user_id == from_user_id,
            Swipe.to_user_id == to_user_id
        )
    )
    
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
