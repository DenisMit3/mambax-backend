
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import async_session_maker, get_db
from backend import auth
from backend.schemas.notification import PushSubscriptionCreate, PushSubscriptionResponse
from backend.services.notification import subscribe_user, send_push_notification
from backend.config.settings import settings

router = APIRouter(prefix="/notifications", tags=["Notifications"])

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
