from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User
from backend.models.monetization import SubscriptionPlan, UserSubscription, RevenueTransaction

async def get_or_create_default_plans(db: AsyncSession):
    """Ensure default subscription plans exist in DB."""
    # This should be a separate migration/seed, but for now we make it robust
    async with db.begin_nested():
        gold = await db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.tier == "gold"))
        if not gold:
            db.add(SubscriptionPlan(
                tier="gold", name="Gold Membership", price=500, currency="XTR", 
                duration_days=30, unlimited_swipes=True, is_active=True
            ))
        
        platinum = await db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.tier == "platinum"))
        if not platinum:
            db.add(SubscriptionPlan(
                tier="platinum", name="Platinum Membership", price=1000, currency="XTR", 
                duration_days=30, unlimited_swipes=True, priority_listing=True,
                see_who_likes_you=True, is_active=True
            ))
    try:
        await db.commit()
    except:
        await db.rollback()

async def buy_subscription_with_stars(db: AsyncSession, user_id: uuid.UUID, tier: str) -> Dict[str, Any]:
    """
    Buy a subscription plan with Telegram Stars using an ATOMIC TRANSACTION.
    """
    # 1. Атомарный блок (savepoint — безопасно внутри существующей транзакции)
    try:
        async with db.begin_nested():
            # Get plan
            plan = await db.scalar(
                select(SubscriptionPlan)
                .where(SubscriptionPlan.tier == tier, SubscriptionPlan.is_active == True)
            )
            if not plan: return {"success": False, "error": "plan_not_found"}
            
            # Get User with FOR UPDATE to prevent race conditions on balance
            result = await db.execute(
                select(User).where(User.id == user_id).with_for_update()
            )
            user = result.scalar_one_or_none()
            if not user: return {"success": False, "error": "user_not_found"}
                
            # Check Balance
            balance = user.stars_balance or Decimal("0")
            if balance < plan.price:
                return {
                    "success": False, "error": "insufficient_balance", 
                    "required": int(plan.price), "available": int(balance)
                }
            
            # ATOMIC UPDATES
            user.stars_balance = balance - plan.price
            user.subscription_tier = tier
            
            now = datetime.utcnow()
            expires_at = now + timedelta(days=plan.duration_days)
            
            subscription = UserSubscription(
                user_id=user_id, plan_id=plan.id, status="active",
                started_at=now, expires_at=expires_at, auto_renew=True,
                payment_method="stars"
            )
            db.add(subscription)
            await db.flush() # Get ID
            
            transaction = RevenueTransaction(
                user_id=user_id, transaction_type="subscription", amount=plan.price,
                currency="XTR", status="completed", payment_method="stars",
                payment_gateway="internal", subscription_id=subscription.id,
                custom_metadata={"plan_tier": tier, "plan_name": plan.name}
            )
            db.add(transaction)
            
            return {
                "success": True, "plan": plan.name, "tier": tier,
                "expires_at": expires_at.isoformat(), "new_balance": float(user.stars_balance)
            }
    except Exception as e:
        # DB level rollback happens automatically with 'async with db.begin()'
        return {"success": False, "error": f"transaction_failed: {str(e)}"}
