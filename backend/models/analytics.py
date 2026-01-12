from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

from sqlalchemy import String, Integer, Float, DateTime, JSON, Uuid, Date
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class DailyMetric(Base):
    """
    Aggregated daily metrics for dashboard.
    """
    __tablename__ = "daily_metrics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    date: Mapped[datetime] = mapped_column(Date, index=True)
    metric_name: Mapped[str] = mapped_column(String(100), index=True) 
    value: Mapped[float] = mapped_column(Float)
    dimensions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict) # e.g. {country: "US", platform: "ios"}
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class RetentionCohort(Base):
    """
    Retention cohort analysis data.
    """
    __tablename__ = "retention_cohorts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cohort_date: Mapped[datetime] = mapped_column(Date, index=True)
    cohort_size: Mapped[int] = mapped_column(Integer)
    retention_data: Mapped[Dict[str, float]] = mapped_column(JSON, default=dict) # {"D1": 0.5, "D7": 0.2 ...}
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AnalyticsEvent(Base):
    """
    Raw analytics events (optional, for detailed queries).
    """
    __tablename__ = "analytics_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_name: Mapped[str] = mapped_column(String(100), index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True, index=True)
    properties: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
