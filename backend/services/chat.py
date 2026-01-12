"""
Real-Time Chat Service
=======================
Полнофункциональный чат с WebSocket.

Функции:
1. WebSocket real-time сообщения
2. Индикатор "печатает..."
3. Статус "прочитано"
4. Голосовые сообщения
5. Фото в чате
6. Видеозвонки (WebRTC сигналинг)
7. Исчезающие сообщения
8. GIF-ки (GIPHY)
9. Реакции на сообщения
"""

import os
import json
import uuid
import asyncio
import logging
import aiohttp
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Set
from enum import Enum
from pydantic import BaseModel
from collections import defaultdict

logger = logging.getLogger(__name__)

# GIPHY API Key (бесплатный уровень)
GIPHY_API_KEY = os.getenv("GIPHY_API_KEY", "GlVGYHkr3WSBnllca54iNt0yFbjz7L65")

# ============================================================================
# ENUMS & MODELS
# ============================================================================

class MessageType(str, Enum):
    TEXT = "text"
    PHOTO = "photo"
    VOICE = "voice"
    VIDEO = "video"
    GIF = "gif"
    STICKER = "sticker"
    SYSTEM = "system"
    CALL_STARTED = "call_started"
    CALL_ENDED = "call_ended"


class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class ChatEvent(str, Enum):
    MESSAGE = "message"
    TYPING = "typing"
    STOP_TYPING = "stop_typing"
    READ = "read"
    DELIVERED = "delivered"
    REACTION = "reaction"
    MESSAGE_DELETED = "message_deleted"
    CALL_SIGNAL = "call_signal"
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"


class ChatMessage(BaseModel):
    id: str
    match_id: str
    sender_id: str
    type: MessageType = MessageType.TEXT
    text: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None  # Для голосовых/видео в секундах
    gif_id: Optional[str] = None
    reply_to_id: Optional[str] = None
    reactions: Dict[str, List[str]] = {}  # {emoji: [user_ids]}
    status: MessageStatus = MessageStatus.SENT
    is_ephemeral: bool = False  # Исчезающее сообщение
    ephemeral_seconds: Optional[int] = None
    viewed_at: Optional[str] = None  # Когда просмотрено (для ephemeral)
    created_at: str
    edited_at: Optional[str] = None


class TypingIndicator(BaseModel):
    match_id: str
    user_id: str
    is_typing: bool
    timestamp: str


class CallSession(BaseModel):
    id: str
    match_id: str
    caller_id: str
    callee_id: str
    type: str  # "audio" or "video"
    status: str  # "calling", "ringing", "connected", "ended"
    started_at: str
    connected_at: Optional[str] = None
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None


# ============================================================================
# IN-MEMORY STORAGE (для Production использовать Redis)
# ============================================================================

# Активные WebSocket соединения: {user_id: [websocket, ...]}
active_connections: Dict[str, List[Any]] = defaultdict(list)

# Статус печатания: {match_id: {user_id: timestamp}}
typing_status: Dict[str, Dict[str, float]] = defaultdict(dict)

# Онлайн статус: {user_id: last_seen_timestamp}
online_status: Dict[str, float] = {}

# Активные звонки: {call_id: CallSession}
active_calls: Dict[str, CallSession] = {}

# Непрочитанные сообщения: {user_id: {match_id: count}}
unread_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

# Статусы сообщений: {message_id: MessageStatus}
message_statuses: Dict[str, MessageStatus] = {}

# Реакции на сообщения: {message_id: {emoji: [user_ids]}}
message_reactions: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))

# Исчезающие сообщения: {message_id: delete_at_timestamp}
ephemeral_messages: Dict[str, float] = {}


# ============================================================================
# CONNECTION MANAGEMENT
# ============================================================================

