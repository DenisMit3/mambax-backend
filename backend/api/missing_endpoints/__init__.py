# Missing Endpoints Package - собирает все подмодули в единый router
# Обратная совместимость: from backend.api.missing_endpoints import router

from fastapi import APIRouter

from backend.api.missing_endpoints.feedback import router as feedback_router
from backend.api.missing_endpoints.social import router as social_router
from backend.api.missing_endpoints.content import router as content_router

router = APIRouter(tags=["Missing Endpoints"])

router.include_router(feedback_router)
router.include_router(social_router)
router.include_router(content_router)

__all__ = ["router"]
