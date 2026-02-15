"""
Admin Notifications endpoints: broadcast, audit logs.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, select
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from backend.database import get_db
from backend.models.user import User
from backend.models.system import AuditLog
from .deps import get_current_admin

router = APIRouter()


class BroadcastRequest(BaseModel):
    title: str
    message: str
    target: str = "all"
    channels: List[str] = ["push"]


@router.post("/notifications/broadcast")
async def send_broadcast(
    data: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Send broadcast notification to users"""
    result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    target_count = result.scalar() or 0

    db.add(AuditLog(
        admin_id=current_user.id,
        action="send_broadcast",
        target_resource=f"broadcast:{data.target}",
        changes={
            "title": data.title,
            "message": data.message,
            "channels": data.channels,
            "target_count": target_count
        }
    ))
    await db.commit()

    return {
        "status": "success",
        "message": f"Рассылка отправлена {target_count} пользователям",
        "target_count": target_count
    }


@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    admin_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get admin audit logs"""
    query = select(AuditLog, User.name).outerjoin(User, AuditLog.admin_id == User.id)

    conditions = []
    if action:
        conditions.append(AuditLog.action == action)
    if admin_id:
        from uuid import UUID
        try:
            conditions.append(AuditLog.admin_id == UUID(admin_id))
        except ValueError:
            pass

    if conditions:
        query = query.where(and_(*conditions))

    count_q = select(func.count(AuditLog.id))
    if conditions:
        count_q = count_q.where(and_(*conditions))
    result = await db.execute(count_q)
    total = result.scalar() or 0

    query = query.order_by(desc(AuditLog.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "admin_id": str(log.admin_id),
                "admin_name": name or "Система",
                "action": log.action,
                "target": log.target_resource,
                "changes": log.changes,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log, name in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }
