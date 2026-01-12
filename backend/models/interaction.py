# Interaction ORM Models - SQLAlchemy таблицы swipes и matches

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Uuid
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
    
    Таблица: matches
    
    Атрибуты:
        id: Уникальный идентификатор
        user1_id: ID первого пользователя
        user2_id: ID второго пользователя
        created_at: Время создания матча
        is_active: Активен ли матч (False если кто-то отменил)
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
    status: Mapped[str] = mapped_column(String, default="pending", nullable=False) # pending, resolved, dismissed
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
