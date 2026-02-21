"""
Push Notifications (FCM)
========================
Отправка push-уведомлений, управление FCM токенами, настройки уведомлений.
Данные хранятся в Redis для масштабируемости.
"""

import os
import logging
import httpx
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Firebase FCM Server Key (получить в Firebase Console)
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
FCM_API_URL = "https://fcm.googleapis.com/fcm/send"

# Redis key prefixes
FCM_TOKENS_KEY = "fcm:tokens:"  # fcm:tokens:{user_id} -> list of tokens
NOTIFICATION_SETTINGS_KEY = "notification:settings:"  # notification:settings:{user_id} -> hash


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


# Default notification settings
DEFAULT_NOTIFICATION_SETTINGS = {
    "new_match": "1",
    "new_message": "1",
    "new_like": "1",
    "super_like": "1",
    "profile_view": "0",
    "match_reminder": "1",
    "promotion": "0"
}


async def _get_redis():
    """Get Redis client."""
    from backend.core.redis import redis_manager
    return await redis_manager.get_redis()


def register_fcm_token(user_id: str, token: str) -> Dict[str, Any]:
    """Зарегистрировать FCM токен устройства (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Schedule coroutine
            future = asyncio.ensure_future(_register_fcm_token_async(user_id, token))
            return {"status": "registering", "async": True}
        else:
            return loop.run_until_complete(_register_fcm_token_async(user_id, token))
    except RuntimeError:
        # No event loop
        return asyncio.run(_register_fcm_token_async(user_id, token))


async def _register_fcm_token_async(user_id: str, token: str) -> Dict[str, Any]:
    """Зарегистрировать FCM токен устройства в Redis."""
    redis = await _get_redis()
    if not redis:
        logger.warning("Redis not available for FCM token registration")
        return {"status": "error", "error": "redis_unavailable"}
    
    key = f"{FCM_TOKENS_KEY}{user_id}"
    
    # Check if token already exists
    existing = await redis.lrange(key, 0, -1)
    if token not in existing:
        await redis.lpush(key, token)
        # Keep only last 5 tokens (5 devices max)
        await redis.ltrim(key, 0, 4)
        # Set TTL 90 days
        await redis.expire(key, 60 * 60 * 24 * 90)
    
    tokens_count = await redis.llen(key)
    logger.info(f"FCM token registered for user {user_id}")
    return {"status": "registered", "tokens_count": tokens_count}


def unregister_fcm_token(user_id: str, token: str) -> Dict[str, Any]:
    """Удалить FCM токен (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_unregister_fcm_token_async(user_id, token))
            return {"status": "unregistering", "async": True}
        else:
            return loop.run_until_complete(_unregister_fcm_token_async(user_id, token))
    except RuntimeError:
        return asyncio.run(_unregister_fcm_token_async(user_id, token))


async def _unregister_fcm_token_async(user_id: str, token: str) -> Dict[str, Any]:
    """Удалить FCM токен из Redis."""
    redis = await _get_redis()
    if not redis:
        return {"status": "error", "error": "redis_unavailable"}
    
    key = f"{FCM_TOKENS_KEY}{user_id}"
    await redis.lrem(key, 0, token)
    return {"status": "unregistered"}


def get_notification_settings(user_id: str) -> Dict[str, bool]:
    """Получить настройки уведомлений (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Return defaults if in async context
            return {k: v == "1" for k, v in DEFAULT_NOTIFICATION_SETTINGS.items()}
        else:
            return loop.run_until_complete(_get_notification_settings_async(user_id))
    except RuntimeError:
        return asyncio.run(_get_notification_settings_async(user_id))


async def _get_notification_settings_async(user_id: str) -> Dict[str, bool]:
    """Получить настройки уведомлений из Redis."""
    redis = await _get_redis()
    if not redis:
        return {k: v == "1" for k, v in DEFAULT_NOTIFICATION_SETTINGS.items()}
    
    key = f"{NOTIFICATION_SETTINGS_KEY}{user_id}"
    settings = await redis.hgetall(key)
    
    if not settings:
        # Return defaults
        return {k: v == "1" for k, v in DEFAULT_NOTIFICATION_SETTINGS.items()}
    
    # Convert "1"/"0" to bool
    return {k: settings.get(k, DEFAULT_NOTIFICATION_SETTINGS.get(k, "1")) == "1" 
            for k in DEFAULT_NOTIFICATION_SETTINGS.keys()}


def update_notification_settings(user_id: str, settings: Dict[str, bool]) -> Dict[str, bool]:
    """Обновить настройки уведомлений (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_update_notification_settings_async(user_id, settings))
            return {**{k: v == "1" for k, v in DEFAULT_NOTIFICATION_SETTINGS.items()}, **settings}
        else:
            return loop.run_until_complete(_update_notification_settings_async(user_id, settings))
    except RuntimeError:
        return asyncio.run(_update_notification_settings_async(user_id, settings))


async def _update_notification_settings_async(user_id: str, settings: Dict[str, bool]) -> Dict[str, bool]:
    """Обновить настройки уведомлений в Redis."""
    redis = await _get_redis()
    if not redis:
        return {k: v == "1" for k, v in DEFAULT_NOTIFICATION_SETTINGS.items()}
    
    key = f"{NOTIFICATION_SETTINGS_KEY}{user_id}"
    
    # Convert bool to "1"/"0"
    redis_settings = {k: "1" if v else "0" for k, v in settings.items()}
    
    if redis_settings:
        await redis.hset(key, mapping=redis_settings)
        await redis.expire(key, 60 * 60 * 24 * 365)  # 1 year TTL
    
    return await _get_notification_settings_async(user_id)


async def send_push_notification(
    user_id: str,
    notification: PushNotification,
    silent: bool = False
) -> Dict[str, Any]:
    """Отправить push-уведомление через FCM"""
    
    # Проверяем настройки
    settings = await _get_notification_settings_async(user_id)
    if not settings.get(notification.type.value, True):
        return {"sent": False, "reason": "notifications_disabled"}
    
    # Get tokens from Redis
    redis = await _get_redis()
    if not redis:
        return {"sent": False, "reason": "redis_unavailable"}
    
    key = f"{FCM_TOKENS_KEY}{user_id}"
    tokens = await redis.lrange(key, 0, -1)
    
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
                
                # Remove invalid tokens
                if result.get("results"):
                    for i, res in enumerate(result["results"]):
                        if res.get("error") in ["InvalidRegistration", "NotRegistered"]:
                            if i < len(tokens):
                                await redis.lrem(key, 0, tokens[i])
                
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
