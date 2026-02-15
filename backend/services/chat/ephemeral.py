"""
Chat - Ephemeral (disappearing) messages
"""

import uuid
from typing import Optional

from backend.services.chat.models import EphemeralMessage


async def create_ephemeral_message(match_id: str, sender_id: str, text: str = None, media_url: str = None, seconds: int = 10) -> EphemeralMessage:
    """Create a disappearing message"""
    msg = EphemeralMessage(
        id=str(uuid.uuid4()),
        match_id=match_id,
        sender_id=sender_id,
        text=text,
        media_url=media_url,
        expires_in=seconds
    )
    return msg


async def mark_ephemeral_viewed(message_id: str) -> dict:
    """Mark ephemeral message as viewed (starts countdown)"""
    return {"message_id": message_id, "status": "viewed"}