class ConnectionManager:
    """Менеджер WebSocket соединений"""
    
    def __init__(self):
        self.active_connections: Dict[str, List] = defaultdict(list)
        self.user_matches: Dict[str, Set[str]] = defaultdict(set)  # user_id -> match_ids
    
    async def connect(self, websocket, user_id: str):
        """Подключить пользователя"""
        await websocket.accept()
        self.active_connections[user_id].append(websocket)
        online_status[user_id] = datetime.utcnow().timestamp()
        
        logger.info(f"WebSocket connected: {user_id}")
        
        # Уведомляем других пользователей о том, что пользователь онлайн
        await self.broadcast_online_status(user_id, True)
    
    def disconnect(self, websocket, user_id: str):
        """Отключить пользователя"""
        if websocket in self.active_connections[user_id]:
            self.active_connections[user_id].remove(websocket)
        
        # Если больше нет соединений, отмечаем как offline
        if not self.active_connections[user_id]:
            online_status[user_id] = datetime.utcnow().timestamp()
            # Async broadcast будет вызван отдельно
        
        logger.info(f"WebSocket disconnected: {user_id}")
    
    async def broadcast_online_status(self, user_id: str, is_online: bool):
        """Уведомить о статусе онлайн"""
        event = {
            "type": ChatEvent.USER_ONLINE if is_online else ChatEvent.USER_OFFLINE,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Отправляем всем подключённым пользователям
        # В реальности отправлять только пользователям с общими матчами
        for uid, connections in self.active_connections.items():
            if uid != user_id:
                for ws in connections:
                    try:
                        await ws.send_json(event)
                    except:
                        pass
    
    async def send_personal(self, user_id: str, message: dict):
        """Отправить сообщение конкретному пользователю"""
        connections = self.active_connections.get(user_id, [])
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to {user_id}: {e}")
    
    async def send_to_match(self, match_id: str, sender_id: str, recipient_id: str, message: dict):
        """Отправить сообщение участникам матча"""
        # Отправляем получателю
        await self.send_personal(recipient_id, message)
        
        # Отправляем отправителю (подтверждение)
        confirmation = {**message, "confirmed": True}
        await self.send_personal(sender_id, confirmation)
    
    def is_online(self, user_id: str) -> bool:
        """Проверить, онлайн ли пользователь"""
        return len(self.active_connections.get(user_id, [])) > 0
    
    def get_last_seen(self, user_id: str) -> Optional[str]:
        """Получить время последнего онлайна"""
        ts = online_status.get(user_id)
        if ts:
            return datetime.fromtimestamp(ts).isoformat()
        return None


# Глобальный менеджер соединений
manager = ConnectionManager()


# ============================================================================
# TYPING INDICATOR
# ============================================================================

async def set_typing(match_id: str, user_id: str, is_typing: bool):
    """Установить статус печатания"""
    import time
    
    if is_typing:
        typing_status[match_id][user_id] = time.time()
    else:
        typing_status[match_id].pop(user_id, None)
    
    return TypingIndicator(
        match_id=match_id,
        user_id=user_id,
        is_typing=is_typing,
        timestamp=datetime.utcnow().isoformat()
    )


def get_typing_users(match_id: str, exclude_user_id: str = None) -> List[str]:
    """Получить список печатающих пользователей"""
    import time
    now = time.time()
    timeout = 5  # 5 секунд таймаут
    
    typing_users = []
    for user_id, ts in list(typing_status.get(match_id, {}).items()):
        if now - ts < timeout and user_id != exclude_user_id:
            typing_users.append(user_id)
        elif now - ts >= timeout:
            typing_status[match_id].pop(user_id, None)
    
    return typing_users


# ============================================================================
# MESSAGE STATUS (READ/DELIVERED)
# ============================================================================

async def mark_as_delivered(message_id: str, recipient_id: str) -> Dict[str, Any]:
    """Отметить сообщение как доставленное"""
    message_statuses[message_id] = MessageStatus.DELIVERED
    
    return {
        "type": ChatEvent.DELIVERED,
        "message_id": message_id,
        "status": MessageStatus.DELIVERED,
        "timestamp": datetime.utcnow().isoformat()
    }


async def mark_as_read(match_id: str, user_id: str, message_ids: List[str] = None) -> Dict[str, Any]:
    """Отметить сообщения как прочитанные"""
    now = datetime.utcnow().isoformat()
    
    if message_ids:
        for msg_id in message_ids:
            message_statuses[msg_id] = MessageStatus.READ
    
    # Сбрасываем счётчик непрочитанных
    unread_counts[user_id][match_id] = 0
    
    return {
        "type": ChatEvent.READ,
        "match_id": match_id,
        "user_id": user_id,
        "message_ids": message_ids,
        "timestamp": now
    }


def get_unread_count(user_id: str, match_id: str = None) -> Dict[str, int]:
    """Получить количество непрочитанных сообщений"""
    if match_id:
        return {match_id: unread_counts[user_id].get(match_id, 0)}
    return dict(unread_counts[user_id])


def increment_unread(user_id: str, match_id: str):
    """Увеличить счётчик непрочитанных"""
    unread_counts[user_id][match_id] += 1


# ============================================================================
# REACTIONS
# ============================================================================

AVAILABLE_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "💯", "🎉"]


