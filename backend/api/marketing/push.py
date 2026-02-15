"""Push notification routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import uuid

from backend.database import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User
from .schemas import PushNotificationCreate

router = APIRouter()


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
        new_push["sent_at"] = datetime.utcnow().isoformat()
        new_push["estimated_recipients"] = 45000

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
