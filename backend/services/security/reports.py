"""
Reports (Жалобы)
================
Система жалоб — создание, модерация, автоматический shadowban.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.core.redis import redis_manager
from backend.models.interaction import Report as ReportModel
from backend.services.security.shadowban import shadowban_user

logger = logging.getLogger(__name__)


class ReportReason(str, Enum):
    FAKE_PROFILE = "fake_profile"
    INAPPROPRIATE_PHOTOS = "inappropriate_photos"
    HARASSMENT = "harassment"
    SPAM = "spam"
    SCAM = "scam"
    UNDERAGE = "underage"
    OTHER = "other"


class ReportStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Report(BaseModel):
    id: str
    reporter_id: str
    reported_user_id: str
    reason: ReportReason
    description: Optional[str] = None
    evidence_urls: List[str] = []
    status: ReportStatus = ReportStatus.PENDING
    created_at: str
    resolved_at: Optional[str] = None
    resolution: Optional[str] = None
    admin_id: Optional[str] = None


async def create_report(
    db: AsyncSession,
    reporter_id: str,
    reported_user_id: str,
    reason: ReportReason,
    description: Optional[str] = None,
    evidence_urls: List[str] = None
) -> ReportModel:
    """Создать жалобу на пользователя в БД"""
    
    dup_key = f"report_dup:{reporter_id}:{reported_user_id}"
    if await redis_manager.client.exists(dup_key):
        raise ValueError("Вы уже недавно отправляли жалобу на этого пользователя")
    
    report = ReportModel(
        reporter_id=uuid.UUID(reporter_id) if isinstance(reporter_id, str) else reporter_id,
        reported_id=uuid.UUID(reported_user_id) if isinstance(reported_user_id, str) else reported_user_id,
        reason=reason,
        description=description,
        evidence_urls=evidence_urls or [],
        status="pending",
        created_at=datetime.utcnow()
    )
    
    db.add(report)
    await db.flush()
    await redis_manager.client.set(dup_key, "1", ex=86400)
    
    logger.info(f"Report created in DB: {reporter_id} -> {reported_user_id} ({reason})")
    
    # Автоматический shadowban при 3+ жалобах
    count_key = f"reports_count:{reported_user_id}"
    count = await redis_manager.client.incr(count_key)
    if count == 1:
        await redis_manager.client.expire(count_key, 604800)
        
    if count >= 3:
        await shadowban_user(reported_user_id, "Multiple reports pending (auto-flag)", duration_hours=24)
    
    return report


async def get_pending_reports(db: AsyncSession, limit: int = 50) -> List[ReportModel]:
    """Получить список жалоб из БД для модерации"""
    result = await db.execute(
        select(ReportModel)
        .where(ReportModel.status == "pending")
        .order_by(ReportModel.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def resolve_report(
    db: AsyncSession,
    report_id: str,
    admin_id: str,
    resolution: str,
    action: str = None
) -> Optional[ReportModel]:
    """Разрешить жалобу в БД"""
    report_uuid = uuid.UUID(report_id) if isinstance(report_id, str) else report_id
    result = await db.execute(select(ReportModel).where(ReportModel.id == report_uuid))
    report = result.scalar_one_or_none()
    
    if not report:
        raise ValueError("Report not found")
    
    report.status = "resolved" if action != "dismiss" else "dismissed"
    report.resolved_at = datetime.utcnow()
    report.resolution = resolution
    report.admin_id = uuid.UUID(admin_id) if isinstance(admin_id, str) else admin_id
    
    if action == "shadowban":
        await shadowban_user(str(report.reported_id), f"Report resolved: {resolution}", 72)
    elif action == "suspend":
        logger.info(f"User {report.reported_id} flagged for suspension in DB")
    
    logger.info(f"Report {report_id} resolved by {admin_id}: {action}")
    
    return report
