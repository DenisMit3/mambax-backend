"""
Unified Notification Dispatcher
================================
Creates in-app notifications + sends push (Web Push) + sends WS event.
All notification triggers go through this module.
"""

import logging
import uuid
from typing import Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.notifications import InAppNotification, UserNotificationPreference
from backend.services.notification import send_push_notification
from backend.services.chat.connections import manager
from backend.db.session import async_session_maker

logger = logging.getLogger(__name__)


async def _get_user_pref(db: AsyncSession, user_id: str) -> Optional[UserNotificationPreference]:
    from sqlalchemy import select
    result = await db.execute(
        select(UserNotificationPreference).where(
            UserNotificationPreference.user_id == uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        )
    )
    return result.scalars().first()


async def _create_in_app(
    db: AsyncSession,
    user_id: str,
    notification_type: str,
    title: str,
    body: str,
    action_url: Optional[str] = None,
    related_user_id: Optional[str] = None,
) -> InAppNotification:
    uid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    related = uuid.UUID(related_user_id) if related_user_id else None

    notif = InAppNotification(
        user_id=uid,
        notification_type=notification_type,
        title=title,
        body=body,
        action_url=action_url,
        related_user_id=related,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif


async def _send_ws_event(user_id: str, event_type: str, data: dict):
    """Send real-time WS event if user is online."""
    try:
        await manager.send_personal(user_id, {"type": event_type, **data})
    except Exception as e:
        logger.debug(f"WS send failed for {user_id}: {e}")


async def notify_new_like(
    db: AsyncSession,
    liked_user_id: str,
    liker_user_id: str,
    liker_name: str = "Кто-то",
    is_super: bool = False,
):
    """Notify user that someone liked them."""
    pref = await _get_user_pref(db, liked_user_id)
    if pref and not pref.new_like:
        return

    emoji = "⭐" if is_super else "❤️"
    title = f"{emoji} {'Super Like!' if is_super else 'Новый лайк!'}"
    body = f"{liker_name} {'поставил(а) вам Super Like!' if is_super else 'лайкнул(а) вас!'}"

    notif = await _create_in_app(
        db, liked_user_id, "superlike" if is_super else "like",
        title, body,
        action_url="/likes",
        related_user_id=liker_user_id,
    )

    # WS event
    await _send_ws_event(liked_user_id, "new_like", {
        "notification_id": str(notif.id),
        "from_user_id": liker_user_id,
        "is_super": is_super,
    })

    # Push if offline
    if not await manager.is_online_async(liked_user_id):
        await send_push_notification(
            db, liked_user_id, title, body,
            url="/likes", tag="like"
        )


async def notify_new_match(
    db: AsyncSession,
    user_id: str,
    partner_id: str,
    partner_name: str = "Кто-то",
    match_id: Optional[str] = None,
):
    """Notify BOTH users about a new match."""
    for target_id, other_name in [(user_id, partner_name), (partner_id, partner_name)]:
        pref = await _get_user_pref(db, target_id)
        if pref and not pref.new_match:
            continue

        title = "💕 Новый матч!"
        body = f"Вы понравились друг другу! Напишите первым!"
        chat_url = f"/chat/{match_id}" if match_id else "/chat"

        notif = await _create_in_app(
            db, target_id, "match", title, body,
            action_url=chat_url,
            related_user_id=partner_id if target_id == user_id else user_id,
        )

        await _send_ws_event(target_id, "new_match", {
            "notification_id": str(notif.id),
            "match_id": match_id or "",
            "partner_id": partner_id if target_id == user_id else user_id,
        })

        if not await manager.is_online_async(target_id):
            await send_push_notification(
                db, target_id, title, body,
                url=chat_url, tag="match"
            )


async def notify_new_message(
    db: AsyncSession,
    recipient_id: str,
    sender_id: str,
    sender_name: str = "Кто-то",
    message_preview: str = "Новое сообщение",
    match_id: Optional[str] = None,
):
    """Notify user about a new message (only if offline — WS handles online)."""
    if await manager.is_online_async(recipient_id):
        return  # WS already delivers the message in real-time

    pref = await _get_user_pref(db, recipient_id)
    if pref and not pref.new_message:
        return

    title = f"💬 {sender_name}"
    body = message_preview[:100]
    chat_url = f"/chat/{match_id}" if match_id else "/chat"

    await _create_in_app(
        db, recipient_id, "message", title, body,
        action_url=chat_url,
        related_user_id=sender_id,
    )

    await send_push_notification(
        db, recipient_id, title, body,
        url=chat_url, tag=f"msg-{match_id}"
    )


async def notify_gift_received(
    db: AsyncSession,
    recipient_id: str,
    sender_id: str,
    sender_name: str = "Кто-то",
    gift_name: str = "подарок",
):
    """Notify user about a received gift."""
    pref = await _get_user_pref(db, recipient_id)
    if pref and not pref.gift_received:
        return

    title = "🎁 Новый подарок!"
    body = f"{sender_name} отправил(а) вам {gift_name}!"

    notif = await _create_in_app(
        db, recipient_id, "gift", title, body,
        action_url="/chat",
        related_user_id=sender_id,
    )

    await _send_ws_event(recipient_id, "gift_received", {
        "notification_id": str(notif.id),
        "from_user_id": sender_id,
        "gift_name": gift_name,
    })

    if not await manager.is_online_async(recipient_id):
        await send_push_notification(
            db, recipient_id, title, body,
            url="/chat", tag="gift"
        )
