from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

from sqlalchemy import String, Integer, Float, DateTime, JSON, Uuid, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class MarketingCampaign(Base):
    """
    Marketing campaign definitions.
    """
    __tablename__ = "marketing_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50)) # email, push, in-app
    status: Mapped[str] = mapped_column(String(20), default="draft") # draft, scheduled, running, completed
    
    start_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    target_segment: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    budget: Mapped[float] = mapped_column(Float, default=0.0)
    spent: Mapped[float] = mapped_column(Float, default=0.0)
    
    stats: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict) # sent, opened, clicked, converted
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)

class PushCampaign(Base):
    """
    Specifics for Push Notification campaigns.
    """
    __tablename__ = "push_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("marketing_campaigns.id"))
    
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    action_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)

class EmailCampaign(Base):
    """
    Specifics for Email campaigns.
    """
    __tablename__ = "email_campaigns"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("marketing_campaigns.id"))
    
    subject: Mapped[str] = mapped_column(String(255))
    template_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    html_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    open_count: Mapped[int] = mapped_column(Integer, default=0)
