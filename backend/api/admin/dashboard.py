"""
Admin Dashboard endpoints: metrics, activity feed.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, cast, Date, select
from datetime import datetime, timedelta

from backend.database import get_db
from backend.models.user import User
from backend.models.interaction import Report, Match
from backend.models.monetization import UserSubscription, RevenueTransaction
from backend.models.chat import Message
from .deps import get_current_admin, DashboardMetrics

router = APIRouter()


@router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get main dashboard KPI metrics (Real Data)"""
    
    today = datetime.utcnow().date()
    yesterday_cutoff = datetime.utcnow() - timedelta(days=1)
    
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(User.id)).where(User.updated_at >= yesterday_cutoff)
    )
    active_today = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(UserSubscription.id)).where(
            UserSubscription.status == 'active'
        )
    )
    premium_users = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(Report.id)).where(Report.status == 'pending')
    )
    pending_moderation = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(Report.id)).where(cast(Report.created_at, Date) == today)
    )
    reports_today = result.scalar() or 0
    
    result = await db.execute(
        select(func.sum(RevenueTransaction.amount)).where(
            and_(
                RevenueTransaction.status == 'completed',
                cast(RevenueTransaction.created_at, Date) == today
            )
        )
    )
    revenue_today = result.scalar() or 0.0
    
    result = await db.execute(
        select(func.count(Match.id)).where(cast(Match.created_at, Date) == today)
    )
    new_matches = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(Message.id)).where(cast(Message.created_at, Date) == today)
    )
    messages_sent = result.scalar() or 0

    traffic_history = []
    now = datetime.utcnow()
    for i in range(24):
        start_dt = now - timedelta(hours=i+1)
        end_dt = now - timedelta(hours=i)
        res = await db.execute(
            select(func.count(User.id)).where(
                and_(User.updated_at >= start_dt, User.updated_at < end_dt)
            )
        )
        count = res.scalar() or 0
        traffic_history.insert(0, count)
    
    return DashboardMetrics(
        total_users=total_users,
        active_today=active_today,
        new_matches=new_matches,
        messages_sent=messages_sent,
        revenue_today=float(revenue_today),
        premium_users=premium_users,
        pending_moderation=pending_moderation,
        reports_today=reports_today,
        traffic_history=traffic_history
    )


@router.get("/dashboard/activity")
async def get_live_activity(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get recent activity feed from real database data"""
    activities = []
    now = datetime.utcnow()
    
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).limit(limit)
    )
    recent_users = result.scalars().all()
    for user in recent_users:
        delta = now - user.created_at
        mins = int(delta.total_seconds() // 60)
        time_str = f"{mins} мин. назад" if mins < 60 else f"{mins // 60} ч. назад"
        activities.append({
            "id": str(user.id), 
            "type": "user", 
            "message": "Новый пользователь зарегистрирован", 
            "time": time_str, 
            "ts": user.created_at
        })
    
    result = await db.execute(
        select(Match).order_by(desc(Match.created_at)).limit(limit)
    )
    recent_matches = result.scalars().all()
    for match in recent_matches:
        delta = now - match.created_at
        mins = int(delta.total_seconds() // 60)
        time_str = f"{mins} мин. назад" if mins < 60 else f"{mins // 60} ч. назад"
        activities.append({
            "id": str(match.id), 
            "type": "match", 
            "message": "Новый мэтч создан", 
            "time": time_str, 
            "ts": match.created_at
        })
    
    result = await db.execute(
        select(Report).order_by(desc(Report.created_at)).limit(limit)
    )
    recent_reports = result.scalars().all()
    for report in recent_reports:
        delta = now - report.created_at
        mins = int(delta.total_seconds() // 60)
        time_str = f"{mins} мин. назад" if mins < 60 else f"{mins // 60} ч. назад"
        activities.append({
            "id": str(report.id), 
            "type": "report", 
            "message": "Новая жалоба подана", 
            "time": time_str, 
            "ts": report.created_at
        })
    
    result = await db.execute(
        select(RevenueTransaction).where(
            RevenueTransaction.status == 'completed'
        ).order_by(desc(RevenueTransaction.created_at)).limit(limit)
    )
    recent_transactions = result.scalars().all()
    for tx in recent_transactions:
        delta = now - tx.created_at
        mins = int(delta.total_seconds() // 60)
        time_str = f"{mins} мин. назад" if mins < 60 else f"{mins // 60} ч. назад"
        activities.append({
            "id": str(tx.id), 
            "type": "payment", 
            "message": f"Получен платёж: {tx.amount}⭐", 
            "time": time_str, 
            "ts": tx.created_at
        })
    
    activities.sort(key=lambda x: x["ts"], reverse=True)
    return [{k: v for k, v in a.items() if k != "ts"} for a in activities[:limit]]
