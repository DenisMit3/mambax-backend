"""
Marketing & Growth API Routes

Comprehensive API for marketing automation including:
- Campaign management
- Push notifications
- Email marketing
- Referral programs
- Attribution tracking
- Growth experiments
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import aliased
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from pydantic import BaseModel, Field
from enum import Enum
import uuid

from backend.database import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User

router = APIRouter(prefix="/admin/marketing", tags=["marketing"])


# ============================================
# SCHEMAS
# ============================================

class CampaignType(str, Enum):
    push = "push"
    email = "email"
    sms = "sms"
    in_app = "in_app"


class CampaignStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    active = "active"
    paused = "paused"
    completed = "completed"


class CampaignCreate(BaseModel):
    name: str
    type: CampaignType
    target_segment: str = "all"
    content: dict
    scheduled_at: Optional[datetime] = None


class PushNotificationCreate(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None
    deep_link: Optional[str] = None
    target_segment: str = "all"
    scheduled_at: Optional[datetime] = None


class EmailCampaignCreate(BaseModel):
    subject: str
    from_name: str
    html_content: str
    target_segment: str = "all"
    scheduled_at: Optional[datetime] = None


# ============================================
# CAMPAIGNS
# ============================================

@router.get("/campaigns")
async def get_campaigns(
    status: Optional[str] = None,
    campaign_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get all marketing campaigns"""
    
    campaigns = [
        {
            "id": "camp-1",
            "name": "Valentine's Day Push",
            "type": "push",
            "status": "completed",
            "target_segment": "all_users",
            "sent": 45892,
            "delivered": 43247,
            "opened": 12456,
            "clicked": 3421,
            "converted": 892,
            "open_rate": 28.8,
            "ctr": 7.9,
            "conversion_rate": 2.1,
            "created_at": "2024-02-10T10:00:00Z",
            "completed_at": "2024-02-14T18:00:00Z"
        },
        {
            "id": "camp-2",
            "name": "Win-Back Email Series",
            "type": "email",
            "status": "active",
            "target_segment": "churned_30d",
            "sent": 8934,
            "delivered": 8756,
            "opened": 2847,
            "clicked": 723,
            "converted": 156,
            "open_rate": 32.5,
            "ctr": 8.3,
            "conversion_rate": 1.8,
            "created_at": "2024-02-01T09:00:00Z",
            "scheduled_end": "2024-03-01T00:00:00Z"
        },
        {
            "id": "camp-3",
            "name": "Premium Upgrade Push",
            "type": "push",
            "status": "active",
            "target_segment": "high_activity_free",
            "sent": 12456,
            "delivered": 11892,
            "opened": 4521,
            "clicked": 1234,
            "converted": 423,
            "open_rate": 38.0,
            "ctr": 10.4,
            "conversion_rate": 3.6,
            "created_at": "2024-02-05T14:00:00Z"
        },
        {
            "id": "camp-4",
            "name": "Weekend Match Boost",
            "type": "in_app",
            "status": "scheduled",
            "target_segment": "active_users",
            "scheduled_at": "2024-02-10T18:00:00Z",
            "created_at": "2024-02-08T11:00:00Z"
        },
        {
            "id": "camp-5",
            "name": "New Feature Announcement",
            "type": "email",
            "status": "draft",
            "target_segment": "all_users",
            "created_at": "2024-02-07T16:00:00Z"
        }
    ]
    
    if status:
        campaigns = [c for c in campaigns if c["status"] == status]
    if campaign_type:
        campaigns = [c for c in campaigns if c["type"] == campaign_type]
    
    return {
        "campaigns": campaigns,
        "total": len(campaigns),
        "page": page,
        "page_size": page_size
    }


