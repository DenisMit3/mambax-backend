
import json
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
from pywebpush import webpush, WebPushException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import PushSubscription
from backend.config.settings import settings

logger = logging.getLogger(__name__)

# Executor for blocking pywebpush calls
executor = ThreadPoolExecutor(max_workers=10)

def _send_webpush_sync(subscription_info, data, private_key, claims):
    return webpush(
        subscription_info=subscription_info,
        data=data,
        vapid_private_key=private_key,
        vapid_claims=claims
    )

async def send_push_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    body: str,
    url: str = "/",
    icon: str = "/icon-192x192.png",
    tag: str = None
):
    """
    Send push notification to all user's subscriptions.
    """
    if not settings.VAPID_PRIVATE_KEY:
        logger.warning("VAPID keys not configured. Skipping push notification.")
        return

    # Get user subscriptions
    # Note: We need a fresh session or passed session needs to remain open. 
    # Usually this is called within a request context or background task with its own session.
    # If passed 'db', we assume it's valid.
    
    try:
        result = await db.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))
        subscriptions = result.scalars().all()

        if not subscriptions:
            return

        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url,
            "icon": icon,
            "tag": tag
        })
        
        loop = asyncio.get_event_loop()

        for sub in subscriptions:
            try:
                subscription_info = {
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth
                    }
                }
                
                # Run sync webpush in executor
                await loop.run_in_executor(
                    executor, 
                    _send_webpush_sync, 
                    subscription_info, 
                    payload, 
                    settings.VAPID_PRIVATE_KEY, 
                    {"sub": settings.VAPID_CLAIMS_EMAIL}
                )
                
            except WebPushException as ex:
                logger.error(f"WebPush failed: {repr(ex)}")
                if ex.response and ex.response.status_code == 410:
                    # Subscription expired/invalid - Delete it
                    # Note: modifying DB in loop with passed session might be tricky if session is used elsewhere
                    # safely we just try delete
                    try:
                        await db.delete(sub)
                        await db.commit()
                    except:
                        await db.rollback()
            except Exception as e:
                logger.error(f"Push error: {e}")

    except Exception as e:
        logger.error(f"Error fetching subscriptions for {user_id}: {e}")

async def subscribe_user(
    db: AsyncSession,
    user_id: str,
    subscription_data: dict
):
    """
    Save user subscription.
    subscription_data matches PushSubscriptionCreate schema.
    """
    endpoint = subscription_data.endpoint
    keys = subscription_data.keys
    
    # Check existence
    result = await db.execute(select(PushSubscription).where(
        PushSubscription.endpoint == endpoint
    ))
    existing = result.scalars().first()
    
    if existing:
        # Update user_id if changed (unlikely but possible)
        if existing.user_id != user_id:
            existing.user_id = user_id
            await db.commit()
        return existing
    
    new_sub = PushSubscription(
        user_id=user_id,
        endpoint=endpoint,
        p256dh=keys.p256dh,
        auth=keys.auth
    )
    db.add(new_sub)
    await db.commit()
    await db.refresh(new_sub)
    return new_sub
async def send_daily_picks_notification(db: AsyncSession, user_id: str):
    """
    Отправить уведомление о готовности новой подборки (запускается cron в 9:00 UTC)
    """
    from backend.services.push_notifications import send_push_to_users
    import uuid
    
    try:
        u_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        await send_push_to_users(
            db=db,
            user_ids=[u_id],
            title="🌟 Новая подборка готова!",
            body="Мы подобрали для вас 5 идеальных совпадений",
            data={"route": "/discover"}
        )
    except Exception as e:
        logger.error(f"Failed to send daily picks notification to {user_id}: {e}")
