"""
Chat REST endpoints: calls and WebRTC signaling.
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.chat import (
    initiate_call,
    answer_call,
    end_call,
    send_webrtc_signal,
    create_ephemeral_message,
    mark_ephemeral_viewed,
)
from backend import database, auth

from .schemas import CallRequest, AnswerCallRequest, WebRTCSignalRequest

router = APIRouter(tags=["Chat"])


@router.post("/chat/call/initiate")
async def initiate_call_endpoint(
    req: CallRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    from backend.models.interaction import Match
    match_obj = await db.get(Match, UUID(req.match_id))
    if not match_obj:
        raise HTTPException(404, "Match not found")

    user1, user2 = str(match_obj.user1_id), str(match_obj.user2_id)
    callee_id = user2 if current_user == user1 else user1

    call = await initiate_call(req.match_id, current_user, callee_id, req.call_type)
    return {"call": call.model_dump()}


@router.post("/chat/call/answer")
async def answer_call_endpoint(req: AnswerCallRequest, current_user: str = Depends(auth.get_current_user)):
    return await answer_call(req.call_id, current_user, req.accept)


@router.post("/chat/call/end")
async def end_call_endpoint(call_id: str = Query(...), current_user: str = Depends(auth.get_current_user)):
    return await end_call(call_id, current_user)


@router.post("/chat/call/signal")
async def send_signal_endpoint(req: WebRTCSignalRequest, current_user: str = Depends(auth.get_current_user)):
    return await send_webrtc_signal(req.call_id, current_user, req.to_user, req.signal_type, req.signal_data)


@router.post("/chat/ephemeral/send")
async def send_ephemeral_endpoint(
    match_id: str,
    media_url: Optional[str] = None,
    text: Optional[str] = None,
    seconds: int = 10,
    current_user: str = Depends(auth.get_current_user)
):
    msg = await create_ephemeral_message(match_id, current_user, text, media_url, seconds)
    return {"message": msg.model_dump()}


@router.post("/chat/ephemeral/viewed/{message_id}")
async def viewed_ephemeral_endpoint(message_id: str, current_user: str = Depends(auth.get_current_user)):
    return await mark_ephemeral_viewed(message_id)
