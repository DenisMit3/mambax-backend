# Safety & Trust models for dating platform

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, JSON, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class UserVerificationSelfie(Base):
    """Selfie verification attempts with AI face matching."""
    __tablename__ = "user_verification_selfies"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    selfie_url: Mapped[str] = mapped_column(String(500), nullable=False)
    reference_photo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, approved, rejected
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SafetyReport(Base):
    """Emergency safety reports from users during dates."""
    __tablename__ = "safety_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)  # harassment, threat, catfish, underage
    severity: Mapped[str] = mapped_column(String(20), default="medium")  # low, medium, high, critical
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_urls: Mapped[List[str]] = mapped_column(JSON, default=list)
    location_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open, investigating, resolved, escalated
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class TrustScore(Base):
    """Composite trust score for each user based on behavior signals."""
    __tablename__ = "trust_scores"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    overall_score: Mapped[float] = mapped_column(Float, default=50.0)  # 0-100
    verification_score: Mapped[float] = mapped_column(Float, default=0.0)
    behavior_score: Mapped[float] = mapped_column(Float, default=50.0)
    report_score: Mapped[float] = mapped_column(Float, default=100.0)  # decreases with reports
    response_rate_score: Mapped[float] = mapped_column(Float, default=50.0)
    factors: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IPBlacklist(Base):
    """Blacklisted IP addresses for fraud prevention."""
    __tablename__ = "ip_blacklist"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, unique=True, index=True)
    reason: Mapped[str] = mapped_column(String(200), nullable=False)
    blocked_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DeviceFingerprint(Base):
    """Device fingerprints for multi-account detection."""
    __tablename__ = "device_fingerprints"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=True)  # mobile, desktop, tablet
    os: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    browser: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    screen_resolution: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_suspicious: Mapped[bool] = mapped_column(Boolean, default=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LoginHistory(Base):
    """User login history for security auditing."""
    __tablename__ = "login_history"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_fingerprint: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    login_method: Mapped[str] = mapped_column(String(30), default="telegram")  # telegram, email, phone
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
