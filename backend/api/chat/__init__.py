"""
Chat API & WebSocket
===============================
Unified endpoints for real-time messaging, calling, and interactions.

This package splits the original monolithic chat.py into domain-specific modules.
Backwards-compatible: `from backend.api.chat import router` still works.
"""

from fastapi import APIRouter

from .websocket import router as ws_router
from .messages import router as messages_router
from .calls import router as calls_router
from .media import router as media_router
from .icebreakers import router as icebreakers_router
from .online import router as online_router

router = APIRouter(tags=["Chat"])

router.include_router(ws_router)
router.include_router(messages_router)
router.include_router(calls_router)
router.include_router(media_router)
router.include_router(icebreakers_router)
router.include_router(online_router)
