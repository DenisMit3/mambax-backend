"""
Real-Time Chat Service with Redis State
=======================================
"""

import os
import json
import uuid
import asyncio
import logging
import aiohttp
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel

from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)

class MessageType(str, Enum):
    TEXT = "text"
    PHOTO = "photo"
    VOICE = "voice"
    VIDEO = "video"
    GIF = "gif"
    STICKER = "sticker"
    SYSTEM = "system"

class MessageStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class ChatEvent(str, Enum):
    MESSAGE = "message"
    TYPING = "typing"
    READ = "read"
    DELIVERED = "delivered"
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"

# ============================================================================
# REDIS STATE MANAGEMENT
# ============================================================================
from backend.db.session import async_session_maker
from backend.crud import chat as crud_chat


class ChatStateManager:
    """Manages chat state in Redis (online, typing, unread)"""
    
    async def set_user_online(self, user_id: str):
        await redis_manager.set_value(f"user:online:{user_id}", "true", expire=300)
        
    async def set_user_offline(self, user_id: str):
        await redis_manager.delete(f"user:online:{user_id}")
        
    async def is_user_online(self, user_id: str) -> bool:
        return await redis_manager.get_value(f"user:online:{user_id}") == "true"

    async def set_typing(self, match_id: str, user_id: str, is_typing: bool):
        """Set/remove typing indicator using Redis Set for efficient retrieval"""
        key = f"typing:{match_id}"
        r = await redis_manager.get_redis()
        if not r:
            return
        try:
            if is_typing:
                await r.sadd(key, user_id)
                await r.expire(key, 10)  # Auto-expire in 10s
            else:
                await r.srem(key, user_id)
        except Exception as e:
            logger.warning(f"Typing status error: {e}")

    async def get_typing_users(self, match_id: str, exclude_user_id: str = None) -> List[str]:
        """Get list of users currently typing in a match"""
        key = f"typing:{match_id}"
        r = await redis_manager.get_redis()
        if not r:
            return []
        try:
            users = await r.smembers(key)
            if exclude_user_id:
                users = [u for u in users if u != exclude_user_id]
            return list(users)
        except Exception as e:
            logger.warning(f"Get typing users error: {e}")
            return []

    async def increment_unread(self, user_id: str, match_id: str):
        r = await redis_manager.get_redis()
        if r:
            await r.hincrby(f"unread:{user_id}", match_id, 1)

    async def clear_unread(self, user_id: str, match_id: str):
        r = await redis_manager.get_redis()
        if r:
            await r.hset(f"unread:{user_id}", match_id, 0)

    async def get_all_unread(self, user_id: str) -> Dict[str, int]:
        r = await redis_manager.get_redis()
        if not r:
            return {}
        data = await r.hgetall(f"unread:{user_id}")
        return {k: int(v) for k, v in data.items()}

state_manager = ChatStateManager()

# ============================================================================
# CONNECTION MANAGEMENT
# ============================================================================

