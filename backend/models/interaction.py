# Interaction ORM Models - SQLAlchemy таблицы swipes и matches

import uuid
from datetime import datetime

from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Uuid, JSON, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class Swipe(Base):
    """
    ORM модель свайпа (лайк/дизлайк/суперлайк).
    
    Таблица: swipes
    
    Атрибуты:
        id: Уникальный идентификатор
        from_user_id: ID пользователя, который свайпнул
        to_user_id: ID пользователя, которого свайпнули
        action: Тип действия (like/dislike/superlike)
        timestamp: Время свайпа
    """
    __tablename__ = "swipes"
    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id", name="uq_swipe_from_to"),
        # FIX: Composite index for get_likes_received query
        Index("idx_swipes_to_action", "to_user_id", "action"),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    def __repr__(self) -> str:
        return f"<Swipe {self.from_user_id} -> {self.to_user_id}: {self.action}>"


class Match(Base):
    """
    ORM модель матча (взаимный лайк).
    """
    __tablename__ = "matches"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    user1_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user2_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships for N+1 optimization
    user1 = relationship("User", foreign_keys=[user1_id], lazy="selectin")
    user2 = relationship("User", foreign_keys=[user2_id], lazy="selectin")
    
    def __repr__(self) -> str:
        return f"<Match {self.user1_id} <-> {self.user2_id}>"


class Block(Base):
    """
    ORM модель блокировки пользователя.
    
    Таблица: blocks
    """
    __tablename__ = "blocks"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    blocker_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self) -> str:
        return f"<Block {self.blocker_id} -> {self.blocked_id}>"


class Report(Base):
    """
    ORM модель жалобы на пользователя.
    
    Таблица: reports
    """
    __tablename__ = "reports"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=True)
    evidence_urls: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False) # pending, resolved, dismissed
    
    admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self) -> str:
        return f"<Report {self.reporter_id} -> {self.reported_id}: {self.reason}>"


class Like(Base):
    """
    ORM модель лайка (Legacy/Compatibility).
    
    Таблица: likes
    """
    __tablename__ = "likes"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    liker_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    liked_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    is_super: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self) -> str:
        return f"<Like {self.liker_id} -> {self.liked_id}>"
