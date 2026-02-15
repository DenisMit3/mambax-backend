"""
Admin API package — aggregates all admin sub-routers into a single router.
"""

from fastapi import APIRouter
from typing import Dict, Set

from .deps import get_current_admin
from .dashboard import router as dashboard_router
from .users import router as users_router
from .verification import router as verification_router
from .moderation import router as moderation_router
from .analytics import router as analytics_router
from .monetization import router as monetization_router
from .marketing import router as marketing_router
from .security import router as security_router
from .notifications import router as notifications_router
from .user_details import router as user_details_router
from .websocket import router as websocket_router, admin_ws_manager, send_admin_update

router = APIRouter(prefix="/admin", tags=["admin"])

# Shadow chat observers: {match_id: set(websocket)}
shadow_chat_observers: Dict[str, Set] = {}

# Include all sub-routers
router.include_router(dashboard_router)
router.include_router(users_router)
router.include_router(verification_router)
router.include_router(moderation_router)
router.include_router(analytics_router)
router.include_router(monetization_router)
router.include_router(marketing_router)
router.include_router(security_router)
router.include_router(notifications_router)
router.include_router(user_details_router)
router.include_router(websocket_router)

__all__ = [
    "router",
    "get_current_admin",
    "shadow_chat_observers",
    "admin_ws_manager",
    "send_admin_update",
]
