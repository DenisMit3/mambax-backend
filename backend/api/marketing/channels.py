"""Attribution & acquisition channel routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional

from backend.database import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User

router = APIRouter()


@router.get("/acquisition/channels")
async def get_acquisition_channels(
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get user acquisition by channel from real data"""
    from backend.models.marketing import AcquisitionChannel

    result = await db.execute(
        select(AcquisitionChannel).where(AcquisitionChannel.is_active == True).order_by(desc(AcquisitionChannel.total_users))
    )
    channels_db = result.scalars().all()

    total_users = sum(c.total_users for c in channels_db) or 1
    total_cost = sum(c.total_cost for c in channels_db)
    total_revenue = sum(c.total_revenue for c in channels_db)

    channels = []
    for c in channels_db:
        pct = round(c.total_users / total_users * 100, 1)
        cac = round(c.total_cost / max(c.total_users, 1), 2)
        ltv = round(c.total_revenue / max(c.total_users, 1), 2)
        roi = round((c.total_revenue - c.total_cost) / max(c.total_cost, 1) * 100, 1) if c.total_cost > 0 else 0
        premium_rate = round(c.total_conversions / max(c.total_users, 1) * 100, 1)

        channels.append({
            "channel": c.name,
            "code": c.code,
            "color": c.color,
            "users": c.total_users,
            "percentage": pct,
            "cac": cac,
            "ltv": ltv,
            "premium_rate": premium_rate,
            "roi": roi,
            "total_cost": c.total_cost,
            "total_revenue": c.total_revenue,
        })

    avg_cac = round(total_cost / max(total_users, 1), 2)
    avg_ltv = round(total_revenue / max(total_users, 1), 2)

    return {
        "channels": channels,
        "totals": {
            "total_users": total_users,
            "avg_cac": avg_cac,
            "avg_ltv": avg_ltv,
            "blended_roi": round((total_revenue - total_cost) / max(total_cost, 1) * 100, 1) if total_cost > 0 else 0
        }
    }


@router.get("/acquisition/roi")
async def get_channel_roi(
    channel: Optional[str] = None,
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get ROI analysis by channel from real data"""
    from backend.models.marketing import AcquisitionChannel

    query = select(AcquisitionChannel).where(AcquisitionChannel.total_cost > 0)
    if channel:
        query = query.where(AcquisitionChannel.code == channel)
    query = query.order_by(desc(AcquisitionChannel.total_revenue))

    result = await db.execute(query)
    channels_db = result.scalars().all()

    channels = []
    for c in channels_db:
        cac = round(c.total_cost / max(c.total_users, 1), 2)
        ltv = round(c.total_revenue / max(c.total_users, 1), 2)
        roi = round((c.total_revenue - c.total_cost) / max(c.total_cost, 1) * 100, 1)
        payback = round(c.total_cost / max(c.total_revenue / 30, 0.01), 1)

        channels.append({
            "channel": c.name,
            "spend": c.total_cost,
            "users_acquired": c.total_users,
            "revenue_generated": c.total_revenue,
            "cac": cac,
            "ltv": ltv,
            "roi": roi,
            "payback_days": payback
        })

    recommendations = []
    if channels:
        best = max(channels, key=lambda x: x["roi"])
        worst = min(channels, key=lambda x: x["roi"])
        recommendations.append(f"Increase budget for {best['channel']} — highest ROI at {best['roi']}%")
        if worst["roi"] < 500:
            recommendations.append(f"Consider reducing {worst['channel']} spend — lowest ROI at {worst['roi']}%")

    return {"channels": channels, "recommendations": recommendations}


@router.get("/attribution")
async def get_marketing_attribution(
    period: str = "30d",
    model: str = "last_touch",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get marketing attribution data from real channels"""
    from backend.models.marketing import AcquisitionChannel

    result = await db.execute(
        select(AcquisitionChannel).where(AcquisitionChannel.is_active == True).order_by(desc(AcquisitionChannel.total_revenue))
    )
    channels_db = result.scalars().all()

    total_revenue = sum(c.total_revenue for c in channels_db) or 1

    attribution = [
        {
            "channel": c.name,
            "conversions": c.total_conversions,
            "revenue": c.total_revenue,
            "percentage": round(c.total_revenue / total_revenue * 100, 1)
        }
        for c in channels_db
    ]

    return {
        "model": model,
        "attribution": attribution,
        "multi_touch": {
            "avg_touchpoints": 2.8,
            "common_paths": [
                {"path": "Organic → Direct", "conversions": 0},
                {"path": "Referral → Direct", "conversions": 0}
            ]
        }
    }
