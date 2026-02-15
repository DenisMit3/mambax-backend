"""
Dev-only endpoints (disabled in production).
"""

from pydantic import BaseModel as PydanticBaseModel
from backend.api.monetization._common import *


class DevAddStarsRequest(PydanticBaseModel):
    amount: int


dev_router = APIRouter(prefix="/dev", tags=["dev"])


@dev_router.post("/add-stars")
async def dev_add_stars(
    request: DevAddStarsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """
    DEV ONLY: Add stars to user balance without payment.
    This endpoint should be disabled in production.
    """
    # Only allow in development
    if os.getenv("ENVIRONMENT", "development") == "production":
        raise HTTPException(status_code=403, detail="Not available in production")
    
    user_id = uuid.UUID(current_user)
    user = await db.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add stars
    old_balance = user.stars_balance or Decimal("0")
    user.stars_balance = old_balance + Decimal(str(request.amount))
    
    # Log the transaction
    transaction = RevenueTransaction(
        user_id=user_id,
        transaction_type="dev_credit",
        amount=request.amount,
        currency="XTR",
        status="completed",
        payment_gateway="dev",
        custom_metadata={"dev_add": True}
    )
    db.add(transaction)
    
    await db.commit()
    
    return {
        "success": True,
        "old_balance": old_balance,
        "added": request.amount,
        "new_balance": user.stars_balance
    }