async def add_reaction(message_id: str, user_id: str, emoji: str) -> Dict[str, Any]:
    """Добавить реакцию на сообщение"""
    if emoji not in AVAILABLE_REACTIONS:
        raise ValueError(f"Invalid reaction. Available: {AVAILABLE_REACTIONS}")
    
    # Удаляем предыдущую реакцию этого пользователя
    for e, users in message_reactions[message_id].items():
        if user_id in users:
            users.remove(user_id)
    
    # Добавляем новую
    if user_id not in message_reactions[message_id][emoji]:
        message_reactions[message_id][emoji].append(user_id)
    
    return {
        "type": ChatEvent.REACTION,
        "message_id": message_id,
        "user_id": user_id,
        "emoji": emoji,
        "reactions": dict(message_reactions[message_id]),
        "timestamp": datetime.utcnow().isoformat()
    }


async def remove_reaction(message_id: str, user_id: str) -> Dict[str, Any]:
    """Удалить реакцию"""
    for emoji, users in message_reactions[message_id].items():
        if user_id in users:
            users.remove(user_id)
    
    return {
        "type": ChatEvent.REACTION,
        "message_id": message_id,
        "user_id": user_id,
        "emoji": None,
        "reactions": dict(message_reactions[message_id]),
        "timestamp": datetime.utcnow().isoformat()
    }


def get_reactions(message_id: str) -> Dict[str, List[str]]:
    """Получить реакции на сообщение"""
    return dict(message_reactions.get(message_id, {}))


# ============================================================================
# EPHEMERAL MESSAGES (Исчезающие)
# ============================================================================

async def create_ephemeral_message(
    match_id: str,
    sender_id: str,
    text: str = None,
    media_url: str = None,
    seconds: int = 10  # По умолчанию 10 секунд
) -> ChatMessage:
    """Создать исчезающее сообщение"""
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        match_id=match_id,
        sender_id=sender_id,
        type=MessageType.PHOTO if media_url else MessageType.TEXT,
        text=text,
        media_url=media_url,
        is_ephemeral=True,
        ephemeral_seconds=seconds,
        created_at=datetime.utcnow().isoformat()
    )
    
    return msg


async def mark_ephemeral_viewed(message_id: str) -> Dict[str, Any]:
    """Отметить просмотр исчезающего сообщения"""
    now = datetime.utcnow()
    
    # Устанавливаем время удаления
    # В реальном приложении сообщение удаляется после просмотра
    
    return {
        "message_id": message_id,
        "viewed_at": now.isoformat(),
        "status": "viewed"
    }


# ============================================================================
# GIPHY INTEGRATION
# ============================================================================

