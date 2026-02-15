from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from backend.models.user import User
from backend.models.monetization import VirtualGift, GiftTransaction, RevenueTransaction
from backend.models.interaction import Match
from backend.models.chat import Message
from backend.services.chat import manager
from backend.services.notification import send_push_notification
import logging

logger = logging.getLogger(__name__)

async def deliver_gift(
    db: AsyncSession,
    sender_id: UUID,
    receiver_id: UUID,
    gift_id: UUID,
    message: str | None,
    is_anonymous: bool,
    price_paid: float,
    currency: str = "XTR",
    payment_transaction_id: UUID | None = None
) -> GiftTransaction:
    """
    Deliver a gift to the receiver:
    1. Credit bonus to receiver
    2. Create GiftTransaction
    3. Update Gift Stats
    4. Send Notifications (WS, Push, Chat)
    """
    
    # 1. Fetch Gift
    gift = await db.get(VirtualGift, gift_id)
    if not gift:
        raise ValueError("Gift not found")

    sender = await db.get(User, sender_id)
    receiver = await db.get(User, receiver_id)
    if not receiver:
        raise ValueError("Receiver not found")

    # 2. Credit receiver with 10% bonus
    receiver_bonus = int(price_paid * 0.1)
    if receiver_bonus > 0:
        receiver.stars_balance = (receiver.stars_balance or 0) + receiver_bonus

    # 3. Create Gift Transaction
    transaction = GiftTransaction(
        sender_id=sender_id,
        receiver_id=receiver_id,
        gift_id=gift_id,
        price_paid=price_paid,
        currency=currency,
        message=message,
        status="completed",
        is_anonymous=is_anonymous,
        payment_transaction_id=payment_transaction_id
    )
    db.add(transaction)

    # 4. Update Gift Stats
    gift.times_sent += 1
    
    # Commit to generate IDs
    await db.commit()
    await db.refresh(transaction)

    # 5. Send WebSocket Notification
    notification = {
        "type": "gift_received",
        "transaction_id": str(transaction.id),
        "gift_id": str(gift.id),
        "gift_name": gift.name,
        "gift_image": gift.image_url,
        "sender_id": str(sender_id) if not is_anonymous else None,
        "sender_name": sender.name if sender and not is_anonymous else "Anonymous",
        "sender_photo": sender.photos[0] if sender and sender.photos and not is_anonymous else None,
        "message": message,
        "bonus_received": receiver_bonus,
        "timestamp": transaction.created_at.isoformat()
    }
    
    is_receiver_online = manager.is_online(str(receiver_id))
    if is_receiver_online:
        await manager.send_personal(str(receiver_id), notification)

    # 6. Send Push Notification (if offline or always?)
    if not is_receiver_online:
        try:
            sender_display = "Someone" if is_anonymous else (sender.name if sender else "A user")
            bonus_text = f" (+{receiver_bonus} ⭐)" if receiver_bonus > 0 else ""
            await send_push_notification(
                db=db,
                user_id=str(receiver_id),
                title=f"🎁 {sender_display} sent you a gift!",
                body=f"You received a {gift.name}{bonus_text}",
                url="/gifts",
                tag=f"gift_{transaction.id}"
            )
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")

    # 7. Create Chat Message (History)
    match_stmt = select(Match).where(
        and_(
            Match.is_active == True,
            or_(
                and_(Match.user1_id == sender_id, Match.user2_id == receiver_id),
                and_(Match.user1_id == receiver_id, Match.user2_id == sender_id)
            )
        )
    )
    match = (await db.execute(match_stmt)).scalar_one_or_none()

    if match:
        gift_message = Message(
            match_id=match.id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            text=f"🎁 Sent a gift: {gift.name}",
            type="gift",
            photo_url=gift.image_url,
        )
        db.add(gift_message)
        await db.commit()
        await db.refresh(gift_message)

        # Send via WS as chat message
        gift_chat_message = {
            "type": "gift",
            "message_id": str(gift_message.id),
            "sender_id": str(sender_id),
            "match_id": str(match.id),
            "receiver_id": str(receiver_id),
            "content": gift_message.text,
            "photo_url": gift.image_url,
            "gift_name": gift.name,
            "gift_id": str(gift.id),
            "timestamp": gift_message.created_at.isoformat(),
            "is_anonymous": is_anonymous
        }
        await manager.send_personal(str(receiver_id), gift_chat_message)

    # 8. Notify Sender of Success (for UI update)
    success_notification = {
        "type": "gift_sent_success",
        "transaction_id": str(transaction.id),
        "gift_id": str(gift.id),
        "gift_name": gift.name,
        "receiver_name": receiver.name if receiver else "User",
        "timestamp": transaction.created_at.isoformat()
    }
    await manager.send_personal(str(sender_id), success_notification)

    return transaction
