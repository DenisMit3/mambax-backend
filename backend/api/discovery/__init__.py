"""
Discovery & Profiles API Package
=================================
Разбит на подмодули:
- profiles: CRUD профилей, загрузка фото, геолокация
- discover: поиск, фильтры, daily picks, smart filters
- pagination: курсорная пагинация матчей и сообщений
"""
from fastapi import APIRouter

from backend.api.discovery.profiles import router as profiles_router
from backend.api.discovery.discover import router as discover_router
from backend.api.discovery.pagination import router as pagination_router

router = APIRouter()
router.include_router(profiles_router)
router.include_router(discover_router)
router.include_router(pagination_router)

__all__ = ["router"]
