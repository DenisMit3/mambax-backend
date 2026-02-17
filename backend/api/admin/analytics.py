"""
Admin Analytics endpoints: overview, funnel, retention, realtime, churn, ltv, geo, export.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, or_, cast, Date, select, case
from typing import Optional
from datetime import datetime, timedelta

from backend.database import get_db
from backend.models.user import User, SubscriptionTier
from backend.models.interaction import Report, Match
from backend.models.monetization import RevenueTransaction
from backend.models.chat import Message
from backend.models.analytics import RetentionCohort, DailyMetric
from .deps import get_current_admin

router = APIRouter()


@router.get("/analytics/overview")
async def get_analytics_overview(
    period: str = "7d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get analytics overview with real data"""
    now = datetime.utcnow()
    days = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}.get(period, 7)
    start_date = now - timedelta(days=days)

    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= start_date)
    )
    new_users = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(User.updated_at >= start_date)
    )
    active_users = result.scalar() or 0

    result = await db.execute(
        select(func.count(Match.id)).where(Match.created_at >= start_date)
    )
    new_matches = result.scalar() or 0

    result = await db.execute(
        select(func.count(Message.id)).where(Message.created_at >= start_date)
    )
    messages = result.scalar() or 0

    result = await db.execute(
        select(func.sum(RevenueTransaction.amount)).where(
            and_(
                RevenueTransaction.status == 'completed',
                RevenueTransaction.created_at >= start_date
            )
        )
    )
    revenue = float(result.scalar() or 0)

    daily_data = []
    for i in range(min(days, 30)):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())

        r_users = await db.execute(
            select(func.count(User.id)).where(
                and_(User.created_at >= day_start, User.created_at <= day_end)
            )
        )
        r_active = await db.execute(
            select(func.count(User.id)).where(
                and_(User.updated_at >= day_start, User.updated_at <= day_end)
            )
        )
        r_matches = await db.execute(
            select(func.count(Match.id)).where(
                and_(Match.created_at >= day_start, Match.created_at <= day_end)
            )
        )
        r_msgs = await db.execute(
            select(func.count(Message.id)).where(
                and_(Message.created_at >= day_start, Message.created_at <= day_end)
            )
        )
        r_rev = await db.execute(
            select(func.sum(RevenueTransaction.amount)).where(
                and_(
                    RevenueTransaction.status == 'completed',
                    RevenueTransaction.created_at >= day_start,
                    RevenueTransaction.created_at <= day_end
                )
            )
        )

        daily_data.insert(0, {
            "date": day.isoformat(),
            "new_users": r_users.scalar() or 0,
            "dau": r_active.scalar() or 0,
            "matches": r_matches.scalar() or 0,
            "messages": r_msgs.scalar() or 0,
            "revenue": float(r_rev.scalar() or 0)
        })

    return {
        "period": period,
        "summary": {
            "total_users": total_users,
            "new_users": new_users,
            "active_users": active_users,
            "new_matches": new_matches,
            "messages": messages,
            "revenue": revenue
        },
        "daily": daily_data
    }


