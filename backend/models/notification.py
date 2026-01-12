
import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    endpoint: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    p256dh: Mapped[str] = mapped_column(String, nullable=False)
    auth: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, default=lambda: datetime.utcnow().isoformat())
