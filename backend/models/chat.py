# Chat ORM Model - SQLAlchemy модель сообщений чата

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, Uuid, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class Message(Base):
    """
    ORM модель сообщения чата.
    
    Таблица: messages
    
    Атрибуты:
        id: Уникальный идентификатор сообщения
        match_id: ID матча (диалога)
        sender_id: ID отправителя
        text: Текст сообщения
        type: Тип сообщения (text, audio, image)
        audio_url: URL аудио (если type=audio)
        duration: Длительность (аудио)
        created_at: Время отправки
    """
    __tablename__ = "messages"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    receiver_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )
    type: Mapped[str] = mapped_column(
        String(50),
        default="text",
        nullable=False,
    )
    audio_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    photo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    duration: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    def __repr__(self) -> str:
        return f"<Message {self.id} match={self.match_id}>"
