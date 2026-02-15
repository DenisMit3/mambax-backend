# Users API Package - собирает все подмодули в единый router
# Обратная совместимость: from backend.api.users import router

from fastapi import APIRouter

from backend.api.users.profile import router as profile_router, get_current_user
from backend.api.users.photos import router as photos_router
from backend.api.users.data_export import router as data_export_router
from backend.api.users.onboarding import router as onboarding_router

router = APIRouter(prefix="/users", tags=["Users"])

router.include_router(profile_router)
router.include_router(photos_router)
router.include_router(data_export_router)
router.include_router(onboarding_router)

__all__ = ["router", "get_current_user"]
