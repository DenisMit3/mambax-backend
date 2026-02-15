"""Campaign management routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
import uuid

from backend.database import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User
from .schemas import CampaignCreate

router = APIRouter()


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
