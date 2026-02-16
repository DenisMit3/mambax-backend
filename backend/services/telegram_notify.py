"""
Telegram Bot API notifications for offline users.
Sends messages via bot when user is not connected to WebSocket.
"""

import logging
import aiohttp
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from backend.config.settings import settings

logger = logging.getLogger(__name__)

FRONTEND_URL = "https://frontend-two-brown-70.vercel.app"


async def send_telegram_notification(
    chat_id: str,
    text: str,
    reply_markup: Optional[dict] = None,
) -> bool:
    """Send a message to a Telegram user via Bot API."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not configured, skipping TG notification")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=payload) as resp:
                if resp.status == 200:
                    return True
                else:
                    body = await resp.text()
                    logger.error(f"TG notify failed ({resp.status}): {body}")
                    return False
        except Exception as e:
            logger.error(f"TG notify error: {e}")
            return False


async def notify_user_new_message(
    db: AsyncSession,
    recipient_id: str,
    sender_id: str,
    sender_name: str = "Кто-то",
    message_preview: str = "Новое сообщение",
    match_id: Optional[str] = None,
):
    """
    Send Telegram notification about a new chat message.
    Looks up recipient's telegram_id and sends via Bot API.
    """
    from backend.models.user import User

    try:
        recipient = await db.get(User, UUID(recipient_id))
        if not recipient or not recipient.telegram_id:
            logger.debug(f"No telegram_id for user {recipient_id}, skipping TG notify")
            return False

        preview = message_preview[:80] if message_preview else "Новое сообщение"
        text = f"💬 <b>{sender_name}</b>\n{preview}"

        # Button to open chat in Mini App
        reply_markup = None
        if match_id:
            reply_markup = {
                "inline_keyboard": [[{
                    "text": "💬 Открыть чат",
                    "web_app": {"url": f"{FRONTEND_URL}/chat/{match_id}"}
                }]]
            }

        return await send_telegram_notification(
            chat_id=recipient.telegram_id,
            text=text,
            reply_markup=reply_markup,
        )
    except Exception as e:
        logger.error(f"notify_user_new_message error: {e}")
        return False
