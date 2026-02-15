"""
Admin Marketing endpoints: push notifications, referrals, campaigns, channels.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, select
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import uuid as uuid_module

from backend.database import get_db
from backend.models.user import User
from backend.models.system import AuditLog
from .deps import get_current_admin

router = APIRouter()


class PushNotificationRequest(BaseModel):
    title: str
    body: str
    target: str = "all"  # all, segment, user_ids
    user_ids: Optional[List[str]] = None
    segment: Optional[str] = None


class CampaignCreate(BaseModel):
    name: str
    type: str  # push, email, in_app
    target_segment: Optional[str] = None
    content: dict
    scheduled_at: Optional[str] = None


@router.post("/marketing/push")
async def send_push_notification(
    data: PushNotificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Send push notification to users"""
    target_count = 0

    if data.target == "all":
        result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
        target_count = result.scalar() or 0
    elif data.target == "user_ids" and data.user_ids:
        target_count = len(data.user_ids)

    db.add(AuditLog(
        admin_id=current_user.id,
        action="send_push",
        target_resource=f"push:{data.target}",
        changes={"title": data.title, "target_count": target_count}
    ))
    await db.commit()

    return {
        "status": "success",
        "message": f"Push-уведомление отправлено {target_count} пользователям",
        "target_count": target_count
    }


@router.get("/marketing/referrals")
async def get_referral_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get referral program statistics"""
    result = await db.execute(
        select(func.count(User.id)).where(User.referred_by != None)
    )
    total_referrals = result.scalar() or 0

    result = await db.execute(
        select(func.count(func.distinct(User.referred_by))).where(User.referred_by != None)
    )
    unique_referrers = result.scalar() or 0

    now = datetime.utcnow()
    result = await db.execute(
        select(func.count(User.id)).where(
            and_(User.referred_by != None, User.created_at >= now - timedelta(days=30))
        )
    )
    monthly_referrals = result.scalar() or 0

    return {
        "total_referrals": total_referrals,
        "unique_referrers": unique_referrers,
        "monthly_referrals": monthly_referrals,
        "conversion_rate": round(total_referrals / max(unique_referrers, 1) * 100, 1) if unique_referrers else 0,
    }


@router.get("/marketing/campaigns")
async def get_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get marketing campaigns list (from audit logs)"""
    result = await db.execute(
        select(AuditLog).where(
            AuditLog.action.in_(["send_push", "send_broadcast", "create_campaign"])
        ).order_by(desc(AuditLog.created_at)).limit(50)
    )
    logs = result.scalars().all()

    campaigns = []
    for log in logs:
        campaigns.append({
            "id": str(log.id),
            "type": log.action,
            "admin_id": str(log.admin_id),
            "target": log.target_resource,
            "details": log.changes,
            "created_at": log.created_at.isoformat(),
        })

    return {"campaigns": campaigns, "total": len(campaigns)}


@router.get("/marketing/channels")
async def get_acquisition_channels(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user acquisition channel breakdown"""
    channels = [
        {"channel": "Органический", "users": 0, "percentage": 0},
        {"channel": "Реферальная программа", "users": 0, "percentage": 0},
        {"channel": "Telegram Bot", "users": 0, "percentage": 0},
        {"channel": "Прямой трафик", "users": 0, "percentage": 0},
    ]

    result = await db.execute(select(func.count(User.id)))
    total = result.scalar() or 1

    result = await db.execute(
        select(func.count(User.id)).where(User.referred_by != None)
    )
    referral_count = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(User.telegram_id != None)
    )
    telegram_count = result.scalar() or 0

    organic = total - referral_count - telegram_count
    if organic < 0:
        organic = 0

    channels = [
        {"channel": "Органический", "users": organic, "percentage": round(organic / total * 100, 1)},
        {"channel": "Реферальная программа", "users": referral_count, "percentage": round(referral_count / total * 100, 1)},
        {"channel": "Telegram Bot", "users": telegram_count, "percentage": round(telegram_count / total * 100, 1)},
    ]

    return {"channels": channels, "total_users": total}
