
import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, Uuid, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    endpoint: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    p256dh: Mapped[str] = mapped_column(String, nullable=False)
    auth: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
