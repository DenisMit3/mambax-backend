"""
System Operations & Monitoring API Routes
Real implementation using DB and System stats.
"""

import time
import platform
import os
import shutil
from datetime import datetime
from typing import List, Optional
import logging

try:
    import psutil
except ImportError:
    psutil = None

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from enum import Enum

from backend.database import get_db, async_session_maker
from backend.auth import get_current_user_from_token, get_current_admin
from backend.models.user import User
from backend.models.interaction import Match, Swipe
from backend.models.system import AuditLog, FeatureFlag, SecurityAlert, BackupStatus
from backend.services.chat import manager as chat_manager
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/system", tags=["system"])

START_TIME = time.time()

# ============================================
# SCHEMAS
# ============================================

class FeatureFlagUpdate(BaseModel):
    enabled: bool

class AlertSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

# ============================================
# SYSTEM HEALTH & METRICS
# ============================================

@router.get("/metrics")
async def get_metrics():
    """Prometheus metrics stub (Real implementation requires prometheus_client middleware)"""
    return {"status": "available", "info": "Enable prometheus_client middleware for full metrics"}

@router.get("/health")
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get comprehensive system health metrics (REAL)"""
    
    # 1. System Stats
    cpu_usage = psutil.cpu_percent() if psutil else 0
    memory = psutil.virtual_memory() if psutil else None
    disk = shutil.disk_usage("/" if os.name != "nt" else "C:\\")
    
    uptime_seconds = int(time.time() - START_TIME)
    
    # 2. DB Health
    db_status = "unknown"
    db_latency = 0
    try:
        t0 = time.time()
        await db.execute(text("SELECT 1"))
        db_latency = int((time.time() - t0) * 1000)
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # 3. Service Stats
    total_users = await db.scalar(select(func.count(User.id)))
    active_matches = await db.scalar(select(func.count(Match.id)))
    
    ws_connections = len(chat_manager.active_connections)
    
    return {
        "overall_status": "healthy" if db_status == "healthy" else "degraded",
        "uptime_seconds": uptime_seconds,
        "system": {
            "platform": platform.system(),
            "cpu_usage_percent": cpu_usage,
            "memory_usage_percent": memory.percent if memory else 0,
            "disk_usage_percent": int((disk.used / disk.total) * 100)
        },
        "services": [
            {
                "name": "Database",
                "status": db_status,
                "response_time_ms": db_latency
            },
            {
                "name": "WebSocket Server",
                "status": "healthy",
                "active_connections": ws_connections
            },
            {
                "name": "File Storage",
                "status": "healthy", # Assuming local FS is OK if app runs
                "free_space_gb": round(disk.free / (1024**3), 2)
            }
        ],
        "metrics": {
            "total_users": total_users,
            "active_matches": active_matches,
            "active_ws_users": ws_connections
        }
    }

@router.get("/health/database")
async def get_database_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get database performance metrics (Dialect Agnostic)"""
    try:
        # Detect database type
        db_type = db.bind.dialect.name if db.bind else "unknown"
        
        version = "Unknown"
        if db_type == 'postgresql':
            version_res = await db.execute(text("SHOW server_version"))
            version = version_res.scalar()
        elif db_type == 'sqlite':
            version_res = await db.execute(text("SELECT sqlite_version()"))
            version = version_res.scalar()
        
        return {
            "status": "healthy",
            "version": version,
            "type": db_type.title(),
            "connection_pool": "Managed by SQLAlchemy (AsyncEngine)"
        }
    except Exception as e:
         return {
            "status": "error",
            "error": str(e)
        }


@router.get("/logs")
async def get_system_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_admin)
):
    """
    Get recent system logs.
    In a real system, this would read from a log file or a logging service (ELK/Sentry).
    """
    log_file = "app.log"
    logs = []
    
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                # Read last N lines
                lines = f.readlines()
                logs = lines[-limit:]
        except Exception as e:
            logs = [f"Error reading log file: {e}"]
    else:
        logs = ["Log file not found. Ensure logging is configured to write to app.log"]
        
    return {
        "logs": logs,
        "count": len(logs),
        "file": log_file
    }

