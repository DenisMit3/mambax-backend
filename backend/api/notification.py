
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from datetime import datetime
from backend.db.session import async_session_maker, get_db
from backend import auth
from backend.schemas.notification import PushSubscriptionCreate, PushSubscriptionResponse
from backend.services.notification import subscribe_user, send_push_notification
from backend.config.settings import settings
from backend.models.notifications import InAppNotification
import uuid

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def get_notifications(
    page: int = 1,
    limit: int = 20,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated in-app notifications."""
    uid = uuid.UUID(current_user) if isinstance(current_user, str) else current_user
    offset = (page - 1) * limit

    # Total count
    total_stmt = select(func.count(InAppNotification.id)).where(InAppNotification.user_id == uid)
    total = (await db.execute(total_stmt)).scalar() or 0

    # Unread count
    unread_stmt = select(func.count(InAppNotification.id)).where(
        InAppNotification.user_id == uid, InAppNotification.is_read == False
    )
    unread_count = (await db.execute(unread_stmt)).scalar() or 0

    # Fetch page
    stmt = (
        select(InAppNotification)
        .where(InAppNotification.user_id == uid)
        .order_by(InAppNotification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()

    notifications = [
        {
            "id": str(n.id),
            "type": n.notification_type,
            "title": n.title,
            "body": n.body,
            "image_url": n.icon_url,
            "action_url": n.action_url,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]

    return {"notifications": notifications, "total": total, "unread_count": unread_count}


@router.post("/read-all")
async def mark_all_read(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    uid = uuid.UUID(current_user) if isinstance(current_user, str) else current_user

    stmt = (
        update(InAppNotification)
        .where(InAppNotification.user_id == uid, InAppNotification.is_read == False)
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.execute(stmt)
    await db.commit()

    return {"success": True}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    uid = uuid.UUID(current_user) if isinstance(current_user, str) else current_user
    nid = uuid.UUID(notification_id)

    stmt = (
        update(InAppNotification)
        .where(InAppNotification.id == nid, InAppNotification.user_id == uid)
        .values(is_read=True, read_at=datetime.utcnow())
    )
    result = await db.execute(stmt)
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {"success": True}


@router.post("/subscribe", response_model=PushSubscriptionResponse)
async def subscribe(
    subscription: PushSubscriptionCreate,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Subscribe user to push notifications.
    """
    return await subscribe_user(db, current_user, subscription)

@router.get("/vapid-public-key")
async def get_vapid_key():
    """
    Get VAPID public key for frontend.
    """
    return {"publicKey": settings.VAPID_PUBLIC_KEY}

@router.get("/unread-count")
async def get_unread_count(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get unread notification count for badge."""
    uid = uuid.UUID(current_user) if isinstance(current_user, str) else current_user
    stmt = select(func.count(InAppNotification.id)).where(
        InAppNotification.user_id == uid,
        InAppNotification.is_read == False,
    )
    count = (await db.execute(stmt)).scalar() or 0
    return {"unread_count": count}

@router.post("/test")
async def test_notification(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a test notification to yourself.
    """
    await send_push_notification(
        db, 
        current_user, 
        "Test Notification", 
        "This is a test message from MambaX!",
        url="/chat"
    )
    return {"status": "sent"}
