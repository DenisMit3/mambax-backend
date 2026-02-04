
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, ForeignKey, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class ModerationLog(Base):
    """
    Log of automated moderation checks.
    """
    __tablename__ = "moderation_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=True) # Optional link to Message or other entity
    content_type: Mapped[str] = mapped_column(String(20)) # text, image, bio
    
    result: Mapped[str] = mapped_column(String(20)) # safe, flagged, unsure
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    details: Mapped[str] = mapped_column(Text, nullable=True) # JSON or text summary of what triggered the flag
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class BannedUser(Base):
    """
    Table for managing bans and shadow bans.
    """
    __tablename__ = "banned_users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    
    reason: Mapped[str] = mapped_column(String(255))
    ban_type: Mapped[str] = mapped_column(String(20), default="hard_ban") # hard_ban, shadow_ban
    
    banned_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True) # Admin ID
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True) # Null = permanent
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ModerationQueueItem(Base):
    """
    Items requiring manual moderation.
    """
    __tablename__ = "moderation_queue"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    
    content_type: Mapped[str] = mapped_column(String(50)) # photo, bio, chat_message
    content_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    content_snapshot: Mapped[str] = mapped_column(Text) # The text or URL to moderate
    
    ai_score: Mapped[float] = mapped_column(Float, default=0.0)
    priority: Mapped[int] = mapped_column(Integer, default=0) # 0-10, higher is more urgent
    
    status: Mapped[str] = mapped_column(String(20), default="pending") # pending, approved, rejected
    locked_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True) # Admin ID
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class NSFWDetection(Base):
    """
    Detailed results from NSFW AI models.
    """
    __tablename__ = "nsfw_detections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    image_url: Mapped[str] = mapped_column(String(500))
    source_type: Mapped[str] = mapped_column(String(50)) # profile_photo, chat_image
    
    scores: Mapped[dict] = mapped_column(JSON, default=dict) # {porn: 0.9, hentai: 0.1, neutral: 0.0}
    top_label: Mapped[str] = mapped_column(String(50))
    
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Appeal(Base):
    """
    User appeals against moderation actions.
    """
    __tablename__ = "appeals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    ban_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("banned_users.id"), nullable=True)
    
    reason: Mapped[str] = mapped_column(Text) # User's explanation
    status: Mapped[str] = mapped_column(String(20), default="pending") # pending, approved, rejected
    
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