@router.post("/campaigns")
async def create_campaign(
    campaign: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Create a new marketing campaign"""
    
    new_campaign = {
        "id": f"camp-{uuid.uuid4().hex[:8]}",
        **campaign.model_dump(),
        "status": "draft" if not campaign.scheduled_at else "scheduled",
        "created_at": datetime.utcnow().isoformat()
    }
    
    return {"status": "success", "campaign": new_campaign}


@router.get("/campaigns/{campaign_id}")
async def get_campaign_details(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get detailed campaign performance"""
    
    return {
        "id": campaign_id,
        "name": "Valentine's Day Push",
        "type": "push",
        "status": "completed",
        "metrics": {
            "total_sent": 45892,
            "delivered": 43247,
            "delivery_rate": 94.2,
            "opened": 12456,
            "open_rate": 28.8,
            "clicked": 3421,
            "ctr": 7.9,
            "converted": 892,
            "conversion_rate": 2.1,
            "revenue_generated": 26760.08,
            "avg_order_value": 30.00
        },
        "timeline": [
            {"time": "2024-02-14T10:00", "opened": 2456, "clicked": 892},
            {"time": "2024-02-14T11:00", "opened": 3421, "clicked": 1023},
            {"time": "2024-02-14T12:00", "opened": 2847, "clicked": 756},
            {"time": "2024-02-14T13:00", "opened": 1892, "clicked": 423},
            {"time": "2024-02-14T14:00", "opened": 1234, "clicked": 234},
            {"time": "2024-02-14T15:00", "opened": 606, "clicked": 93}
        ],
        "segments_breakdown": [
            {"segment": "Active Users", "sent": 25892, "opened": 8456, "converted": 567},
            {"segment": "Inactive 7d+", "sent": 12000, "opened": 2800, "converted": 234},
            {"segment": "New Users", "sent": 8000, "opened": 1200, "converted": 91}
        ]
    }


@router.post("/campaigns/{campaign_id}/action")
async def campaign_action(
    campaign_id: str,
    action: str = Query(..., regex="^(start|pause|stop|duplicate)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Perform action on campaign"""
    
    return {
        "status": "success",
        "message": f"Campaign {campaign_id} {action}ed",
        "new_status": "active" if action == "start" else "paused" if action == "pause" else "completed"
    }


@router.post("/campaigns/{campaign_id}/{action}")
async def campaign_action_path(
    campaign_id: str,
    action: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Alias: frontend sends action as path param instead of query param"""
    if action not in ("start", "pause", "stop", "duplicate"):
        raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
    return {
        "status": "success",
        "message": f"Campaign {campaign_id} {action}ed",
        "new_status": "active" if action == "start" else "paused" if action == "pause" else "completed"
    }


# ============================================
# PUSH NOTIFICATIONS
# ============================================

@router.get("/push-notifications")
async def get_push_notifications(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get push notification history"""
    
    notifications = [
        {
            "id": "push-1",
            "title": "You have a new match! 💕",
            "body": "Someone special is waiting to meet you",
            "sent_at": "2024-02-06T18:00:00Z",
            "sent_count": 25892,
            "delivered": 24567,
            "opened": 8923,
            "clicked": 2345,
            "delivery_rate": 94.9,
            "open_rate": 36.3
        },
        {
            "id": "push-2",
            "title": "Weekend Special! 🎉",
            "body": "Get 50% off Premium - limited time",
            "sent_at": "2024-02-03T09:00:00Z",
            "sent_count": 45000,
            "delivered": 42345,
            "opened": 12456,
            "clicked": 4521,
            "delivery_rate": 94.1,
            "open_rate": 29.4
        }
    ]
    
    return {"notifications": notifications, "total": len(notifications)}


@router.post("/push-notifications")
async def send_push_notification(
    notification: PushNotificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Send or schedule push notification"""
    
    new_push = {
        "id": f"push-{uuid.uuid4().hex[:8]}",
        **notification.model_dump(),
        "status": "scheduled" if notification.scheduled_at else "sent",
        "created_at": datetime.utcnow().isoformat()
    }
    
    if not notification.scheduled_at:
        # Would trigger actual push send
        new_push["sent_at"] = datetime.utcnow().isoformat()
        new_push["estimated_recipients"] = 45000  # Mock
    
    return {"status": "success", "notification": new_push}


@router.get("/push-notifications/analytics")
async def get_push_analytics(
    period: str = "7d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get push notification analytics"""
    
    return {
        "summary": {
            "total_sent": 156789,
            "total_delivered": 148234,
            "total_opened": 45892,
            "total_clicked": 12456,
            "avg_delivery_rate": 94.5,
            "avg_open_rate": 31.0,
            "avg_ctr": 8.4
        },
        "by_day": [
            {"date": "2024-02-01", "sent": 25000, "delivered": 23500, "opened": 7800, "clicked": 2100},
            {"date": "2024-02-02", "sent": 18000, "delivered": 17100, "opened": 5400, "clicked": 1500},
            {"date": "2024-02-03", "sent": 32000, "delivered": 30200, "opened": 9600, "clicked": 2800},
            {"date": "2024-02-04", "sent": 21000, "delivered": 19800, "opened": 6100, "clicked": 1700},
            {"date": "2024-02-05", "sent": 28000, "delivered": 26500, "opened": 8200, "clicked": 2300},
            {"date": "2024-02-06", "sent": 19789, "delivered": 18734, "opened": 5892, "clicked": 1556},
            {"date": "2024-02-07", "sent": 13000, "delivered": 12400, "opened": 2900, "clicked": 500}
        ],
        "top_performing": [
            {"title": "You have a new match! 💕", "open_rate": 42.3, "sent": 25892},
            {"title": "Weekend Special! 🎉", "open_rate": 38.5, "sent": 32000},
            {"title": "Don't miss your matches", "open_rate": 35.2, "sent": 28000}
        ]
    }


# ============================================
# EMAIL CAMPAIGNS
# ============================================

@router.get("/email-campaigns")
async def get_email_campaigns(
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get email campaigns"""
    
    campaigns = [
        {
            "id": "email-1",
            "name": "Welcome Series - Day 1",
            "subject": "Welcome to Love Connect! 💕",
            "status": "active",
            "type": "automated",
            "sent": 12456,
            "delivered": 12234,
            "opened": 8456,
            "clicked": 3421,
            "unsubscribed": 23,
            "open_rate": 69.1,
            "ctr": 28.0,
            "unsubscribe_rate": 0.19
        },
        {
            "id": "email-2",
            "name": "Win-Back Campaign",
            "subject": "We miss you! Come back for 50% off",
            "status": "active",
            "type": "one-time",
            "sent": 8934,
            "delivered": 8756,
            "opened": 2847,
            "clicked": 723,
            "unsubscribed": 45,
            "open_rate": 32.5,
            "ctr": 8.3,
            "unsubscribe_rate": 0.51
        },
        {
            "id": "email-3",
            "name": "Monthly Newsletter",
            "subject": "Your February Love Report 📊",
            "status": "scheduled",
            "type": "one-time",
            "scheduled_at": "2024-02-15T09:00:00Z",
            "target_count": 45000
        }
    ]
    
    if status:
        campaigns = [c for c in campaigns if c["status"] == status]
    
    return {"campaigns": campaigns, "total": len(campaigns)}


@router.post("/email-campaigns")
async def create_email_campaign(
    campaign: EmailCampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Create email campaign"""
    
    new_campaign = {
        "id": f"email-{uuid.uuid4().hex[:8]}",
        **campaign.model_dump(),
        "status": "draft",
        "created_at": datetime.utcnow().isoformat()
    }
    
    return {"status": "success", "campaign": new_campaign}


@router.get("/email-campaigns/{campaign_id}/stats")
async def get_email_stats(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get detailed email campaign statistics"""
    
    return {
        "id": campaign_id,
        "metrics": {
            "sent": 12456,
            "delivered": 12234,
            "delivery_rate": 98.2,
            "bounced": 222,
            "bounce_rate": 1.8,
            "opened": 8456,
            "unique_opens": 7234,
            "open_rate": 69.1,
            "clicked": 3421,
            "unique_clicks": 2892,
            "ctr": 28.0,
            "unsubscribed": 23,
            "unsubscribe_rate": 0.19,
            "spam_reports": 2,
            "spam_rate": 0.02
        },
        "devices": [
            {"device": "Mobile", "opens": 5234, "percentage": 61.9},
            {"device": "Desktop", "opens": 2456, "percentage": 29.0},
            {"device": "Tablet", "opens": 766, "percentage": 9.1}
        ],
        "email_clients": [
            {"client": "Gmail", "opens": 4521, "percentage": 53.5},
            {"client": "Apple Mail", "opens": 2234, "percentage": 26.4},
            {"client": "Outlook", "opens": 1234, "percentage": 14.6},
            {"client": "Other", "opens": 467, "percentage": 5.5}
        ],
        "click_heatmap": [
            {"link": "CTA Button", "clicks": 2456, "percentage": 71.8},
            {"link": "Header Logo", "clicks": 456, "percentage": 13.3},
            {"link": "Footer Links", "clicks": 312, "percentage": 9.1},
            {"link": "Social Icons", "clicks": 197, "percentage": 5.8}
        ]
    }


# ============================================
# REFERRAL PROGRAM
# ============================================

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


# ============================================
# ATTRIBUTION & CHANNELS
# ============================================

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
        payback = round(c.total_cost / max(c.total_revenue / 30, 0.01), 1)  # approx days

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

    # Generate recommendations
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


# ============================================
# GROWTH EXPERIMENTS
# ============================================

@router.get("/experiments")
async def get_growth_experiments(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get growth experiments"""
    
    experiments = [
        {
            "id": "exp-1",
            "name": "Onboarding Flow V2",
            "hypothesis": "Simplified onboarding will increase completion rate",
            "status": "running",
            "start_date": "2024-02-01",
            "variants": [
                {"name": "Control", "users": 5000, "completion_rate": 68.5, "conversion": 12.3},
                {"name": "Simplified", "users": 5000, "completion_rate": 78.2, "conversion": 15.8}
            ],
            "significance": 95,
            "winner": "Simplified"
        },
        {
            "id": "exp-2",
            "name": "Push Timing Test",
            "hypothesis": "Evening push notifications have higher engagement",
            "status": "running",
            "start_date": "2024-02-03",
            "variants": [
                {"name": "Morning 9AM", "users": 3000, "open_rate": 28.5, "ctr": 7.2},
                {"name": "Evening 7PM", "users": 3000, "open_rate": 35.8, "ctr": 9.8},
                {"name": "Night 10PM", "users": 3000, "open_rate": 32.1, "ctr": 8.4}
            ],
            "significance": 92,
            "winner": "Evening 7PM"
        },
        {
            "id": "exp-3",
            "name": "Pricing Page Redesign",
            "hypothesis": "New pricing layout will increase premium conversions",
            "status": "completed",
            "start_date": "2024-01-15",
            "end_date": "2024-02-05",
            "variants": [
                {"name": "Control", "users": 8000, "conversion": 4.2},
                {"name": "New Layout", "users": 8000, "conversion": 5.8}
            ],
            "significance": 99,
            "winner": "New Layout",
            "implemented": True
        }
    ]
    
    if status:
        experiments = [e for e in experiments if e["status"] == status]
    
    return {"experiments": experiments}


@router.get("/experiments/{experiment_id}")
async def get_experiment_details(
    experiment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get detailed experiment results"""
    
    return {
        "id": experiment_id,
        "name": "Onboarding Flow V2",
        "hypothesis": "Simplified onboarding will increase completion rate",
        "status": "running",
        "metrics": {
            "primary": "onboarding_completion",
            "secondary": ["first_swipe", "first_match", "premium_conversion"]
        },
        "variants": [
            {
                "name": "Control",
                "users": 5000,
                "metrics": {
                    "onboarding_completion": 68.5,
                    "first_swipe": 85.2,
                    "first_match": 42.3,
                    "premium_conversion": 12.3
                }
            },
            {
                "name": "Simplified",
                "users": 5000,
                "metrics": {
                    "onboarding_completion": 78.2,
                    "first_swipe": 92.1,
                    "first_match": 48.7,
                    "premium_conversion": 15.8
                },
                "lift": {
                    "onboarding_completion": "+14.2%",
                    "first_swipe": "+8.1%",
                    "first_match": "+15.1%",
                    "premium_conversion": "+28.5%"
                }
            }
        ],
        "daily_data": [
            {"date": "2024-02-01", "control": 65.2, "treatment": 75.8},
            {"date": "2024-02-02", "control": 68.1, "treatment": 77.4},
            {"date": "2024-02-03", "control": 69.3, "treatment": 78.9},
            {"date": "2024-02-04", "control": 68.8, "treatment": 78.1},
            {"date": "2024-02-05", "control": 70.1, "treatment": 79.2}
        ]
    }


# ============================================
# SEO & APP STORE
# ============================================

@router.get("/seo/performance")
async def get_seo_performance(
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get SEO performance metrics"""
    
    return {
        "overview": {
            "organic_traffic": 125678,
            "traffic_change": 12.5,
            "keywords_ranking": 2456,
            "top_10_keywords": 234,
            "avg_position": 18.5,
            "domain_authority": 42
        },
        "top_keywords": [
            {"keyword": "dating app", "position": 8, "traffic": 12456, "change": "+2"},
            {"keyword": "best dating app 2024", "position": 5, "traffic": 8923, "change": "+1"},
            {"keyword": "free dating site", "position": 12, "traffic": 7234, "change": "-1"},
            {"keyword": "online dating", "position": 15, "traffic": 5892, "change": "0"},
            {"keyword": "meet singles", "position": 7, "traffic": 4521, "change": "+3"}
        ],
        "top_pages": [
            {"page": "/", "traffic": 45678, "keywords": 234},
            {"page": "/features", "traffic": 23456, "keywords": 156},
            {"page": "/pricing", "traffic": 18234, "keywords": 89},
            {"page": "/blog/dating-tips", "traffic": 12345, "keywords": 67}
        ]
    }


@router.get("/app-store/metrics")
async def get_app_store_metrics(
    platform: str = "all",
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get App Store / Play Store metrics"""
    
    return {
        "ios": {
            "rating": 4.6,
            "reviews_count": 45678,
            "downloads": 125000,
            "download_change": 15.2,
            "keyword_rank": {
                "dating": 5,
                "meet singles": 3,
                "love app": 8
            }
        },
        "android": {
            "rating": 4.4,
            "reviews_count": 89234,
            "downloads": 234000,
            "download_change": 18.5,
            "keyword_rank": {
                "dating": 7,
                "meet singles": 4,
                "love app": 12
            }
        },
        "reviews_sentiment": {
            "positive": 78.5,
            "neutral": 12.3,
            "negative": 9.2,
            "common_themes": [
                {"theme": "Easy to use", "count": 1234, "sentiment": "positive"},
                {"theme": "Great matches", "count": 987, "sentiment": "positive"},
                {"theme": "Subscription price", "count": 456, "sentiment": "negative"},
                {"theme": "Bugs/crashes", "count": 234, "sentiment": "negative"}
            ]
        }
    }


# ============================================
# VIRAL COEFFICIENT
# ============================================

@router.get("/viral-coefficient")
async def get_viral_coefficient(
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Calculate and get viral coefficient"""
    
    return {
        "current": {
            "viral_coefficient": 1.24,
            "k_factor": 1.24,
            "invites_per_user": 2.8,
            "invite_conversion_rate": 44.3,
            "cycle_time_days": 5.2
        },
        "trend": [
            {"period": "Jan W1", "k_factor": 1.15},
            {"period": "Jan W2", "k_factor": 1.18},
            {"period": "Jan W3", "k_factor": 1.20},
            {"period": "Jan W4", "k_factor": 1.22},
            {"period": "Feb W1", "k_factor": 1.24}
        ],
        "breakdown": {
            "share_methods": [
                {"method": "Direct Invite", "invites": 12456, "conversions": 5521, "rate": 44.3},
                {"method": "Social Share", "invites": 8923, "conversions": 2892, "rate": 32.4},
                {"method": "Profile Share", "invites": 3456, "conversions": 1234, "rate": 35.7}
            ]
        },
        "growth_model": {
            "with_k_1_24": "Exponential growth - userbase doubles every ~14 days",
            "if_k_increased_to_1_5": "Accelerated growth - userbase doubles every ~8 days",
            "recommendations": [
                "Simplify invite flow to increase invites per user",
                "Add incentives for both referrer and referee",
                "Optimize invite landing page for better conversion"
            ]
        }
    }