@router.get("/health/api-stats")
async def get_api_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    API Usage Stats.
    (Real stats require middleware logging to DB/Redis. Returning placeholders for now but dynamic)
    """
    # Returning active session counts as proxy
    return {
        "note": "Detailed API request logging not enabled.",
        "active_users_now": len(chat_manager.active_connections)
    }

@router.get("/health/cdn")
async def get_cdn_stats():
    """Get CDN usage statistics"""
    # No CDN integration configured
    return {
        "status": "not_configured", 
        "provider": None
    }

@router.get("/health/errors")
async def get_error_tracking():
    """Get Error Tracking"""
    # No Sentry integration configured in this demo
    return {
        "status": "not_configured",
        "provider": "Sentry (Mock)"
    }



# ============================================
# AUDIT LOGS
# ============================================

@router.get("/audit-logs")
async def get_audit_logs(
    page: int = 1,
    page_size: int = 50,
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get audit logs with filtering (REAL)"""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    
    if admin_id:
        stmt = stmt.where(AuditLog.admin_id == admin_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
        
    # Pagination
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    # Total count (simplified, optimal would be separate count query)
    # returning page size count for now to save query time or 1000+
    total = len(logs) # Placeholder for full count query if needed
    
    return {
        "logs": logs,
        "page": page,
        "page_size": page_size,
        "total": total # Approximate or pagination specific
    }

@router.get("/audit-logs/summary")
async def get_audit_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get audit log summary (REAL)"""
    # Group by action
    actions = await db.execute(select(AuditLog.action, func.count(AuditLog.id)).group_by(AuditLog.action))
    by_action = [{"action": row[0], "count": row[1]} for row in actions.all()]
    
    return {
        "total_actions": sum(item["count"] for item in by_action),
        "by_action": by_action
    }

# ============================================
# SECURITY ALERTS
# ============================================

@router.get("/security/alerts")
async def get_security_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get security alerts (REAL)"""
    stmt = select(SecurityAlert).order_by(SecurityAlert.created_at.desc())
    
    if severity:
        stmt = stmt.where(SecurityAlert.severity == severity)
    # Status handling (simplified)
    if status == "active":
        stmt = stmt.where(SecurityAlert.is_resolved == False)
    elif status == "resolved":
        stmt = stmt.where(SecurityAlert.is_resolved == True)
        
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    
    return {
        "alerts": alerts,
        "count": len(alerts)
    }

@router.post("/security/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolution: str = Query(..., description="Resolution notes"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Resolve a security alert (REAL)"""
    alert = await db.get(SecurityAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_resolved = True
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = current_user.id
    alert.details["resolution"] = resolution
    
    await db.commit()
    return {"status": "success", "message": "Alert resolved"}

# ============================================
# RBAC & TEAM
# ============================================

@router.get("/team/members")
async def get_team_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get admin team members (REAL)"""
    # Assuming roles are stored in user table or metadata
    stmt = select(User).where(User.role.in_(["admin", "moderator"]))
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return {
        "members": [
            {
                "id": str(u.id),
                "name": u.name or u.email,
                "role": u.role,
                "created_at": u.created_at
            } for u in users
        ]
    }

@router.get("/team/activity")
async def get_team_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get team member activity (REAL)"""
    # Count audit logs by admin
    stmt = select(AuditLog.admin_id, func.count(AuditLog.id)).group_by(AuditLog.admin_id)
    result = await db.execute(stmt)
    
    activity = []
    for row in result.all():
        # Ideally fetch name too
        activity.append({"admin_id": str(row[0]), "actions": row[1]})
        
    return {"activity": activity}

# ============================================
# BACKUP & RECOVERY
# ============================================

@router.get("/backups")
async def get_backup_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get backup status (REAL)"""
    stmt = select(BackupStatus).order_by(BackupStatus.started_at.desc()).limit(10)
    result = await db.execute(stmt)
    backups = result.scalars().all()
    
    return {"backups": backups}

@router.post("/backups/trigger")
async def trigger_backup(
    backup_type: str = Query("full"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Trigger a real database backup (pg_dump → S3)"""
    from backend.services.backup import trigger_backup as run_backup
    import asyncio
    
    # Run backup in background to avoid timeout
    async def run_backup_task():
        async with async_session_maker() as session:
            return await run_backup(
                db=session,
                backup_type=backup_type,
                admin_id=current_user.id
            )
    
    # Create initial record
    backup_id = uuid.uuid4()
    backup = BackupStatus(
        id=backup_id,
        status="in_progress",
        backup_type=backup_type,
        started_at=datetime.utcnow(),
        triggered_by=current_user.id
    )
    db.add(backup)
    await db.commit()
    
    # Start backup task (non-blocking)
    asyncio.create_task(run_backup_task())
    
    return {
        "status": "initiated",
        "backup_id": str(backup_id),
        "message": "Backup started. Check /backups for status."
    }

# ============================================
# FEATURE FLAGS
# ============================================

@router.get("/feature-flags")
async def get_feature_flags(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get feature flags (REAL)"""
    stmt = select(FeatureFlag)
    result = await db.execute(stmt)
    flags = result.scalars().all()
    
    return {
        "flags": [
            {
                "id": str(f.key), # Using key as ID for frontend
                "name": f.key.replace("-", " ").title(),
                "description": f.description,
                "enabled": f.is_enabled,
                "rollout_percentage": f.rollout_percentage,
                "created_at": f.updated_at, # simplified
                "updated_at": f.updated_at,
                "updated_by": f.updated_by
            } for f in flags
        ]
    }

@router.put("/feature-flags/{flag_key}")
async def update_feature_flag(
    flag_key: str,
    update: FeatureFlagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a feature flag (REAL)"""
    stmt = select(FeatureFlag).where(FeatureFlag.key == flag_key)
    result = await db.execute(stmt)
    flag = result.scalars().first()
    
    if not flag:
        # Auto-create if missing (dev convenience)
        flag = FeatureFlag(key=flag_key, is_enabled=update.enabled)
        db.add(flag)
    else:
        flag.is_enabled = update.enabled
        flag.updated_at = datetime.utcnow()
        flag.updated_by = current_user.email
        
    await db.commit()
    
    return {
        "status": "success",
        "flag_id": flag_key,
        "enabled": flag.is_enabled,
        "updated_at": datetime.utcnow().isoformat()
    }

@router.put("/feature-flags/{flag_key}/rollout")
async def update_flag_rollout(
    flag_key: str,
    percentage: int = Query(..., ge=0, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update feature flag rollout percentage (REAL)"""
    stmt = select(FeatureFlag).where(FeatureFlag.key == flag_key)
    result = await db.execute(stmt)
    flag = result.scalars().first()
    
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
        
    flag.rollout_percentage = percentage
    flag.updated_at = datetime.utcnow()
    flag.updated_by = current_user.email
    await db.commit()
    
    return {
        "status": "success",
        "flag_id": flag_key,
        "rollout_percentage": percentage,
        "updated_at": datetime.utcnow().isoformat()
    }

# ============================================
# CONFIG
# ============================================

@router.get("/config")
async def get_system_config(
    current_user: User = Depends(get_current_admin)
):
    """Get system configuration (REAL from settings)"""
    from backend.config.settings import settings
    
    return {
        "app": {
            "name": settings.PROJECT_NAME,
            "environment": os.getenv("ENVIRONMENT", "production"),
            "debug": False, # Always false in prod view
            "maintenance_mode": False
        },
        "limits": {
            "max_photos_per_user": 9,
            "max_bio_length": 500,
            "swipe_limit_free": 100,
            "rate_limit_per_minute": settings.RATE_LIMIT_PER_MINUTE
        },
        "notifications": {
            "push_enabled": bool(settings.FIREBASE_CREDENTIALS) or bool(os.getenv("FIREBASE_CREDENTIALS")),
            "email_enabled": bool(settings.SMTP_SERVER) or bool(os.getenv("SMTP_SERVER")),
        }
    }


# ============================================
# ALIASES for frontend compatibility
# ============================================

@router.get("/audit")
async def get_audit_alias(
    page: int = 1,
    page_size: int = 50,
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Alias for /audit-logs — frontend calls /admin/system/audit"""
    return await get_audit_logs(page, page_size, admin_id, action, db, current_user)


@router.post("/feature-flags/{flag_key}")
async def update_feature_flag_post(
    flag_key: str,
    update: FeatureFlagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """POST alias for PUT /feature-flags/{flag_key} - frontend sends POST"""
    return await update_feature_flag(flag_key, update, db, current_user)
