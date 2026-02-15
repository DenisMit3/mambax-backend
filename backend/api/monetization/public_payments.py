"""
Public Payments API — top-up, subscription purchase, swipes/superlikes/boosts purchase, pricing.
"""

from pydantic import BaseModel as PydanticBaseModel
from backend.api.monetization._common import *


class TopUpRequest(PydanticBaseModel):
    amount: int  # Amount of stars to purchase
    label: str = "Top Up"  # Optional label for the invoice

class TopUpResponse(PydanticBaseModel):
    invoice_link: str
    amount: int
    transaction_id: uuid.UUID


payments_router = APIRouter(prefix="/payments", tags=["payments"])


@payments_router.post("/top-up", response_model=TopUpResponse)
async def create_top_up_invoice(
    request: TopUpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """
    Create a Telegram Stars invoice for topping up balance.
    
    In production, this calls the Telegram Bot API to create an invoice link.
    The user then pays via Telegram, and the webhook confirms the payment.
    """
    user_id = uuid.UUID(current_user)
    
    # 0. Rate Limiting (Anti-Spam)
    recent_count_stmt = select(func.count(RevenueTransaction.id)).where(
        and_(
            RevenueTransaction.user_id == user_id,
            RevenueTransaction.created_at > datetime.utcnow() - timedelta(minutes=5),
        )
    )
    recent_count = (await db.execute(recent_count_stmt)).scalar() or 0
    
    if recent_count > 3:
        raise HTTPException(
            status_code=429, 
            detail="Too many payment requests. Please wait a few minutes."
        )

    # Validate amount
    valid_amounts = [50, 100, 250, 500]
    if request.amount not in valid_amounts:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid amount. Choose from: {valid_amounts}"
        )
    
    # 1. Create pending transaction and COMMIT immediately
    transaction_id = None
    async with db.begin():
        transaction = RevenueTransaction(
            user_id=user_id,
            transaction_type="top_up",
            amount=request.amount,
            currency="XTR",
            status="pending",
            payment_gateway="telegram_stars",
            custom_metadata={"purchase_type": "stars_top_up"}
        )
        db.add(transaction)
        await db.flush()
        transaction_id = transaction.id

    # 2. Network call (outside DB transaction block)
    from backend.services.telegram_payments import create_stars_invoice
    
    invoice_link = await create_stars_invoice(
        title=f"{request.amount} Telegram Stars",
        description=f"Top up your balance with {request.amount} Stars",
        payload=str(transaction_id),
        amount=request.amount
    )
    
    # 3. Handle failure
    if not invoice_link:
        from backend.core.config import settings
        if settings.ENVIRONMENT == "development":
            invoice_link = f"https://t.me/$stars_topup_{transaction_id}"
        else:
            async with db.begin():
                tx = await db.get(RevenueTransaction, transaction_id)
                if tx: tx.status = "failed"
            raise HTTPException(
                status_code=500,
                detail="Failed to create payment invoice. Please try again."
            )
    
    # Trigger Admin update
    await redis_manager.publish("admin_updates", {"type": "invoice_created", "amount": request.amount})
    
    return TopUpResponse(
        invoice_link=invoice_link,
        amount=request.amount,
        transaction_id=transaction_id
    )


# ============================================
# SUBSCRIPTION PURCHASE API
# ============================================

from backend.services.monetization import buy_subscription_with_stars


class SubscriptionRequest(PydanticBaseModel):
    tier: str  # gold, platinum

class SubscriptionResponse(PydanticBaseModel):
    success: bool
    plan: Optional[str] = None
    tier: Optional[str] = None
    expires_at: Optional[str] = None
    new_balance: Optional[Decimal] = None
    error: Optional[str] = None
    required: Optional[int] = None
    available: Optional[int] = None


@payments_router.post("/subscription", response_model=SubscriptionResponse)
async def buy_subscription(
    request: SubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """Purchase a subscription with Telegram Stars."""
    user_id = uuid.UUID(current_user)
    result = await buy_subscription_with_stars(db, user_id, request.tier)
    return SubscriptionResponse(**result)


# ============================================
# SWIPES/SUPERLIKES/BOOSTS PURCHASE API
# ============================================

from backend.services.swipe_limits import (
    buy_swipes_with_stars, buy_superlike_with_stars, 
    activate_boost_with_stars, get_swipe_status,
    STARS_PER_SWIPE_PACK, SWIPES_PER_PACK, STARS_PER_SUPERLIKE, STARS_PER_BOOST
)


class BuySwipesResponse(PydanticBaseModel):
    success: bool
    purchased: Optional[int] = None
    cost: Optional[int] = None
    new_balance: Optional[int] = None
    total_bonus_swipes: Optional[int] = None
    error: Optional[str] = None
    required: Optional[int] = None
    available: Optional[int] = None


class BoostRequest(PydanticBaseModel):
    duration_hours: int = 1


class BoostResponse(PydanticBaseModel):
    success: bool
    boost_until: Optional[str] = None
    duration_hours: Optional[int] = None
    cost: Optional[int] = None
    new_balance: Optional[int] = None
    error: Optional[str] = None


@payments_router.post("/buy-swipes", response_model=BuySwipesResponse)
async def buy_swipes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Купить пакет из 10 свайпов за 10 Telegram Stars."""
    result = await buy_swipes_with_stars(db, str(current_user.id))
    return BuySwipesResponse(**result)


@payments_router.post("/buy-superlike", response_model=BuySwipesResponse)
async def buy_superlike(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Купить 1 супер-лайк за 5 Telegram Stars."""
    result = await buy_superlike_with_stars(db, str(current_user.id))
    return BuySwipesResponse(**result)


@payments_router.post("/activate-boost", response_model=BoostResponse)
async def activate_boost(
    request: BoostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Активировать буст профиля за Telegram Stars. 25 Stars за 1 час."""
    result = await activate_boost_with_stars(db, str(current_user.id), request.duration_hours)
    return BoostResponse(**result)


@payments_router.get("/swipe-status")
async def get_swipe_status_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Получить текущий статус свайпов пользователя."""
    return await get_swipe_status(db, str(current_user.id))


@payments_router.get("/pricing")
async def get_pricing():
    """Получить текущие цены на свайпы, супер-лайки и бусты."""
    return {
        "swipe_pack": {
            "price": STARS_PER_SWIPE_PACK,
            "count": SWIPES_PER_PACK,
            "currency": "XTR"
        },
        "superlike": {
            "price": STARS_PER_SUPERLIKE,
            "count": 1,
            "currency": "XTR"
        },
        "boost": {
            "price_per_hour": STARS_PER_BOOST,
            "currency": "XTR"
        },
        "top_up_packages": [
            {"stars": 50, "label": "Starter"},
            {"stars": 100, "label": "Basic"},
            {"stars": 250, "label": "Popular"},
            {"stars": 500, "label": "Best Value"}
        ]
    }


@payments_router.get("/transaction/{transaction_id}/status")
async def check_transaction_status(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Check status of a specific transaction. User can only check their own."""
    transaction = await db.get(RevenueTransaction, transaction_id)
    
    if not transaction or str(transaction.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {
        "status": transaction.status,
        "amount": transaction.amount,
        "completed_at": transaction.completed_at,
        "currency": transaction.currency
    }