async def search_gifs(query: str, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    """Поиск GIF-ок через GIPHY API"""
    url = "https://api.giphy.com/v1/gifs/search"
    params = {
        "api_key": GIPHY_API_KEY,
        "q": query,
        "limit": limit,
        "offset": offset,
        "rating": "pg-13",  # Безопасный контент
        "lang": "ru"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "gifs": [
                            {
                                "id": gif["id"],
                                "url": gif["images"]["fixed_height"]["url"],
                                "preview_url": gif["images"]["fixed_height_small"]["url"],
                                "width": int(gif["images"]["fixed_height"]["width"]),
                                "height": int(gif["images"]["fixed_height"]["height"]),
                                "title": gif.get("title", "")
                            }
                            for gif in data.get("data", [])
                        ],
                        "total": data.get("pagination", {}).get("total_count", 0),
                        "offset": offset
                    }
    except Exception as e:
        logger.error(f"GIPHY search error: {e}")
    
    return {"gifs": [], "total": 0, "offset": 0, "error": "Failed to search GIFs"}


async def get_trending_gifs(limit: int = 20) -> Dict[str, Any]:
    """Получить популярные GIF-ки"""
    url = "https://api.giphy.com/v1/gifs/trending"
    params = {
        "api_key": GIPHY_API_KEY,
        "limit": limit,
        "rating": "pg-13"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "gifs": [
                            {
                                "id": gif["id"],
                                "url": gif["images"]["fixed_height"]["url"],
                                "preview_url": gif["images"]["fixed_height_small"]["url"],
                                "width": int(gif["images"]["fixed_height"]["width"]),
                                "height": int(gif["images"]["fixed_height"]["height"]),
                                "title": gif.get("title", "")
                            }
                            for gif in data.get("data", [])
                        ]
                    }
    except Exception as e:
        logger.error(f"GIPHY trending error: {e}")
    
    return {"gifs": [], "error": "Failed to get trending GIFs"}


# ============================================================================
# VIDEO CALLS (WebRTC Signaling)
# ============================================================================

async def initiate_call(
    match_id: str,
    caller_id: str,
    callee_id: str,
    call_type: str = "video"
) -> CallSession:
    """Инициировать звонок"""
    call = CallSession(
        id=str(uuid.uuid4()),
        match_id=match_id,
        caller_id=caller_id,
        callee_id=callee_id,
        type=call_type,
        status="calling",
        started_at=datetime.utcnow().isoformat()
    )
    
    active_calls[call.id] = call
    
    # Отправляем уведомление вызываемому
    await manager.send_personal(callee_id, {
        "type": ChatEvent.CALL_SIGNAL,
        "action": "incoming_call",
        "call": call.dict()
    })
    
    logger.info(f"Call initiated: {caller_id} -> {callee_id}")
    
    return call


async def answer_call(call_id: str, user_id: str, accept: bool) -> Dict[str, Any]:
    """Ответить на звонок"""
    if call_id not in active_calls:
        return {"error": "Call not found"}
    
    call = active_calls[call_id]
    
    if user_id != call.callee_id:
        return {"error": "Not authorized"}
    
    if accept:
        call.status = "connected"
        call.connected_at = datetime.utcnow().isoformat()
        
        # Уведомляем вызывающего
        await manager.send_personal(call.caller_id, {
            "type": ChatEvent.CALL_SIGNAL,
            "action": "call_accepted",
            "call": call.dict()
        })
    else:
        call.status = "ended"
        call.ended_at = datetime.utcnow().isoformat()
        
        await manager.send_personal(call.caller_id, {
            "type": ChatEvent.CALL_SIGNAL,
            "action": "call_declined",
            "call": call.dict()
        })
        
        del active_calls[call_id]
    
    return {"call": call.dict()}


async def end_call(call_id: str, user_id: str) -> Dict[str, Any]:
    """Завершить звонок"""
    if call_id not in active_calls:
        return {"error": "Call not found"}
    
    call = active_calls[call_id]
    call.status = "ended"
    call.ended_at = datetime.utcnow().isoformat()
    
    if call.connected_at:
        started = datetime.fromisoformat(call.connected_at)
        ended = datetime.fromisoformat(call.ended_at)
        call.duration_seconds = int((ended - started).total_seconds())
    
    other_user = call.callee_id if user_id == call.caller_id else call.caller_id
    
    await manager.send_personal(other_user, {
        "type": ChatEvent.CALL_SIGNAL,
        "action": "call_ended",
        "call": call.dict()
    })
    
    del active_calls[call_id]
    
    logger.info(f"Call ended: {call_id}, duration: {call.duration_seconds}s")
    
    return {"call": call.dict()}


async def send_webrtc_signal(
    call_id: str,
    from_user: str,
    to_user: str,
    signal_type: str,  # "offer", "answer", "ice-candidate"
    signal_data: dict
) -> Dict[str, Any]:
    """Передать WebRTC сигнал"""
    await manager.send_personal(to_user, {
        "type": ChatEvent.CALL_SIGNAL,
        "action": "webrtc_signal",
        "call_id": call_id,
        "signal_type": signal_type,
        "signal_data": signal_data,
        "from_user": from_user
    })
    
    return {"sent": True}


# ============================================================================
# VOICE MESSAGES
# ============================================================================

def validate_voice_message(duration_seconds: int, file_size_bytes: int) -> Dict[str, Any]:
    """Валидация голосового сообщения"""
    MAX_DURATION = 300  # 5 минут
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    
    if duration_seconds > MAX_DURATION:
        return {"valid": False, "error": f"Максимальная длительность: {MAX_DURATION} секунд"}
    
    if file_size_bytes > MAX_SIZE:
        return {"valid": False, "error": f"Максимальный размер: {MAX_SIZE // (1024*1024)} MB"}
    
    return {"valid": True}


# ============================================================================
# PHOTO MESSAGES
# ============================================================================

def validate_photo_message(file_size_bytes: int, content_type: str) -> Dict[str, Any]:
    """Валидация фото сообщения"""
    MAX_SIZE = 20 * 1024 * 1024  # 20 MB
    ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    
    if content_type not in ALLOWED_TYPES:
        return {"valid": False, "error": f"Разрешены только: {ALLOWED_TYPES}"}
    
    if file_size_bytes > MAX_SIZE:
        return {"valid": False, "error": f"Максимальный размер: {MAX_SIZE // (1024*1024)} MB"}
    
    return {"valid": True}


# ============================================================================
# MESSAGE CREATION HELPERS
# ============================================================================

def create_text_message(match_id: str, sender_id: str, text: str, reply_to: str = None) -> ChatMessage:
    """Создать текстовое сообщение"""
    return ChatMessage(
        id=str(uuid.uuid4()),
        match_id=match_id,
        sender_id=sender_id,
        type=MessageType.TEXT,
        text=text,
        reply_to_id=reply_to,
        created_at=datetime.utcnow().isoformat()
    )


def create_photo_message(
    match_id: str, 
    sender_id: str, 
    media_url: str,
    thumbnail_url: str = None,
    caption: str = None
) -> ChatMessage:
    """Создать фото сообщение"""
    return ChatMessage(
        id=str(uuid.uuid4()),
        match_id=match_id,
        sender_id=sender_id,
        type=MessageType.PHOTO,
        text=caption,
        media_url=media_url,
        thumbnail_url=thumbnail_url,
        created_at=datetime.utcnow().isoformat()
    )


def create_voice_message(
    match_id: str,
    sender_id: str,
    media_url: str,
    duration: int
) -> ChatMessage:
    """Создать голосовое сообщение"""
    return ChatMessage(
        id=str(uuid.uuid4()),
        match_id=match_id,
        sender_id=sender_id,
        type=MessageType.VOICE,
        media_url=media_url,
        duration=duration,
        created_at=datetime.utcnow().isoformat()
    )


def create_gif_message(
    match_id: str,
    sender_id: str,
    gif_url: str,
    gif_id: str
) -> ChatMessage:
    """Создать GIF сообщение"""
    return ChatMessage(
        id=str(uuid.uuid4()),
        match_id=match_id,
        sender_id=sender_id,
        type=MessageType.GIF,
        media_url=gif_url,
        gif_id=gif_id,
        created_at=datetime.utcnow().isoformat()
    )


# ============================================================================
# ONLINE STATUS
# ============================================================================

def get_online_status(user_id: str) -> Dict[str, Any]:
    """Получить онлайн статус пользователя"""
    is_online = manager.is_online(user_id)
    last_seen = manager.get_last_seen(user_id)
    
    return {
        "user_id": user_id,
        "is_online": is_online,
        "last_seen": last_seen
    }


def format_last_seen(last_seen_iso: str) -> str:
    """Форматировать время последнего онлайна"""
    if not last_seen_iso:
        return "давно"
    
    last_seen = datetime.fromisoformat(last_seen_iso)
    now = datetime.utcnow()
    diff = now - last_seen
    
    if diff.total_seconds() < 60:
        return "только что"
    elif diff.total_seconds() < 3600:
        minutes = int(diff.total_seconds() / 60)
        return f"{minutes} мин. назад"
    elif diff.total_seconds() < 86400:
        hours = int(diff.total_seconds() / 3600)
        return f"{hours} ч. назад"
    elif diff.days < 7:
        return f"{diff.days} дн. назад"
    else:
        return last_seen.strftime("%d.%m.%Y")
