# Interaction ORM Models - SQLAlchemy таблицы swipes и matches

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


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
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
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
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user1_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user2_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
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
