"""
UX Features Service
====================
Дополнительные функции для улучшения пользовательского опыта.

Функции:
1. Push-уведомления (FCM)
2. Онлайн-статус (уже в chat.py)
3. Последний раз был (уже в chat.py)
4. Блокировка (уже в security.py)
5. Жалобы (уже в security.py)
6. Удаление аккаунта
7. Режим "Инкогнито" (VIP)
8. Super Like эффект
9. Отмена последнего свайпа (VIP)
10. Emoji-реакции (уже в chat.py)
"""

import os
import json
import uuid
import logging
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from collections import defaultdict
from enum import Enum
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend import models

logger = logging.getLogger(__name__)

# Firebase FCM Server Key (получить в Firebase Console)
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
FCM_API_URL = "https://fcm.googleapis.com/fcm/send"

# ============================================================================
# PUSH NOTIFICATIONS (FCM)
# ============================================================================

class NotificationType(str, Enum):
    NEW_MATCH = "new_match"
    NEW_MESSAGE = "new_message"
    NEW_LIKE = "new_like"
    SUPER_LIKE = "super_like"
    PROFILE_VIEW = "profile_view"
    MATCH_REMINDER = "match_reminder"
    PROMOTION = "promotion"


class PushNotification(BaseModel):
    title: str
    body: str
    type: NotificationType
    data: Dict[str, Any] = {}
    image_url: Optional[str] = None
    sound: str = "default"
    badge: int = 1


# In-memory storage для FCM токенов (в продакшене - Redis/БД)
_fcm_tokens: Dict[str, List[str]] = defaultdict(list)  # user_id -> [tokens]

# Настройки уведомлений пользователей
_notification_settings: Dict[str, Dict[str, bool]] = defaultdict(lambda: {
    "new_match": True,
    "new_message": True,
    "new_like": True,
    "super_like": True,
    "profile_view": False,
    "match_reminder": True,
    "promotion": False
})


def register_fcm_token(user_id: str, token: str) -> Dict[str, Any]:
    """Зарегистрировать FCM токен устройства"""
    if token not in _fcm_tokens[user_id]:
        _fcm_tokens[user_id].append(token)
        # Храним максимум 5 токенов (5 устройств)
        if len(_fcm_tokens[user_id]) > 5:
            _fcm_tokens[user_id] = _fcm_tokens[user_id][-5:]
    
    logger.info(f"FCM token registered for user {user_id}")
    return {"status": "registered", "tokens_count": len(_fcm_tokens[user_id])}


def unregister_fcm_token(user_id: str, token: str) -> Dict[str, Any]:
    """Удалить FCM токен"""
    if token in _fcm_tokens[user_id]:
        _fcm_tokens[user_id].remove(token)
    return {"status": "unregistered"}


def get_notification_settings(user_id: str) -> Dict[str, bool]:
    """Получить настройки уведомлений"""
    return dict(_notification_settings[user_id])


def update_notification_settings(user_id: str, settings: Dict[str, bool]) -> Dict[str, bool]:
    """Обновить настройки уведомлений"""
    _notification_settings[user_id].update(settings)
    return get_notification_settings(user_id)


async def send_push_notification(
    user_id: str,
    notification: PushNotification,
    silent: bool = False
) -> Dict[str, Any]:
    """Отправить push-уведомление через FCM"""
    
    # Проверяем настройки
    if not _notification_settings[user_id].get(notification.type.value, True):
        return {"sent": False, "reason": "notifications_disabled"}
    
    tokens = _fcm_tokens.get(user_id, [])
    if not tokens:
        return {"sent": False, "reason": "no_fcm_tokens"}
    
    if not FCM_SERVER_KEY:
        logger.warning("FCM_SERVER_KEY not configured")
        return {"sent": False, "reason": "fcm_not_configured"}
    
    # Формируем payload
    payload = {
        "registration_ids": tokens,
        "priority": "high",
        "data": {
            "type": notification.type.value,
            "click_action": "FLUTTER_NOTIFICATION_CLICK",
            **notification.data
        }
    }
    
    if not silent:
        payload["notification"] = {
            "title": notification.title,
            "body": notification.body,
            "sound": notification.sound,
            "badge": notification.badge
        }
        if notification.image_url:
            payload["notification"]["image"] = notification.image_url
    
    # Отправляем
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                FCM_API_URL,
                json=payload,
                headers={
                    "Authorization": f"key={FCM_SERVER_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Push sent to {user_id}: {result.get('success', 0)} success")
                return {"sent": True, "success": result.get("success", 0)}
            else:
                logger.error(f"FCM error: {response.status_code} - {response.text}")
                return {"sent": False, "error": response.text}
                
    except Exception as e:
        logger.error(f"FCM send error: {e}")
        return {"sent": False, "error": str(e)}


# Шаблоны уведомлений
async def notify_new_match(user_id: str, match_name: str, match_photo: str = None):
    """Уведомление о новом матче"""
    return await send_push_notification(user_id, PushNotification(
        title="💕 Новый матч!",
        body=f"Вы понравились друг другу с {match_name}! Напишите первым!",
        type=NotificationType.NEW_MATCH,
        image_url=match_photo,
        data={"action": "open_chat"}
    ))


