"""
Account Deletion
================
Удаление аккаунта с grace period, GDPR compliance.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.user import User

logger = logging.getLogger(__name__)


class AccountDeletionReason(str, Enum):
    FOUND_PARTNER = "found_partner"
    NOT_USING = "not_using"
    PRIVACY_CONCERNS = "privacy_concerns"
    BAD_EXPERIENCE = "bad_experience"
    TOO_MANY_NOTIFICATIONS = "too_many_notifications"
    OTHER = "other"


# Запросы на удаление (для периода ожидания)
_deletion_requests: Dict[str, Dict[str, Any]] = {}

# Период ожидания перед удалением (дни)
DELETION_GRACE_PERIOD_DAYS = 30


async def request_account_deletion(
    db: AsyncSession,
    user_id: str,
    reason: AccountDeletionReason,
    feedback: str = None
) -> Dict[str, Any]:
    """
    Запросить удаление аккаунта.
    
    Процесс:
    1. Пользователь запрашивает удаление
    2. Аккаунт деактивируется
    3. Через 30 дней данные удаляются окончательно
    4. В течение 30 дней можно отменить
    """
    deletion_date = datetime.utcnow() + timedelta(days=DELETION_GRACE_PERIOD_DAYS)
    
    _deletion_requests[user_id] = {
        "requested_at": datetime.utcnow().isoformat(),
        "deletion_date": deletion_date.isoformat(),
        "reason": reason.value,
        "feedback": feedback
    }
    
    # Деактивируем аккаунт
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()
    
    if user:
        user.is_active = False
        await db.commit()
    
    logger.info(f"Account deletion requested for user {user_id}")
    
    return {
        "status": "deletion_scheduled",
        "deletion_date": deletion_date.isoformat(),
        "message": f"Ваш аккаунт будет удалён {deletion_date.strftime('%d.%m.%Y')}. "
                   f"Вы можете отменить удаление в течение {DELETION_GRACE_PERIOD_DAYS} дней.",
        "can_cancel_until": deletion_date.isoformat()
    }


async def cancel_account_deletion(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Отменить запрос на удаление аккаунта"""
    if user_id not in _deletion_requests:
        return {"status": "error", "message": "Запрос на удаление не найден"}
    
    del _deletion_requests[user_id]
    
    # Реактивируем аккаунт
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalars().first()
    
    if user:
        user.is_active = True
        await db.commit()
    
    logger.info(f"Account deletion cancelled for user {user_id}")
    
    return {
        "status": "cancelled",
        "message": "Удаление аккаунта отменено. Рады, что вы остаётесь с нами!"
    }


async def process_scheduled_deletions(db: AsyncSession) -> Dict[str, Any]:
    """
    Обработать запланированные удаления.
    Вызывать через cron раз в день.
    """
    now = datetime.utcnow()
    deleted_count = 0
    
    for user_id, request in list(_deletion_requests.items()):
        deletion_date = datetime.fromisoformat(request["deletion_date"])
        
        if now >= deletion_date:
            # Удаляем все данные пользователя
            await permanently_delete_user_data(db, user_id)
            del _deletion_requests[user_id]
            deleted_count += 1
    
    return {"deleted_count": deleted_count}


async def permanently_delete_user_data(db: AsyncSession, user_id: str):
    """
    Полное удаление данных пользователя (GDPR compliance).
    """
    try:
        # Удаляем все связанные данные
        # 1. Лайки
        await db.execute(
            f"DELETE FROM likes WHERE liker_id = :id OR liked_id = :id",
            {"id": user_id}
        )
        
        # 2. Матчи
        await db.execute(
            f"DELETE FROM matches WHERE user1_id = :id OR user2_id = :id",
            {"id": user_id}
        )
        
        # 3. Сообщения
        await db.execute(
            f"DELETE FROM messages WHERE sender_id = :id",
            {"id": user_id}
        )
        
        # 4. Пользователь
        await db.execute(
            f"DELETE FROM users WHERE id = :id",
            {"id": user_id}
        )
        
        await db.commit()
        
        logger.info(f"User {user_id} data permanently deleted")
        
    except Exception as e:
        logger.error(f"Failed to delete user data: {e}")
        await db.rollback()
        raise


def get_deletion_status(user_id: str) -> Dict[str, Any]:
    """Получить статус запроса на удаление"""
    if user_id in _deletion_requests:
        request = _deletion_requests[user_id]
        return {
            "pending": True,
            "deletion_date": request["deletion_date"],
            "reason": request["reason"]
        }
    return {"pending": False}
