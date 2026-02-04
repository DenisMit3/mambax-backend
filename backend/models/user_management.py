from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

from sqlalchemy import String, Integer, DateTime, JSON, Uuid, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class FraudScore(Base):
    """
    Fraud detection scores for users.
    """
    __tablename__ = "fraud_scores"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    
    score: Mapped[float] = mapped_column(Float) # 0.0 to 100.0 (high risk)
    risk_level: Mapped[str] = mapped_column(String(20)) # low, medium, high, critical
    
    factors: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict) # e.g. {"ip_risk": 50, "device_risk": 20}
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class UserSegment(Base):
    """
    User segmentation for marketing and analytics.
    """
    __tablename__ = "user_segments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    segment_name: Mapped[str] = mapped_column(String(50)) # e.g. "whale", "churn_risk"
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class UserNote(Base):
    """
    Admin notes on users.
    """
    __tablename__ = "user_notes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False) # Admin who wrote the note
    
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=True)  # Internal admin note
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    @property
    def created_by(self):
        """Alias for author_id for compatibility"""
        return self.author_id

class VerificationRequest(Base):
    """
    Queue for manual identity verification.
    """
    __tablename__ = "verification_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    status: Mapped[str] = mapped_column(String(20), default="pending") # pending, approved, rejected, in_review
    priority: Mapped[int] = mapped_column(Integer, default=0)
    
    submitted_photos: Mapped[List[str]] = mapped_column(JSON, default=list)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # AI pre-check score
    
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
