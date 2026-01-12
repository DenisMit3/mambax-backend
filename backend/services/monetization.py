from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User
from backend.models.monetization import SubscriptionPlan, UserSubscription, RevenueTransaction

async def get_or_create_default_plans(db: AsyncSession):
    """Ensure default subscription plans exist in DB."""
    # Check Gold
    gold = await db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.tier == "gold"))
    if not gold:
        gold = SubscriptionPlan(
            tier="gold", 
            name="Gold Membership", 
            price=500, 
            currency="XTR", 
            duration_days=30, 
            unlimited_swipes=True,
            is_active=True
        )
        db.add(gold)
    
    # Check Platinum
    platinum = await db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.tier == "platinum"))
    if not platinum:
        platinum = SubscriptionPlan(
            tier="platinum", 
            name="Platinum Membership", 
            price=1000, 
            currency="XTR", 
            duration_days=30, 
            unlimited_swipes=True, 
            priority_listing=True,
            see_who_likes_you=True,
            is_active=True
        )
        db.add(platinum)
    
    await db.commit()

async def buy_subscription_with_stars(db: AsyncSession, user_id: str, tier: str) -> Dict[str, Any]:
    """
    Buy a subscription plan with Telegram Stars.
    """
    # Ensure plans exist (lazy initialization)
    await get_or_create_default_plans(db)
    
    # Get plan
    plan = await db.scalar(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.tier == tier, SubscriptionPlan.is_active == True)
    )
    
    if not plan:
        return {"success": False, "error": "Plan not found"}
    
    # Get User
    user = await db.get(User, user_id)
    if not user:
        return {"success": False, "error": "User not found"}
        
    # Check Balance
    balance = user.stars_balance or Decimal("0")
    if balance < plan.price:
        return {
            "success": False, 
            "error": "insufficient_balance", 
            "required": int(plan.price),
            "available": int(balance)
        }
    
    # Deduct Balance
    user.stars_balance = balance - plan.price
    user.subscription_tier = tier
    
    # Create/Update UserSubscription
    # Check existing active subscription
    # For MVP, we just create a new one or update existing?
    # Let's create new record.
    
    now = datetime.utcnow()
    expires_at = now + timedelta(days=plan.duration_days)
    
    subscription = UserSubscription(
        user_id=user_id,
        plan_id=plan.id,
        status="active",
        started_at=now,
        expires_at=expires_at,
        auto_renew=True, # Implicitly true for now? Or False for one-time?
        payment_method="stars"
    )
    db.add(subscription)
    
    # Create Revenue Transaction
    transaction = RevenueTransaction(
        user_id=user_id,
        transaction_type="subscription",
        amount=plan.price,
        currency="XTR",
        status="completed",
        payment_method="stars",
        payment_gateway="internal",
        subscription_id=subscription.id,
        custom_metadata={"plan_tier": tier, "plan_name": plan.name}
    )
    db.add(transaction)
    
    await db.commit()
    
    return {
        "success": True,
        "plan": plan.name,
        "tier": tier,
        "expires_at": expires_at.isoformat(),
        "new_balance": user.stars_balance
    }
