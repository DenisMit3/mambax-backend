"""
Admin Security endpoints: alerts, auto-ban rules.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, select
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import uuid as uuid_module

from backend.database import get_db
from backend.models.user import User
from backend.models.interaction import Report
from backend.models.moderation import BannedUser
from backend.models.system import AuditLog, AutoBanRule
from backend.models.user_management import FraudScore
from .deps import get_current_admin

router = APIRouter()


class AutoBanRuleCreate(BaseModel):
    name: str
    condition_type: str
    threshold: float
    action: str = "ban"
    is_active: bool = True
    description: Optional[str] = None


@router.get("/security/alerts")
async def get_security_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get security alerts based on real data"""
    alerts = []
    now = datetime.utcnow()

    # High fraud score users
    result = await db.execute(
        select(FraudScore, User.name).join(User, FraudScore.user_id == User.id).where(
            FraudScore.score >= 70
        ).order_by(desc(FraudScore.score)).limit(10)
    )
    for fraud, name in result.all():
        alerts.append({
            "id": str(fraud.id),
            "type": "fraud",
            "severity": "high" if fraud.score >= 85 else "medium",
            "message": f"Высокий fraud score ({fraud.score}) у пользователя {name}",
            "user_id": str(fraud.user_id),
            "created_at": fraud.updated_at.isoformat() if fraud.updated_at else now.isoformat(),
        })

    # Recent bans
    result = await db.execute(
        select(BannedUser, User.name).join(User, BannedUser.user_id == User.id).where(
            BannedUser.created_at >= now - timedelta(days=7)
        ).order_by(desc(BannedUser.created_at)).limit(10)
    )
    for ban, name in result.all():
        alerts.append({
            "id": str(ban.id),
            "type": "ban",
            "severity": "info",
            "message": f"Пользователь {name} заблокирован: {ban.reason}",
            "user_id": str(ban.user_id),
            "created_at": ban.created_at.isoformat(),
        })

    # Spike in reports
    result = await db.execute(
        select(func.count(Report.id)).where(
            Report.created_at >= now - timedelta(hours=24)
        )
    )
    reports_24h = result.scalar() or 0

    result = await db.execute(
        select(func.count(Report.id)).where(
            and_(
                Report.created_at >= now - timedelta(hours=48),
                Report.created_at < now - timedelta(hours=24)
            )
        )
    )
    reports_prev_24h = result.scalar() or 0

    if reports_24h > reports_prev_24h * 2 and reports_24h > 5:
        alerts.append({
            "id": "spike_reports",
            "type": "spike",
            "severity": "high",
            "message": f"Всплеск жалоб: {reports_24h} за 24ч (было {reports_prev_24h})",
            "user_id": None,
            "created_at": now.isoformat(),
        })

    alerts.sort(key=lambda x: x["created_at"], reverse=True)
    return {"alerts": alerts, "total": len(alerts)}


@router.get("/security/auto-ban-rules")
async def get_auto_ban_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get auto-ban rules"""
    result = await db.execute(select(AutoBanRule).order_by(desc(AutoBanRule.created_at)))
    rules = result.scalars().all()

    return {
        "rules": [
            {
                "id": str(r.id),
                "name": r.name,
                "condition_type": r.condition_type,
                "threshold": r.threshold,
                "action": r.action,
                "is_active": r.is_active,
                "triggers_count": r.triggers_count or 0,
                "created_at": r.created_at.isoformat(),
            }
            for r in rules
        ]
    }


@router.post("/security/auto-ban-rules")
async def create_auto_ban_rule(
    data: AutoBanRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new auto-ban rule"""
    rule = AutoBanRule(
        name=data.name,
        condition_type=data.condition_type,
        threshold=data.threshold,
        action=data.action,
        is_active=data.is_active,
        description=data.description,
    )
    db.add(rule)

    db.add(AuditLog(
        admin_id=current_user.id,
        action="create_autoban_rule",
        target_resource=f"rule:{data.name}",
        changes={"condition": data.condition_type, "threshold": data.threshold}
    ))

    await db.commit()
    return {"status": "success", "message": f"Правило '{data.name}' создано", "id": str(rule.id)}


@router.put("/security/auto-ban-rules/{rule_id}")
async def update_auto_ban_rule(
    rule_id: str,
    data: AutoBanRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update an auto-ban rule"""
    try:
        rid = uuid_module.UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")

    result = await db.execute(select(AutoBanRule).where(AutoBanRule.id == rid))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Правило не найдено")

    rule.name = data.name
    rule.condition_type = data.condition_type
    rule.threshold = data.threshold
    rule.action = data.action
    rule.is_active = data.is_active
    if data.description is not None:
        rule.description = data.description

    await db.commit()
    return {"status": "success", "message": "Правило обновлено"}


@router.delete("/security/auto-ban-rules/{rule_id}")
async def delete_auto_ban_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete an auto-ban rule"""
    try:
        rid = uuid_module.UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")

    result = await db.execute(select(AutoBanRule).where(AutoBanRule.id == rid))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Правило не найдено")

    await db.delete(rule)
    await db.commit()
    return {"status": "success", "message": "Правило удалено"}
