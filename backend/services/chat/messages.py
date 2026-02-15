"""
Chat - Message helpers, reactions, GIFs, typing, mark_as_read
"""

import uuid
import logging
from typing import Optional, List

from backend.services.chat.state import state_manager
from backend.db.session import async_session_maker
from backend.crud import chat as crud_chat

logger = logging.getLogger(__name__)


async def set_typing(match_id: str, user_id: str, is_typing: bool):
    await state_manager.set_typing(match_id, user_id, is_typing)


async def get_typing_users(match_id: str, exclude_user_id: str = None) -> List[str]:
    """Proper async implementation for typing users"""
    return await state_manager.get_typing_users(match_id, exclude_user_id)


async def mark_as_read(match_id: str, user_id: str, message_ids: List[str] = None):
    await state_manager.clear_unread(user_id, match_id)
    
    updated_ids = []
    async with async_session_maker() as db:
        reader_uuid = uuid.UUID(user_id)
        
        if message_ids:
            msg_uuids = [uuid.UUID(mid) for mid in message_ids]
            count = await crud_chat.mark_messages_as_read(db, msg_uuids, reader_uuid)
            if count > 0:
                updated_ids = message_ids
        else:
            # Mark all unread in match as read
            from sqlalchemy import select
            from backend.models.chat import Message
            
            stmt = select(Message.id).where(
                Message.match_id == uuid.UUID(match_id),
                Message.receiver_id == reader_uuid,
                Message.is_read == False
            )
            result = await db.execute(stmt)
            unread_ids = [str(row) for row in result.scalars().all()]
            
            if unread_ids:
                msg_uuids = [uuid.UUID(mid) for mid in unread_ids]
                count = await crud_chat.mark_messages_as_read(db, msg_uuids, reader_uuid)
                if count > 0:
                    updated_ids = unread_ids

    return {"status": "ok", "updated_ids": updated_ids}


async def add_reaction(message_id: str, user_id: str, emoji: str) -> dict:
    """Add reaction to a message"""
    return {"type": "reaction", "message_id": message_id, "user_id": user_id, "emoji": emoji, "action": "add"}


async def remove_reaction(message_id: str, user_id: str) -> dict:
    """Remove reaction from a message"""
    return {"type": "reaction", "message_id": message_id, "user_id": user_id, "action": "remove"}


async def search_gifs(query: str, limit: int = 20, offset: int = 0) -> dict:
    """Search GIFs via Giphy/Tenor API"""
    return {"gifs": [], "query": query}


async def get_trending_gifs(limit: int = 20) -> dict:
    """Get trending GIFs"""
    return {"gifs": []}


async def create_text_message(match_id: str, sender_id: str, text: str) -> dict:
    """Create a text message"""
    return {"type": "text", "match_id": match_id, "sender_id": sender_id, "text": text}


async def create_photo_message(match_id: str, sender_id: str, photo_url: str) -> dict:
    """Create a photo message"""
    return {"type": "photo", "match_id": match_id, "sender_id": sender_id, "photo_url": photo_url}


async def create_voice_message(match_id: str, sender_id: str, audio_url: str, duration: int) -> dict:
    """Create a voice message"""
    return {"type": "voice", "match_id": match_id, "sender_id": sender_id, "audio_url": audio_url, "duration": duration}
