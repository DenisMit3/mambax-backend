"""
Chat - Enums & Pydantic models
"""

from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


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


class CallInfo(BaseModel):
    id: str
    match_id: str
    caller_id: str
    callee_id: str
    call_type: str
    status: str = "pending"
    started_at: Optional[datetime] = None


class EphemeralMessage(BaseModel):
    id: str
    match_id: str
    sender_id: str
    text: Optional[str] = None
    media_url: Optional[str] = None
    expires_in: int = 10
    created_at: datetime = Field(default_factory=datetime.utcnow)


AVAILABLE_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🔥", "💯", "🎉"]
