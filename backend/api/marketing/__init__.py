"""
Marketing & Growth API Routes

Comprehensive API for marketing automation including:
- Campaign management
- Push notifications
- Email marketing
- Referral programs
- Attribution tracking
- Growth experiments
"""

from fastapi import APIRouter

from .campaigns import router as campaigns_router
from .push import router as push_router
from .email import router as email_router
from .referrals import router as referrals_router
from .channels import router as channels_router
from .experiments import router as experiments_router
from .seo import router as seo_router

router = APIRouter(prefix="/admin/marketing", tags=["marketing"])

router.include_router(campaigns_router)
router.include_router(push_router)
router.include_router(email_router)
router.include_router(referrals_router)
router.include_router(channels_router)
router.include_router(experiments_router)
router.include_router(seo_router)

__all__ = ["router"]
