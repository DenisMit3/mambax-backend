"""
Push Notifications (FCM)
========================
Отправка push-уведомлений, управление FCM токенами, настройки уведомлений.
"""

import os
import logging
import httpx
from typing import Optional, Dict, Any, List
from collections import defaultdict
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Firebase FCM Server Key (получить в Firebase Console)
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
FCM_API_URL = "https://fcm.googleapis.com/fcm/send"


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