class ConnectionManager:
    """
    Manages active WebSocket connections.
    
    TODO (SCALABILITY): Currently stores connections in-memory dict.
    For horizontal scaling (2+ servers), migrate to Redis Pub/Sub:
    - On message: publish to Redis channel
    - Each server: subscribe and forward to local connections
    """
    def __init__(self):
        self.active_connections: Dict[str, List] = {}
        self._offline_tasks: Dict[str, asyncio.Task] = {}  # FIX: Track pending offline tasks
    
    async def connect(self, websocket, user_id: str):
        await websocket.accept()
        
        # FIX: Cancel any pending offline task for this user (reconnect within grace period)
        if user_id in self._offline_tasks:
            self._offline_tasks[user_id].cancel()
            del self._offline_tasks[user_id]
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        await state_manager.set_user_online(user_id)
    
    def disconnect(self, websocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # FIX (UX): Set offline after 30s grace period (handles page reloads)
                self._schedule_offline(user_id)

    def _schedule_offline(self, user_id: str):
        """Schedule offline status after grace period"""
        async def set_offline_after_delay():
            try:
                await asyncio.sleep(30)  # 30 second grace period
                # Only set offline if user hasn't reconnected
                if user_id not in self.active_connections:
                    await state_manager.set_user_offline(user_id)
                    logger.info(f"User {user_id} marked offline after grace period")
            except asyncio.CancelledError:
                pass  # User reconnected, task cancelled
        
        # Cancel existing task if any
        if user_id in self._offline_tasks:
            self._offline_tasks[user_id].cancel()
        
        self._offline_tasks[user_id] = asyncio.create_task(set_offline_after_delay())

    async def send_personal(self, user_id: str, message: dict):
        connections = self.active_connections.get(user_id, [])
        for ws in connections:
            try:
                await ws.send_json(message)
            except:
                pass

    async def send_to_match(self, match_id: str, sender_id: str, recipient_id: str, message: dict):
        await self.send_personal(recipient_id, message)
        await self.send_personal(sender_id, {**message, "confirmed": True})

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections

manager = ConnectionManager()

# ============================================================================
# HELPER FUNCTIONS (Module-level exports)
# ============================================================================

async def set_typing(match_id: str, user_id: str, is_typing: bool):
    await state_manager.set_typing(match_id, user_id, is_typing)

async def get_typing_users(match_id: str, exclude_user_id: str = None) -> List[str]:
    """FIX: Proper async implementation for typing users"""
    return await state_manager.get_typing_users(match_id, exclude_user_id)

async def mark_as_read(match_id: str, user_id: str, message_ids: List[str] = None):
    await state_manager.clear_unread(user_id, match_id)
    
    updated_ids = []
    async with async_session_maker() as db:
        reader_uuid = uuid.UUID(user_id)
        
        if message_ids:
            msg_uuids = [uuid.UUID(mid) for mid in message_ids]
            count = await crud_chat.mark_messages_as_read(db, msg_uuids, reader_uuid)
            if count > 0:
                updated_ids = message_ids
        else:
            # Mark all unread in match as read
            from sqlalchemy import select
            from backend.models.chat import Message
            
            stmt = select(Message.id).where(
                Message.match_id == uuid.UUID(match_id),
                Message.receiver_id == reader_uuid,
                Message.is_read == False
            )
            result = await db.execute(stmt)
            unread_ids = [str(row) for row in result.scalars().all()]
            
            if unread_ids:
                msg_uuids = [uuid.UUID(mid) for mid in unread_ids]
                count = await crud_chat.mark_messages_as_read(db, msg_uuids, reader_uuid)
                if count > 0:
                    updated_ids = unread_ids

    return {"status": "ok", "updated_ids": updated_ids}

async def add_reaction(message_id: str, user_id: str, emoji: str) -> dict:
    """Add reaction to a message"""
    # Store in Redis or DB in full impl
    return {"type": "reaction", "message_id": message_id, "user_id": user_id, "emoji": emoji, "action": "add"}

async def remove_reaction(message_id: str, user_id: str) -> dict:
    """Remove reaction from a message"""
    return {"type": "reaction", "message_id": message_id, "user_id": user_id, "action": "remove"}

async def search_gifs(query: str, limit: int = 20, offset: int = 0) -> dict:
    """Search GIFs via Giphy/Tenor API"""
    # Placeholder - integrate with Giphy in prod
    return {"gifs": [], "query": query}

async def get_trending_gifs(limit: int = 20) -> dict:
    """Get trending GIFs"""
    return {"gifs": []}

# ============================================================================
# CALL MANAGEMENT (Placeholders)
# ============================================================================

class CallInfo(BaseModel):
    id: str
    match_id: str
    caller_id: str
    callee_id: str
    call_type: str
    status: str = "pending"
    started_at: Optional[datetime] = None

async def initiate_call(match_id: str, caller_id: str, callee_id: str, call_type: str = "video") -> CallInfo:
    """Initiate a call"""
    call = CallInfo(
        id=str(uuid.uuid4()),
        match_id=match_id,
        caller_id=caller_id,
        callee_id=callee_id,
        call_type=call_type
    )
    # Notify callee via WS
    await manager.send_personal(callee_id, {
        "type": "incoming_call",
        "call_id": call.id,
        "caller_id": caller_id,
        "call_type": call_type,
        "match_id": match_id
    })
    return call

async def answer_call(call_id: str, user_id: str, accept: bool) -> dict:
    """Answer or reject a call"""
    return {"call_id": call_id, "accepted": accept, "status": "answered" if accept else "rejected"}

async def end_call(call_id: str, user_id: str) -> dict:
    """End an active call"""
    return {"call_id": call_id, "status": "ended"}

async def send_webrtc_signal(call_id: str, from_user: str, to_user: str, signal_type: str, signal_data: dict) -> dict:
    """Relay WebRTC signaling data"""
    await manager.send_personal(to_user, {
        "type": signal_type,
        "call_id": call_id,
        "from_user": from_user,
        "signal_data": signal_data
    })
    return {"status": "sent"}

# ============================================================================
# EPHEMERAL MESSAGES (Disappearing)
# ============================================================================

class EphemeralMessage(BaseModel):
    id: str
    match_id: str
    sender_id: str
    text: Optional[str] = None
    media_url: Optional[str] = None
    expires_in: int = 10
    created_at: datetime = datetime.utcnow()

async def create_ephemeral_message(match_id: str, sender_id: str, text: str = None, media_url: str = None, seconds: int = 10) -> EphemeralMessage:
    """Create a disappearing message"""
    msg = EphemeralMessage(
        id=str(uuid.uuid4()),
        match_id=match_id,
        sender_id=sender_id,
        text=text,
        media_url=media_url,
        expires_in=seconds
    )
    return msg

async def mark_ephemeral_viewed(message_id: str) -> dict:
    """Mark ephemeral message as viewed (starts countdown)"""
    return {"message_id": message_id, "status": "viewed"}

# ============================================================================
# UNREAD & ONLINE STATUS
# ============================================================================

def get_unread_count(user_id: str, match_id: str = None) -> dict:
    """Get unread message count - sync wrapper"""
    return {"total": 0, "by_match": {}}

def increment_unread(user_id: str, match_id: str):
    """Sync wrapper to increment unread - fire and forget in async context"""
    # In prod, use asyncio.create_task
    pass

def get_online_status(user_id: str) -> dict:
    """Get user online status"""
    is_online = manager.is_online(user_id)
    return {"user_id": user_id, "is_online": is_online, "last_seen": None}

def format_last_seen(last_seen: datetime) -> str:
    """Format last seen time for display"""
    if not last_seen:
        return "Unknown"
    now = datetime.utcnow()
    delta = now - last_seen
    if delta.seconds < 60:
        return "Just now"
    elif delta.seconds < 3600:
        return f"{delta.seconds // 60} min ago"
    elif delta.days == 0:
        return f"{delta.seconds // 3600} hours ago"
    else:
        return last_seen.strftime("%b %d")

# ============================================================================
# MESSAGE CREATION HELPERS
# ============================================================================

async def create_text_message(match_id: str, sender_id: str, text: str) -> dict:
    """Create a text message"""
    return {"type": "text", "match_id": match_id, "sender_id": sender_id, "text": text}

async def create_photo_message(match_id: str, sender_id: str, photo_url: str) -> dict:
    """Create a photo message"""
    return {"type": "photo", "match_id": match_id, "sender_id": sender_id, "photo_url": photo_url}

async def create_voice_message(match_id: str, sender_id: str, audio_url: str, duration: int) -> dict:
    """Create a voice message"""
    return {"type": "voice", "match_id": match_id, "sender_id": sender_id, "audio_url": audio_url, "duration": duration}

# ============================================================================
# CONSTANTS
# ============================================================================

AVAILABLE_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "💯", "🎉"]

