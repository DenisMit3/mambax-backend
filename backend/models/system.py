from datetime import datetime
from typing import Optional, Dict, Any
import uuid

from sqlalchemy import String, Integer, DateTime, JSON, Uuid, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base

class AuditLog(Base):
    """
    Admin action audit logs.
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False) # User ID of admin
    action: Mapped[str] = mapped_column(String(100)) # e.g. "update_user"
    target_resource: Mapped[str] = mapped_column(String(100)) # e.g. "user:123"
    
    changes: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict) # diff of changes
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

class FeatureFlag(Base):
    """
    System feature flags.
    """
    __tablename__ = "feature_flags"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    rollout_percentage: Mapped[int] = mapped_column(Integer, default=0) # 0-100
    
    whitelist_users: Mapped[Dict[str, Any]] = mapped_column(JSON, default=list) # List of user IDs
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

class SecurityAlert(Base):
    """
    Security incidents and alerts.
    """
    __tablename__ = "security_alerts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    severity: Mapped[str] = mapped_column(String(20)) # low, medium, high, critical
    type: Mapped[str] = mapped_column(String(50)) # failed_login, brute_force, etc
    
    description: Mapped[str] = mapped_column(Text)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class BackupStatus(Base):
    """
    Database backup logs.
    """
    __tablename__ = "backup_status"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(20)) # pending, in_progress, completed, failed
    backup_type: Mapped[str] = mapped_column(String(20), default="full")  # full, incremental, schema_only
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    file_size: Mapped[int] = mapped_column(Integer, default=0)  # Alias for compatibility
    location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # S3 path
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SHA-256
    
    triggered_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)  # Admin who triggered
    
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class AutoBanRule(Base):
    """
    Automated ban rules configuration.
    When conditions are met, users are automatically banned/suspended.
    """
    __tablename__ = "auto_ban_rules"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Rule trigger type
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # reports_count, fraud_score, spam_messages, inactive_days, multiple_accounts
    
    # Condition
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g. 5 reports
    time_window_hours: Mapped[int] = mapped_column(Integer, default=24)  # within X hours
    
    # Action
    action: Mapped[str] = mapped_column(String(30), default="suspend")  # suspend, ban, warn
    action_duration_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # null = permanent
    
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)  # Higher = checked first
    
    # Stats
    times_triggered: Mapped[int] = mapped_column(Integer, default=0)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