async def notify_new_message(user_id: str, sender_name: str, message_preview: str):
    """Уведомление о новом сообщении"""
    return await send_push_notification(user_id, PushNotification(
        title=f"💬 {sender_name}",
        body=message_preview[:100],
        type=NotificationType.NEW_MESSAGE,
        data={"action": "open_chat"}
    ))


async def notify_new_like(user_id: str, is_super: bool = False):
    """Уведомление о новом лайке"""
    if is_super:
        return await send_push_notification(user_id, PushNotification(
            title="⭐ Super Like!",
            body="Кто-то поставил вам Super Like! Оформите Premium чтобы узнать кто!",
            type=NotificationType.SUPER_LIKE,
            data={"action": "open_likes"}
        ))
    else:
        return await send_push_notification(user_id, PushNotification(
            title="❤️ Новый лайк!",
            body="Кто-то вас лайкнул! Продолжайте свайпать для матча!",
            type=NotificationType.NEW_LIKE,
            data={"action": "open_discover"}
        ))


# ============================================================================
# INCOGNITO MODE (VIP)
# ============================================================================

# In-memory storage
_incognito_users: Dict[str, Dict[str, Any]] = {}


def enable_incognito(user_id: str) -> Dict[str, Any]:
    """
    Включить режим Инкогнито (VIP функция).
    
    В режиме Инкогнито:
    - Профиль не виден в общем поиске
    - Виден только тем, кого пользователь лайкнул
    - Лайки ставятся анонимно
    """
    _incognito_users[user_id] = {
        "enabled_at": datetime.utcnow().isoformat(),
        "hide_from_search": True,
        "anonymous_likes": True
    }
    
    logger.info(f"Incognito enabled for user {user_id}")
    
    return {
        "status": "enabled",
        "message": "Режим Инкогнито включён. Ваш профиль скрыт от общего поиска.",
        "features": {
            "hide_from_search": True,
            "anonymous_likes": True
        }
    }


def disable_incognito(user_id: str) -> Dict[str, Any]:
    """Отключить режим Инкогнито"""
    if user_id in _incognito_users:
        del _incognito_users[user_id]
    
    return {
        "status": "disabled",
        "message": "Режим Инкогнито выключен. Ваш профиль снова виден всем."
    }


def is_incognito(user_id: str) -> bool:
    """Проверить, в режиме Инкогнито ли пользователь"""
    return user_id in _incognito_users


def get_incognito_settings(user_id: str) -> Dict[str, Any]:
    """Получить настройки Инкогнито"""
    if user_id in _incognito_users:
        return {"enabled": True, **_incognito_users[user_id]}
    return {"enabled": False}


# ============================================================================
# UNDO LAST SWIPE (VIP)
# ============================================================================

# История свайпов для отмены
_swipe_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

# Максимум свайпов для хранения
MAX_UNDO_HISTORY = 10


