"""
Monetization API Package

Re-exports all routers for backward compatibility:
- router: Admin monetization router (prefix=/admin/monetization)
- gifts_router: Public gifts router (prefix=/gifts)
- payments_router: Public payments router (prefix=/payments)
- dev_router: Dev-only router (prefix=/dev)
"""

# Import the shared admin router from _common
from backend.api.monetization._common import router

# Import all submodules to register their routes on `router`
from backend.api.monetization import plans  # noqa: F401
from backend.api.monetization import telegram_payments  # noqa: F401
from backend.api.monetization import transactions  # noqa: F401
from backend.api.monetization import analytics  # noqa: F401
from backend.api.monetization import boosts  # noqa: F401
from backend.api.monetization import affiliates  # noqa: F401
from backend.api.monetization import upsell  # noqa: F401
from backend.api.monetization import pricing_tests  # noqa: F401
from backend.api.monetization import promo  # noqa: F401
from backend.api.monetization import payment_gateways  # noqa: F401
from backend.api.monetization import subscriptions  # noqa: F401
from backend.api.monetization import gifts  # noqa: F401
from backend.api.monetization import public_payments  # noqa: F401
from backend.api.monetization import dev  # noqa: F401

# Re-export independent routers
from backend.api.monetization.gifts import gifts_router
from backend.api.monetization.public_payments import payments_router
from backend.api.monetization.dev import dev_router

__all__ = ["router", "gifts_router", "payments_router", "dev_router"]