@router.get("/analytics/funnel")
async def get_conversion_funnel(
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user conversion funnel data"""
    now = datetime.utcnow()
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    start_date = now - timedelta(days=days)

    result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= start_date)
    )
    registered = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(
            and_(User.created_at >= start_date, User.is_complete == True)
        )
    )
    completed_profile = result.scalar() or 0

    result = await db.execute(
        select(func.count(func.distinct(Match.user1_id))).where(Match.created_at >= start_date)
    )
    first_match = result.scalar() or 0

    result = await db.execute(
        select(func.count(func.distinct(Message.sender_id))).where(Message.created_at >= start_date)
    )
    first_message = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.created_at >= start_date,
                User.subscription_tier.in_(['gold', 'platinum', 'vip'])
            )
        )
    )
    premium = result.scalar() or 0

    funnel = [
        {"stage": "Регистрация", "count": registered, "percentage": 100},
        {"stage": "Заполнение профиля", "count": completed_profile,
         "percentage": round(completed_profile / max(registered, 1) * 100, 1)},
        {"stage": "Первый мэтч", "count": first_match,
         "percentage": round(first_match / max(registered, 1) * 100, 1)},
        {"stage": "Первое сообщение", "count": first_message,
         "percentage": round(first_message / max(registered, 1) * 100, 1)},
        {"stage": "Подписка", "count": premium,
         "percentage": round(premium / max(registered, 1) * 100, 1)},
    ]

    return {"period": period, "funnel": funnel}


@router.get("/analytics/retention")
async def get_retention_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user retention cohort data"""
    result = await db.execute(
        select(RetentionCohort).order_by(desc(RetentionCohort.cohort_date)).limit(12)
    )
    cohorts = result.scalars().all()

    if cohorts:
        return {
            "cohorts": [
                {
                    "cohort": c.cohort_date.isoformat(),
                    "users": c.initial_users,
                    "retention": c.retention_data
                }
                for c in cohorts
            ]
        }

    now = datetime.utcnow()
    cohort_data = []
    for month_offset in range(6):
        month_start = (now - timedelta(days=30 * month_offset)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)

        result = await db.execute(
            select(func.count(User.id)).where(
                and_(User.created_at >= month_start, User.created_at < month_end)
            )
        )
        cohort_size = result.scalar() or 0

        retention = {}
        for week in range(1, 9):
            check_date = month_start + timedelta(weeks=week)
            if check_date > now:
                break
            result = await db.execute(
                select(func.count(User.id)).where(
                    and_(
                        User.created_at >= month_start,
                        User.created_at < month_end,
                        User.updated_at >= check_date - timedelta(days=7),
                        User.updated_at < check_date
                    )
                )
            )
            retained = result.scalar() or 0
            retention[f"week_{week}"] = round(retained / max(cohort_size, 1) * 100, 1)

        cohort_data.append({
            "cohort": month_start.strftime("%Y-%m"),
            "users": cohort_size,
            "retention": retention
        })

    return {"cohorts": cohort_data}


@router.get("/analytics/realtime")
async def get_realtime_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get real-time analytics data"""
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)
    one_day_ago = now - timedelta(days=1)
    one_week_ago = now - timedelta(days=7)
    one_month_ago = now - timedelta(days=30)

    result = await db.execute(
        select(func.count(User.id)).where(User.updated_at >= one_hour_ago)
    )
    active_now = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(User.updated_at >= one_day_ago)
    )
    dau = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(User.updated_at >= one_week_ago)
    )
    wau = result.scalar() or 0

    result = await db.execute(
        select(func.count(User.id)).where(User.updated_at >= one_month_ago)
    )
    mau = result.scalar() or 0

    return {
        "timestamp": now.isoformat(),
        "active_now": active_now,
        "dau": dau,
        "wau": wau,
        "mau": mau,
        "trend": {"dau_change": 0, "wau_change": 0, "mau_change": 0}
    }


@router.get("/analytics/churn")
async def get_churn_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get churn analysis data"""
    now = datetime.utcnow()

    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 1

    periods = [7, 14, 30, 60, 90]
    churn_data = []
    for days in periods:
        cutoff = now - timedelta(days=days)
        result = await db.execute(
            select(func.count(User.id)).where(
                and_(User.updated_at < cutoff, User.status == 'active')
            )
        )
        inactive = result.scalar() or 0
        churn_data.append({
            "period": f"{days}d",
            "inactive_users": inactive,
            "churn_rate": round(inactive / total_users * 100, 1)
        })

    result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.updated_at < now - timedelta(days=30),
                User.subscription_tier.in_(['gold', 'platinum', 'vip'])
            )
        )
    )
    premium_churn = result.scalar() or 0

    return {
        "churn_periods": churn_data,
        "premium_churn": premium_churn,
        "total_users": total_users,
        "at_risk_users": churn_data[1]["inactive_users"] if len(churn_data) > 1 else 0
    }


