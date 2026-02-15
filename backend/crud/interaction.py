# Interaction CRUD - Лента анкет, свайпы и матчи

from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_, func, exists
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User, UserStatus, UserPhoto
from backend.models.interaction import Swipe, Match
from backend.schemas.interaction import SwipeCreate, SwipeAction


async def get_user_feed(
    db: AsyncSession,
    user_id: UUID,
    limit: int = 10
) -> list[User]:
    """
    Получает ленту анкет для пользователя.
    
    Исключает:
    - Самого пользователя
    
    Если все анкеты просмотрены - показывает заново (бесконечная лента).
    
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
    
    # Подзапрос: пользователь имеет хотя бы 1 фото
    has_photos = exists(
        select(UserPhoto.id).where(UserPhoto.user_id == User.id)
    )
    
    # Основной запрос: пользователи, которых еще НЕ свайпнули
    stmt = (
        select(User)
        .where(
            and_(
                User.id != user_id,           # Не показываем себя
                User.is_complete == True,     # Только завершённые профили
                has_photos,                   # Только с фото
                User.status == UserStatus.ACTIVE, # Only strictly active (excludes shadowban, banned, suspended)
                User.is_active == True,       # Redundant safety check
                User.id.notin_(swiped_users_subquery)  # Не показываем уже свайпнутых
            )
        )
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    profiles = list(result.scalars().all())
    
    # Если нет новых профилей - показываем всех заново (бесконечная лента)
    if not profiles:
        stmt_all = (
            select(User)
            .where(
                and_(
                    User.id != user_id,
                    User.is_complete == True,
                    has_photos,
                    User.status == UserStatus.ACTIVE,  # Исключаем забаненных/shadowban
                    User.is_active == True
                )
            )
            .order_by(func.random())  # FIX: Randomize fallback feed
            .limit(limit)
        )
        result_all = await db.execute(stmt_all)
        profiles = list(result_all.scalars().all())
    
    return profiles


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
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # Swipe already exists (race condition handled)
        existing = await check_existing_swipe(db, from_user_id, swipe_data.to_user_id)
        if existing:
            return existing, False
        # If we are here, something else failed
        raise

    await db.refresh(db_swipe)
    
    is_match = False
    
    # Проверяем взаимный лайк только если текущее действие — лайк или суперлайк
    if swipe_data.action in (SwipeAction.LIKE, SwipeAction.SUPERLIKE):
        
        # --- DEV ONLY: Auto-match logic ---
        from backend.config.settings import settings
        if settings.ENVIRONMENT == "development":
             # Check if reverse swipe exists, if not, create it to force match
             reverse_check = await check_existing_swipe(db, swipe_data.to_user_id, from_user_id)
             if not reverse_check:
                 print(f"DEV: Auto-generating return like from {swipe_data.to_user_id} to {from_user_id}")
                 dev_reverse_swipe = Swipe(
                     from_user_id=swipe_data.to_user_id,
                     to_user_id=from_user_id,
                     action=SwipeAction.LIKE.value
                 )
                 db.add(dev_reverse_swipe)
                 await db.commit() # Commit so the select below finds it
        # ----------------------------------

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


async def get_received_likes(db: AsyncSession, user_id: str, is_vip: bool = False):
    """
    Получить список пользователей, которые лайкнули данного пользователя.
    """
    from uuid import UUID
    u_id = UUID(user_id) if isinstance(user_id, str) else user_id
    
    # Query for 'like' and 'superlike' actions targeting the user
    # FIX: JOIN User directly to avoid N+1 query
    stmt = (
        select(User)
        .join(Swipe, Swipe.from_user_id == User.id)
        .where(
            and_(
                Swipe.to_user_id == u_id,
                Swipe.action.in_(["like", "superlike"])
            )
        )
        .order_by(Swipe.timestamp.desc())
    )
    
    result = await db.execute(stmt)
    profiles = result.scalars().all()
    
    if not is_vip:
        # For non-VIP, we might want to return blurred icons or just a count
        # For now, return basic info but frontend handles masking
        pass

    return profiles


async def get_likes_count(db: AsyncSession, user_id: str) -> int:
    """
    Получить количество полученных лайков.
    """
    from uuid import UUID
    from sqlalchemy import func
    u_id = UUID(user_id) if isinstance(user_id, str) else user_id
    
    stmt = select(func.count(Swipe.id)).where(
        and_(
            Swipe.to_user_id == u_id,
            Swipe.action.in_(["like", "superlike"])
        )
    )
    
    result = await db.execute(stmt)
    return result.scalar() or 0

