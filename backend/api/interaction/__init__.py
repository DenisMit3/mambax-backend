# Interaction API Package - собирает все подмодули в единый router
# Обратная совместимость: from backend.api.interaction import router
# Также экспортирует get_current_user_id для safety.py

from fastapi import APIRouter

from backend.api.interaction.deps import get_current_user_id
from backend.api.interaction.feed import router as feed_router
from backend.api.interaction.swipes import router as swipes_router
from backend.api.interaction.matches import router as matches_router
from backend.api.interaction.likes import router as likes_router

router = APIRouter(tags=["Feed & Swipes"])

router.include_router(feed_router)
router.include_router(swipes_router)
router.include_router(matches_router)
router.include_router(likes_router)

__all__ = ["router", "get_current_user_id"]
