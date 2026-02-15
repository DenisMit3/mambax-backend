"""Email campaign routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
import uuid

from backend.database import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User
from .schemas import EmailCampaignCreate

router = APIRouter()


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
