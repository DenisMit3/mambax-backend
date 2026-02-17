"""
Chat API Schemas
"""

from typing import Optional, List
from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    match_id: str
    text: Optional[str] = None
    type: str = "text"
    media_url: Optional[str] = None
    photo_url: Optional[str] = None  # Backwards compatibility
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    gif_id: Optional[str] = None
    reply_to_id: Optional[str] = None
    is_ephemeral: bool = False
    ephemeral_seconds: int = 10


class TypingRequest(BaseModel):
    match_id: str
    is_typing: bool


class MarkReadRequest(BaseModel):
    match_id: str
    message_ids: Optional[List[str]] = None


class MarkReadBatchRequest(BaseModel):
    match_id: str


class ReactionRequest(BaseModel):
    message_id: str
    emoji: Optional[str] = None  # None = remove reaction


class CallRequest(BaseModel):
    match_id: str
    call_type: str = "video"  # "audio" or "video"


class AnswerCallRequest(BaseModel):
    call_id: str
    accept: bool


class WebRTCSignalRequest(BaseModel):
    call_id: str
    to_user: str
    signal_type: str  # "offer", "answer", "ice-candidate"
    signal_data: dict


class QOTDAnswerRequest(BaseModel):
    match_id: str
    answer: str
