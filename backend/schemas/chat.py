# Chat schemas - Pydantic схемы для сообщений чата

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """Схема создания сообщения (отправка через WebSocket)"""
    receiver_id: UUID
    content: str = Field(..., min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    """Схема ответа с сообщением"""
    id: UUID
    match_id: UUID
    sender_id: UUID
    receiver_id: UUID
    content: Optional[str] = None
    created_at: datetime = Field(..., serialization_alias="timestamp")
    is_read: bool
    
    class Config:
        from_attributes = True


class MessageIncoming(BaseModel):
    """Входящее сообщение через WebSocket"""
    type: str = "message"  # message, typing, read
    receiver_id: UUID
    content: Optional[str] = None
    message_id: Optional[UUID] = None  # Для отметки прочитанным


class MessageOutgoing(BaseModel):
    """Исходящее сообщение через WebSocket"""
    type: str = "message"
    message_id: UUID
    match_id: Optional[UUID] = None
    sender_id: UUID
    content: str
    timestamp: datetime


class TypingNotification(BaseModel):
    """Уведомление о наборе текста"""
    type: str = "typing"
    user_id: UUID
    is_typing: bool


class ReadReceipt(BaseModel):
    """Уведомление о прочтении"""
    type: str = "read"
    message_id: UUID
    reader_id: UUID