def record_swipe_for_undo(
    user_id: str,
    swiped_user_id: str,
    action: str,  # "like" or "pass"
    is_super: bool = False
) -> None:
    """Записать свайп для возможности отмены"""
    swipe = {
        "id": str(uuid.uuid4()),
        "swiped_user_id": swiped_user_id,
        "action": action,
        "is_super": is_super,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    _swipe_history[user_id].append(swipe)
    
    # Храним только последние N свайпов
    if len(_swipe_history[user_id]) > MAX_UNDO_HISTORY:
        _swipe_history[user_id] = _swipe_history[user_id][-MAX_UNDO_HISTORY:]


async def undo_last_swipe(db: AsyncSession, user_id: str, is_vip: bool = False) -> Dict[str, Any]:
    """
    Отменить последний свайп (VIP функция).
    
    Returns:
        Профиль отменённого пользователя для повторного показа
    """
    if not is_vip:
        return {
            "success": False,
            "error": "vip_required",
            "message": "Отмена свайпа доступна только для VIP пользователей"
        }
    
    history = _swipe_history.get(user_id, [])
    if not history:
        return {
            "success": False,
            "error": "no_swipes",
            "message": "Нет свайпов для отмены"
        }
    
    # Получаем последний свайп
    last_swipe = history.pop()
    swiped_user_id = last_swipe["swiped_user_id"]
    
    # Удаляем лайк из БД если был
    if last_swipe["action"] == "like":
        try:
            # Удаляем запись о лайке
            result = await db.execute(
                select(models.Like).where(
                    models.Like.liker_id == user_id,
                    models.Like.liked_id == swiped_user_id
                )
            )
            like = result.scalars().first()
            if like:
                await db.delete(like)
                await db.commit()
        except Exception as e:
            logger.error(f"Failed to delete like: {e}")
    
    # Получаем профиль для повторного показа
    result = await db.execute(
        select(models.User).where(models.User.id == swiped_user_id)
    )
    profile = result.scalars().first()
    
    if profile:
        logger.info(f"User {user_id} undid swipe on {swiped_user_id}")
        
        return {
            "success": True,
            "undone_action": last_swipe["action"],
            "profile": {
                "id": str(profile.id),
                "name": profile.name,
                "age": profile.age,
                "bio": profile.bio,
                "photos": profile.photos or [],
                "is_verified": getattr(profile, 'is_verified', False)
            }
        }
    
    return {
        "success": False,
        "error": "profile_not_found",
        "message": "Профиль не найден"
    }


def get_undo_count(user_id: str) -> int:
    """Получить количество доступных отмен"""
    return len(_swipe_history.get(user_id, []))


# ============================================================================
# SUPER LIKE
# ============================================================================

# Эффекты Super Like
SUPER_LIKE_EFFECTS = {
    "notification": True,
    "priority_in_feed": True,
    "special_badge": True,
    "animation": "star_burst"
}


async def process_super_like(
    db: AsyncSession,
    liker_id: str,
    liked_id: str
) -> Dict[str, Any]:
    """
    Обработать Super Like.
    
    Super Like:
    - Уведомляет получателя сразу
    - Профиль лайкера показывается первым
    - Специальный бейдж в стеке
    """
    # Записываем для отмены
    record_swipe_for_undo(liker_id, liked_id, "like", is_super=True)
    
    # Отправляем push-уведомление
    await notify_new_like(liked_id, is_super=True)
    
    # Получаем информацию о лайкере для уведомления
    result = await db.execute(
        select(models.User).where(models.User.id == liker_id)
    )
    liker = result.scalars().first()
    
    return {
        "status": "super_liked",
        "effects": SUPER_LIKE_EFFECTS,
        "notification_sent": True,
        "liker_name": liker.name if liker else None
    }


# ============================================================================
# DELETE ACCOUNT
# ============================================================================

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
        select(models.User).where(models.User.id == user_id)
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
        select(models.User).where(models.User.id == user_id)
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


# ============================================================================
# PROFILE VISIBILITY SETTINGS
# ============================================================================

# Настройки видимости профиля
_visibility_settings: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
    "show_online_status": True,
    "show_last_seen": True,
    "show_distance": True,
    "show_age": True,
    "read_receipts": True
})


def get_visibility_settings(user_id: str) -> Dict[str, Any]:
    """Получить настройки видимости"""
    return dict(_visibility_settings[user_id])


def update_visibility_settings(user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    """Обновить настройки видимости"""
    _visibility_settings[user_id].update(settings)
    return get_visibility_settings(user_id)


# ============================================================================
# BOOST PROFILE
# ============================================================================

# Активные бусты
_active_boosts: Dict[str, Dict[str, Any]] = {}


def activate_boost(user_id: str, duration_minutes: int = 30) -> Dict[str, Any]:
    """
    Активировать буст профиля.
    
    Буст:
    - Профиль показывается первым в ленте
    - Увеличивает видимость в 10 раз
    - Длится 30 минут
    """
    expires_at = datetime.utcnow() + timedelta(minutes=duration_minutes)
    
    _active_boosts[user_id] = {
        "activated_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
        "duration_minutes": duration_minutes
    }
    
    logger.info(f"Boost activated for user {user_id}")
    
    return {
        "status": "activated",
        "expires_at": expires_at.isoformat(),
        "duration_minutes": duration_minutes,
        "message": f"Ваш профиль будет в топе следующие {duration_minutes} минут!"
    }


def is_boosted(user_id: str) -> bool:
    """Проверить, активен ли буст"""
    if user_id not in _active_boosts:
        return False
    
    expires_at = datetime.fromisoformat(_active_boosts[user_id]["expires_at"])
    if datetime.utcnow() > expires_at:
        del _active_boosts[user_id]
        return False
    
    return True


def get_boost_status(user_id: str) -> Dict[str, Any]:
    """Получить статус буста"""
    if is_boosted(user_id):
        boost = _active_boosts[user_id]
        expires_at = datetime.fromisoformat(boost["expires_at"])
        remaining = (expires_at - datetime.utcnow()).total_seconds()
        
        return {
            "active": True,
            "expires_at": boost["expires_at"],
            "remaining_seconds": int(remaining)
        }
    
    return {"active": False}


# ============================================================================
# ACTIVITY REMINDERS
# ============================================================================

async def send_match_reminder(user_id: str, match_name: str, hours_since: int):
    """Напоминание о неотвеченном матче"""
    return await send_push_notification(user_id, PushNotification(
        title="💬 Не забудьте написать!",
        body=f"{match_name} ждёт вашего сообщения уже {hours_since} часов",
        type=NotificationType.MATCH_REMINDER,
        data={"action": "open_chat"}
    ))


async def send_new_profiles_reminder(user_id: str, count: int):
    """Напоминание о новых профилях"""
    return await send_push_notification(user_id, PushNotification(
        title="🆕 Новые профили рядом!",
        body=f"{count} новых людей появились рядом с вами",
        type=NotificationType.PROMOTION,
        data={"action": "open_discover"}
    ))
