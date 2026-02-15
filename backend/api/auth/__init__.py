# Auth API Package - собирает все подмодули в единый router
# Обратная совместимость: from backend.api.auth import router

from fastapi import APIRouter

from backend.api.auth.debug import router as debug_router
from backend.api.auth.register import router as register_router
from backend.api.auth.login import router as login_router

router = APIRouter(prefix="/auth", tags=["Authentication"])

router.include_router(debug_router)
router.include_router(register_router)
router.include_router(login_router)

__all__ = ["router"]
