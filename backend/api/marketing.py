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
from sqlalchemy.orm import Session
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Perform action on campaign"""
    
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
async def get_referral_stats(
    period: str = "30d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get referral program statistics"""
    
    return {
        "summary": {
            "total_referrals": 12456,
            "successful_signups": 8923,
            "premium_conversions": 2847,
            "conversion_rate": 71.7,
            "premium_rate": 31.9,
            "total_rewards_given": 28470.00,
            "cac_via_referral": 3.19,
            "viral_coefficient": 1.24
        },
        "trend": [
            {"date": "Week 1", "referrals": 2500, "signups": 1800, "conversions": 580},
            {"date": "Week 2", "referrals": 2800, "signups": 2000, "conversions": 650},
            {"date": "Week 3", "referrals": 3200, "signups": 2300, "conversions": 720},
            {"date": "Week 4", "referrals": 3956, "signups": 2823, "conversions": 897}
        ],
        "rewards_breakdown": [
            {"type": "Free Month Premium", "count": 1567, "value": 14269.33},
            {"type": "Boost Credits", "count": 2345, "value": 8207.50},
            {"type": "Super Like Pack", "count": 1234, "value": 4936.00},
            {"type": "Cash Reward", "count": 456, "value": 1057.17}
        ]
    }


@router.get("/referrals/top-referrers")
async def get_top_referrers(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get top referrers"""
    
    referrers = [
        {
            "user_id": "user-101",
            "name": "Sarah M.",
            "referrals": 156,
            "signups": 134,
            "conversions": 45,
            "total_rewards": 450.00,
            "joined": "2023-06-15"
        },
        {
            "user_id": "user-102",
            "name": "Michael K.",
            "referrals": 123,
            "signups": 98,
            "conversions": 32,
            "total_rewards": 320.00,
            "joined": "2023-08-22"
        },
        {
            "user_id": "user-103",
            "name": "Emma J.",
            "referrals": 98,
            "signups": 87,
            "conversions": 28,
            "total_rewards": 280.00,
            "joined": "2023-09-10"
        },
        {
            "user_id": "user-104",
            "name": "David L.",
            "referrals": 87,
            "signups": 72,
            "conversions": 23,
            "total_rewards": 230.00,
            "joined": "2023-07-05"
        },
        {
            "user_id": "user-105",
            "name": "Lisa W.",
            "referrals": 76,
            "signups": 65,
            "conversions": 21,
            "total_rewards": 210.00,
            "joined": "2023-10-18"
        }
    ]
    
    return {"referrers": referrers[:limit], "total": len(referrers)}


@router.get("/referrals/settings")
async def get_referral_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get referral program settings"""
    
    return {
        "program_active": True,
        "referrer_reward": {
            "type": "premium_days",
            "value": 7,
            "description": "7 days free Premium for each successful referral"
        },
        "referee_reward": {
            "type": "premium_trial",
            "value": 3,
            "description": "3 days Premium trial for new users"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get user acquisition by channel"""
    
    return {
        "channels": [
            {
                "channel": "Organic Search",
                "users": 12456,
                "percentage": 28.5,
                "cac": 0,
                "ltv": 45.67,
                "retention_d7": 65.2,
                "retention_d30": 42.3,
                "premium_rate": 15.2
            },
            {
                "channel": "Facebook Ads",
                "users": 8923,
                "percentage": 20.4,
                "cac": 3.45,
                "ltv": 52.34,
                "retention_d7": 58.4,
                "retention_d30": 38.7,
                "premium_rate": 18.5,
                "roi": 1417.7
            },
            {
                "channel": "Google Ads",
                "users": 7234,
                "percentage": 16.5,
                "cac": 4.12,
                "ltv": 48.92,
                "retention_d7": 62.1,
                "retention_d30": 40.5,
                "premium_rate": 16.8,
                "roi": 1087.4
            },
            {
                "channel": "Referral",
                "users": 5892,
                "percentage": 13.5,
                "cac": 3.19,
                "ltv": 67.45,
                "retention_d7": 72.3,
                "retention_d30": 55.6,
                "premium_rate": 31.9,
                "roi": 2014.4
            },
            {
                "channel": "App Store",
                "users": 4521,
                "percentage": 10.3,
                "cac": 0,
                "ltv": 42.12,
                "retention_d7": 55.8,
                "retention_d30": 35.2,
                "premium_rate": 12.4
            },
            {
                "channel": "Social Media",
                "users": 3456,
                "percentage": 7.9,
                "cac": 2.15,
                "ltv": 38.90,
                "retention_d7": 48.9,
                "retention_d30": 28.4,
                "premium_rate": 10.2,
                "roi": 1709.3
            },
            {
                "channel": "Influencer",
                "users": 1234,
                "percentage": 2.8,
                "cac": 8.50,
                "ltv": 55.23,
                "retention_d7": 68.2,
                "retention_d30": 48.9,
                "premium_rate": 25.6,
                "roi": 549.8
            }
        ],
        "totals": {
            "total_users": 43716,
            "avg_cac": 2.87,
            "avg_ltv": 48.52,
            "blended_roi": 1590.6
        }
    }


@router.get("/acquisition/roi")
async def get_channel_roi(
    channel: Optional[str] = None,
    period: str = "30d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get ROI analysis by channel"""
    
    return {
        "channels": [
            {
                "channel": "Referral",
                "spend": 28470.00,
                "users_acquired": 8923,
                "revenue_generated": 602050.35,
                "cac": 3.19,
                "ltv": 67.45,
                "roi": 2014.4,
                "payback_days": 4.5
            },
            {
                "channel": "Facebook Ads",
                "spend": 30783.35,
                "users_acquired": 8923,
                "revenue_generated": 466908.82,
                "cac": 3.45,
                "ltv": 52.34,
                "roi": 1417.7,
                "payback_days": 6.2
            },
            {
                "channel": "Google Ads",
                "spend": 29804.08,
                "users_acquired": 7234,
                "revenue_generated": 353934.48,
                "cac": 4.12,
                "ltv": 48.92,
                "roi": 1087.4,
                "payback_days": 7.8
            },
            {
                "channel": "Social Media",
                "spend": 7430.40,
                "users_acquired": 3456,
                "revenue_generated": 134427.84,
                "cac": 2.15,
                "ltv": 38.90,
                "roi": 1709.3,
                "payback_days": 5.1
            },
            {
                "channel": "Influencer",
                "spend": 10489.00,
                "users_acquired": 1234,
                "revenue_generated": 68153.82,
                "cac": 8.50,
                "ltv": 55.23,
                "roi": 549.8,
                "payback_days": 12.4
            }
        ],
        "recommendations": [
            "Increase budget for Referral program - highest ROI and LTV",
            "Optimize Facebook Ads targeting - good volume but lower LTV",
            "Consider reducing Influencer spend - lowest ROI"
        ]
    }


@router.get("/attribution")
async def get_marketing_attribution(
    period: str = "30d",
    model: str = "last_touch",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Get marketing attribution data"""
    
    return {
        "model": model,
        "attribution": [
            {"channel": "Organic Search", "conversions": 1892, "revenue": 56760.08, "percentage": 22.5},
            {"channel": "Facebook Ads", "conversions": 1634, "revenue": 49020.66, "percentage": 19.4},
            {"channel": "Referral", "conversions": 1456, "revenue": 43680.44, "percentage": 17.3},
            {"channel": "Google Ads", "conversions": 1234, "revenue": 37020.66, "percentage": 14.7},
            {"channel": "Direct", "conversions": 1123, "revenue": 33690.77, "percentage": 13.4},
            {"channel": "App Store", "conversions": 678, "revenue": 20340.22, "percentage": 8.1},
            {"channel": "Social Media", "conversions": 389, "revenue": 11670.11, "percentage": 4.6}
        ],
        "multi_touch": {
            "avg_touchpoints": 2.8,
            "common_paths": [
                {"path": "Organic → Direct", "conversions": 456},
                {"path": "Facebook → Direct", "conversions": 378},
                {"path": "Google → Facebook → Direct", "conversions": 234},
                {"path": "Referral → Direct", "conversions": 189}
            ]
        }
    }


# ============================================
# GROWTH EXPERIMENTS
# ============================================

@router.get("/experiments")
async def get_growth_experiments(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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
