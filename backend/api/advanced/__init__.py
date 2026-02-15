# Advanced API Package - собирает все подмодули в единый router
# Обратная совместимость: from backend.api.advanced import router

from fastapi import APIRouter

from backend.api.advanced.ai import router as ai_router
from backend.api.advanced.algorithm import router as algorithm_router
from backend.api.advanced.events_partners import router as events_partners_router
from backend.api.advanced.reports_analytics import router as reports_analytics_router

router = APIRouter(prefix="/admin/advanced", tags=["advanced"])

router.include_router(ai_router)
router.include_router(algorithm_router)
router.include_router(events_partners_router)
router.include_router(reports_analytics_router)

__all__ = ["router"]
