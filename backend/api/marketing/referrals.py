"""Referral program routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta

from backend.database import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User

router = APIRouter()


@router.get("/referrals/stats")
async def get_referral_program_stats(
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get referral program statistics from real data"""
    from backend.models.marketing import Referral, ReferralStatus

    days = int(period.replace("d", "")) if period.endswith("d") else 30
    since = datetime.utcnow() - timedelta(days=days)

    total_referrals = await db.scalar(
        select(func.count(Referral.id)).where(Referral.created_at >= since)
    ) or 0

    successful_signups = await db.scalar(
        select(func.count(Referral.id)).where(
            Referral.created_at >= since,
            Referral.status.in_([ReferralStatus.CONVERTED, ReferralStatus.PENDING])
        )
    ) or 0

    premium_conversions = await db.scalar(
        select(func.count(Referral.id)).where(
            Referral.created_at >= since,
            Referral.status == ReferralStatus.CONVERTED
        )
    ) or 0

    total_rewards = await db.scalar(
        select(func.coalesce(func.sum(Referral.reward_stars), 0.0)).where(
            Referral.reward_paid == True,
            Referral.created_at >= since
        )
    ) or 0

    conversion_rate = round((successful_signups / total_referrals * 100), 1) if total_referrals > 0 else 0
    premium_rate = round((premium_conversions / successful_signups * 100), 1) if successful_signups > 0 else 0

    # Weekly trend
    trend = []
    for week in range(4):
        week_start = since + timedelta(weeks=week)
        week_end = week_start + timedelta(weeks=1)
        w_total = await db.scalar(
            select(func.count(Referral.id)).where(
                Referral.created_at >= week_start,
                Referral.created_at < week_end
            )
        ) or 0
        w_converted = await db.scalar(
            select(func.count(Referral.id)).where(
                Referral.created_at >= week_start,
                Referral.created_at < week_end,
                Referral.status == ReferralStatus.CONVERTED
            )
        ) or 0
        trend.append({
            "date": f"Week {week + 1}",
            "referrals": w_total,
            "signups": w_total,
            "conversions": w_converted
        })

    return {
        "summary": {
            "total_referrals": total_referrals,
            "successful_signups": successful_signups,
            "premium_conversions": premium_conversions,
            "conversion_rate": conversion_rate,
            "premium_rate": premium_rate,
            "total_rewards_given": float(total_rewards),
            "cac_via_referral": round(float(total_rewards) / max(successful_signups, 1), 2),
            "viral_coefficient": round(total_referrals / max(1, await db.scalar(select(func.count(User.id)).where(User.referred_by.isnot(None))) or 1), 2)
        },
        "trend": trend,
        "rewards_breakdown": [
            {"type": "Stars Bonus", "count": premium_conversions, "value": float(total_rewards)}
        ]
    }


@router.get("/referrals/top-referrers")
async def get_top_referrers(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get top referrers from real data"""
    from backend.models.marketing import Referral, ReferralStatus

    result = await db.execute(
        select(
            User.id,
            User.name,
            User.created_at,
            func.count(Referral.id).label("total_referrals"),
            func.count(Referral.id).filter(Referral.status == ReferralStatus.CONVERTED).label("conversions"),
            func.coalesce(func.sum(Referral.reward_stars).filter(Referral.reward_paid == True), 0).label("total_rewards"),
        )
        .join(Referral, Referral.referrer_id == User.id)
        .group_by(User.id, User.name, User.created_at)
        .order_by(desc("total_referrals"))
        .limit(limit)
    )
    rows = result.all()

    referrers = [
        {
            "user_id": str(row.id),
            "name": row.name,
            "referrals": row.total_referrals,
            "signups": row.total_referrals,
            "conversions": row.conversions,
            "total_rewards": float(row.total_rewards),
            "joined": row.created_at.strftime("%Y-%m-%d") if row.created_at else None
        }
        for row in rows
    ]

    return {"referrers": referrers, "total": len(referrers)}


@router.get("/referrals/settings")
async def get_referral_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get referral program settings"""
    return {
        "program_active": True,
        "referrer_reward": {
            "type": "stars",
            "value": 50,
            "description": "50 Stars for each successful referral"
        },
        "referee_reward": {
            "type": "stars",
            "value": 50,
            "description": "50 Stars bonus for new users"
        },
        "conditions": {
            "min_profile_completion": 80,
            "min_days_active": 0,
            "require_verification": False
        },
        "limits": {
            "max_referrals_per_day": 10,
            "max_total_rewards": None
        }
    }
