"""
Chat REST endpoints: media upload, voice, GIFs, reactions.
"""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.chat import (
    AVAILABLE_REACTIONS,
    add_reaction,
    remove_reaction,
    search_gifs,
    get_trending_gifs,
)
from backend import database, auth

from .schemas import ReactionRequest

router = APIRouter(tags=["Chat"])


@router.get("/chat/reactions")
async def get_reactions_endpoint():
    return {"reactions": AVAILABLE_REACTIONS}


@router.post("/chat/reaction")
async def reaction_endpoint(req: ReactionRequest, current_user: str = Depends(auth.get_current_user)):
    if req.emoji:
        return await add_reaction(req.message_id, current_user, req.emoji)
    else:
        return await remove_reaction(req.message_id, current_user)


@router.post("/chat/upload")
async def upload_chat_media(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(database.get_db),
    current_user: str = Depends(auth.get_current_user)
):
    from backend.services.storage import storage_service
    url = await storage_service.save_gift_image(file, db)
    return {"url": url, "type": file.content_type}


@router.post("/chat/voice")
async def upload_voice_message(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(database.get_db),
    current_user: str = Depends(auth.get_current_user)
):
    from backend.services.storage import storage_service
    url, duration = await storage_service.save_voice_message(file, db)
    return {"url": url, "duration": duration}


@router.get("/chat/gifs/search")
async def search_gifs_endpoint(q: str, limit: int = 20, offset: int = 0):
    return await search_gifs(q, limit, offset)


@router.get("/chat/gifs/trending")
async def trending_gifs_endpoint(limit: int = 20):
    return await get_trending_gifs(limit)
