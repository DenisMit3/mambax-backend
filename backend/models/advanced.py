import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, JSON, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class AlgorithmSettings(Base):
    """
    Stores versioned settings for the matching algorithm.
    """
    __tablename__ = "algorithm_settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    version: Mapped[str] = mapped_column(String(50))
    # Weights stored as JSON to allow flexibility
    weights: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict)
    # Experimental flags
    experimental_flags: Mapped[Dict[str, bool]] = mapped_column(JSON, default=dict)
    
    updated_by: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Icebreaker(Base):
    """
    Icebreaker conversation starters.
    """
    __tablename__ = "icebreakers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), index=True)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(50), default="system") # system, admin, ai
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DatingEvent(Base):
    """
    Virtual or IRL dating events.
    """
    __tablename__ = "dating_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50)) # speed_dating, mixer, etc
    status: Mapped[str] = mapped_column(String(20), default="upcoming") # upcoming, active, completed, cancelled
    
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    max_participants: Mapped[int] = mapped_column(Integer, default=100)
    current_participants: Mapped[int] = mapped_column(Integer, default=0)
    
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    host_name: Mapped[str] = mapped_column(String(100), default="MambaX")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Partner(Base):
    """
    Affiliate partners or white-label tenants.
    """
    __tablename__ = "partners"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    domain: Mapped[str] = mapped_column(String(100), nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), default="active") # active, pending, inactive
    revenue_share_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Simple stats storage (could be computed, but cached here for simplicity)
    users_count: Mapped[int] = mapped_column(Integer, default=0)


class CustomReport(Base):
    """
    Saved definitions for custom reports.
    """
    __tablename__ = "custom_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    report_type: Mapped[str] = mapped_column(String(50)) # user_analytics, financial, etc
    schedule: Mapped[str] = mapped_column(String(50), nullable=True) # e.g. "weekly", "0 0 * * 1"
    
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Store custom SQL, list of columns, or filter parameters
    configuration: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

class AIUsageLog(Base):
    """
    Log of AI usage for analytics.
    """
    __tablename__ = "ai_usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    feature: Mapped[str] = mapped_column(String(50)) # bio, icebreaker, etc.
    model: Mapped[str] = mapped_column(String(50))
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)


class WebVitalLog(Base):
    """
    Stores Core Web Vitals and other performance metrics from frontend.
    """
    __tablename__ = "web_vital_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True) # Linked to User if logged in
    path: Mapped[str] = mapped_column(String(255), index=True) # Page URL path
    metric_name: Mapped[str] = mapped_column(String(50)) # LCP, CLS, FID, INP, TTFB
    value: Mapped[float] = mapped_column(Float) # The numeric value
    rating: Mapped[str] = mapped_column(String(20), nullable=True) # good, needs-improvement, poor
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # For device segmentation
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TranslationKey(Base):
    """
    Master list of translation keys available in the frontend.
    """
    __tablename__ = "translation_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(255), unique=True, index=True) # e.g. "common.greeting"
    context: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Description for translators
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TranslationValue(Base):
    """
    Actual translated text for a given key and language.
    """
    __tablename__ = "translation_values"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    key_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("translation_keys.id", ondelete="CASCADE"))
    language_code: Mapped[str] = mapped_column(String(10), index=True) # en, ru, es
    value: Mapped[str] = mapped_column(Text)
    
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WalletConnection(Base):
    """
    Records of Web3 wallet connections.
    """
    __tablename__ = "wallet_connections"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    wallet_address: Mapped[str] = mapped_column(String(255), nullable=False)
    chain: Mapped[str] = mapped_column(String(50), default="ethereum")
    provider: Mapped[str] = mapped_column(String(50), default="unknown") # metamask, walletconnect, etc
    
    connected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SystemStat(Base):
    """
    Daily aggregated stats for quick dashboard loading.
    """
    __tablename__ = "system_stats"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
    metric_type: Mapped[str] = mapped_column(String(50)) # active_users, new_matches, total_revenue
    value: Mapped[float] = mapped_column(Float)
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CallSession(Base):
    """
    Log of voice/video calls.
    """
    __tablename__ = "call_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    initiator_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    receiver_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    status: Mapped[str] = mapped_column(String(20), default="completed") # completed, missed, failed
    call_type: Mapped[str] = mapped_column(String(10), default="video") # video, audio


class AccessibilityReport(Base):
    """
    Stored results of automated accessibility audits.
    """
    __tablename__ = "accessibility_reports"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    overall_score: Mapped[int] = mapped_column(Integer)
    wcag_level: Mapped[str] = mapped_column(String(10), default="AA")
    
    # Structure: {"critical": 0, "serious": 1, "top_issues": [...]}
    issues: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecommendationMetric(Base):
    """
    Performance metrics for the recommendation engine models.
    """
    __tablename__ = "recommendation_metrics"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    model_version: Mapped[str] = mapped_column(String(50))
    
    precision: Mapped[float] = mapped_column(Float)
    recall: Mapped[float] = mapped_column(Float)
    ndcg: Mapped[float] = mapped_column(Float)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

