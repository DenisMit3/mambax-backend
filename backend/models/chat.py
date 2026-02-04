# Chat ORM Model - SQLAlchemy модель сообщений чата

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, Uuid, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class Message(Base):
    """
    ORM модель сообщения чата.
    
    Таблица: messages
    """
    __tablename__ = "messages"
    __table_args__ = (
        # FIX: Composite index for chat pagination (ORDER BY created_at)
        Index("idx_messages_match_created", "match_id", "created_at"),
    )
    
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
