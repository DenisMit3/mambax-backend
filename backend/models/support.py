# Admin & Support models for dating platform

import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import String, Integer, Boolean, Text, DateTime, JSON, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class SupportTicket(Base):
    """User support tickets."""
    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general")  # general, billing, technical, safety, account
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # low, normal, high, urgent
    status: Mapped[str] = mapped_column(String(20), default="open")  # open, in_progress, waiting, resolved, closed
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SupportMessage(Base):
    """Messages within support tickets."""
    __tablename__ = "support_messages"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    sender_type: Mapped[str] = mapped_column(String(20), default="user")  # user, admin, system
    body: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FeedbackSurvey(Base):
    """In-app feedback surveys and NPS scores."""
    __tablename__ = "feedback_surveys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    survey_type: Mapped[str] = mapped_column(String(30), nullable=False)  # nps, csat, feature_request, bug_report
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-10 for NPS
    feedback_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    context: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # page, action, etc.
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AdminActionLog(Base):
    """Detailed admin panel action logging."""
    __tablename__ = "admin_action_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # user, report, ticket, config
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