@router.get("/analytics/ltv-prediction")
async def get_ltv_prediction(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Heuristic-based LTV prediction by user segments"""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    ninety_days_ago = now - timedelta(days=90)

    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 1

    rev_30d_q = select(func.coalesce(func.sum(RevenueTransaction.amount), 0)).where(
        and_(RevenueTransaction.status == "completed", RevenueTransaction.created_at >= thirty_days_ago)
    )
    result = await db.execute(rev_30d_q)
    revenue_30d = float(result.scalar() or 0)

    rev_90d_q = select(func.coalesce(func.sum(RevenueTransaction.amount), 0)).where(
        and_(RevenueTransaction.status == "completed", RevenueTransaction.created_at >= ninety_days_ago)
    )
    result = await db.execute(rev_90d_q)
    revenue_90d = float(result.scalar() or 0)

    paying_q = select(func.count(func.distinct(RevenueTransaction.user_id))).where(
        RevenueTransaction.status == "completed"
    )
    result = await db.execute(paying_q)
    paying_users = result.scalar() or 0

    vip_count_q = select(func.count(User.id)).where(User.is_vip == True)
    result = await db.execute(vip_count_q)
    vip_count = result.scalar() or 0

    vip_rev_q = select(func.coalesce(func.sum(RevenueTransaction.amount), 0)).where(
        and_(
            RevenueTransaction.status == "completed",
            RevenueTransaction.user_id.in_(select(User.id).where(User.is_vip == True))
        )
    )
    result = await db.execute(vip_rev_q)
    vip_revenue = float(result.scalar() or 0)

    free_count_q = select(func.count(User.id)).where(
        or_(User.subscription_tier == SubscriptionTier.FREE, User.subscription_tier.is_(None))
    )
    result = await db.execute(free_count_q)
    free_count = result.scalar() or 0

    seven_days_ago = now - timedelta(days=7)
    active_q = select(func.count(User.id)).where(
        and_(User.updated_at >= seven_days_ago, User.status == 'active')
    )
    result = await db.execute(active_q)
    active_count = result.scalar() or 0

    inactive_q = select(func.count(User.id)).where(
        and_(User.updated_at < thirty_days_ago, User.status == 'active')
    )
    result = await db.execute(inactive_q)
    inactive_count = result.scalar() or 0

    arpu_30d = round(revenue_30d / max(total_users, 1), 2)
    arppu_30d = round(revenue_30d / max(paying_users, 1), 2)

    avg_lifetime_months = 6.0
    churn_rate = inactive_count / max(total_users, 1)
    if churn_rate > 0:
        avg_lifetime_months = min(24, max(2, 1 / max(churn_rate, 0.01)))

    estimated_ltv = round(arpu_30d * avg_lifetime_months, 2)

    vip_arpu = round(vip_revenue / max(vip_count, 1) if vip_count > 0 else 0, 2)
    vip_ltv = round(vip_arpu * avg_lifetime_months * 1.5, 2)

    conversion_rate = paying_users / max(total_users, 1)
    free_potential_ltv = round(vip_ltv * conversion_rate * 0.3, 2)

    segments = [
        {
            "segment": "VIP / Premium", "users": vip_count,
            "percentage": round(vip_count / max(total_users, 1) * 100, 1),
            "avg_ltv": vip_ltv, "total_revenue": round(vip_revenue, 2),
            "arpu": vip_arpu, "risk": "low",
        },
        {
            "segment": "Активные (7д)", "users": active_count,
            "percentage": round(active_count / max(total_users, 1) * 100, 1),
            "avg_ltv": round(estimated_ltv * 1.2, 2), "total_revenue": round(revenue_30d * 0.7, 2),
            "arpu": round(arpu_30d * 1.2, 2), "risk": "low",
        },
        {
            "segment": "Free tier", "users": free_count,
            "percentage": round(free_count / max(total_users, 1) * 100, 1),
            "avg_ltv": free_potential_ltv, "total_revenue": 0, "arpu": 0, "risk": "medium",
        },
        {
            "segment": "Неактивные (30д+)", "users": inactive_count,
            "percentage": round(inactive_count / max(total_users, 1) * 100, 1),
            "avg_ltv": round(free_potential_ltv * 0.1, 2), "total_revenue": 0, "arpu": 0, "risk": "high",
        },
    ]

    recommendations = []
    if vip_count < total_users * 0.05:
        recommendations.append(f"VIP конверсия низкая ({round(vip_count/max(total_users,1)*100,1)}%). Запустите промо-кампанию")
    if inactive_count > total_users * 0.3:
        recommendations.append(f"{inactive_count} неактивных пользователей. Отправьте re-engagement пуши")
    if arppu_30d < 5:
        recommendations.append("ARPPU ниже $5. Рассмотрите upsell для платящих пользователей")
    if conversion_rate < 0.03:
        recommendations.append(f"Конверсия в платящих {round(conversion_rate*100,1)}%. Предложите пробный VIP период")
    if not recommendations:
        recommendations.append("Метрики LTV в норме. Продолжайте мониторинг")

    return {
        "prediction_date": now.isoformat(),
        "model_version": "heuristic-ltv-v1.0",
        "confidence": 0.70,
        "summary": {
            "total_users": total_users, "paying_users": paying_users,
            "conversion_rate": round(conversion_rate * 100, 2),
            "arpu_30d": arpu_30d, "arppu_30d": arppu_30d,
            "estimated_avg_ltv": estimated_ltv,
            "revenue_30d": round(revenue_30d, 2), "revenue_90d": round(revenue_90d, 2),
            "avg_lifetime_months": round(avg_lifetime_months, 1),
        },
        "segments": segments,
        "trends": {
            "ltv_change_30d": round((revenue_30d / max(revenue_90d / 3, 1) - 1) * 100, 1) if revenue_90d > 0 else 0,
            "conversion_trend": "stable",
            "churn_rate": round(churn_rate * 100, 1),
        },
        "recommendations": recommendations,
    }


@router.get("/analytics/geo")
async def get_geo_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get geographic distribution of users from real DB data"""
    now = datetime.utcnow()

    result = await db.execute(
        select(
            User.city,
            func.avg(User.latitude).label("lat"),
            func.avg(User.longitude).label("lng"),
            func.count(User.id).label("users"),
            func.count(case((User.is_premium == True, 1))).label("vip"),
            func.count(case((User.last_seen >= now - timedelta(days=7), 1))).label("active"),
        )
        .where(and_(User.city.isnot(None), User.city != ""))
        .group_by(User.city)
        .order_by(desc("users"))
        .limit(30)
    )
    rows = result.all()

    points = [
        {
            "city": row.city,
            "lat": round(float(row.lat), 4) if row.lat else 0,
            "lng": round(float(row.lng), 4) if row.lng else 0,
            "users": row.users,
            "vip": row.vip,
            "active": row.active,
        }
        for row in rows
    ]

    total_users = sum(p["users"] for p in points)
    total_vip = sum(p["vip"] for p in points)

    return {
        "points": points,
        "total_users": total_users,
        "total_vip": total_vip,
        "top_cities": sorted(points, key=lambda x: x["users"], reverse=True)[:10],
    }


@router.get("/analytics/export")
async def export_analytics(
    period: str = "30d",
    format: str = "json",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Export analytics data"""
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(DailyMetric).where(DailyMetric.date >= start_date.date()).order_by(DailyMetric.date)
    )
    metrics = result.scalars().all()

    data = [
        {
            "date": m.date.isoformat(),
            "dau": m.dau,
            "new_users": m.new_users,
            "revenue": float(m.revenue) if m.revenue else 0,
            "matches": m.matches,
            "messages": m.messages,
        }
        for m in metrics
    ]

    return {"period": period, "format": format, "data": data, "total_records": len(data)}
