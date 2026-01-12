"""Backend services module"""

from backend.services.swipe_limits import (
    get_swipe_status,
    can_swipe,
    can_superlike,
    record_swipe,
    DAILY_SWIPE_LIMIT,
    DAILY_SUPERLIKE_LIMIT
)

from backend.services.verification import (
    start_verification,
    submit_verification,
    get_verification_status,
    VerificationStatus,
    GestureType
)

from backend.services.fraud_detection import fraud_service
from backend.services.marketing import marketing_service
from backend.services.nsfw_detection import nsfw_service
from backend.services.analytics import analytics_service
from backend.services.cache import cache_service

__all__ = [
    # Swipe limits
    "get_swipe_status",
    "can_swipe", 
    "can_superlike",
    "record_swipe",
    "DAILY_SWIPE_LIMIT",
    "DAILY_SUPERLIKE_LIMIT",
    # Verification
    "start_verification",
    "submit_verification",
    "get_verification_status",
    "VerificationStatus",
    "GestureType",
    # Admin services
    "fraud_service",
    "marketing_service",
    "nsfw_service",
    "analytics_service",
    "cache_service",
]
