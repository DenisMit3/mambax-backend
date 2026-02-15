import stripe
import logging
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from backend.config.settings import settings
from backend.db.session import get_db
from backend.models import monetization as models
from backend.models import User

logger = logging.getLogger(__name__)

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY

async def handle_checkout_completed(session: dict, db: AsyncSession):
    """
    Handle successful payment session.
    Grant subscription or credits.
    """
    try:
        # Extract metadata
        client_reference_id = session.get("client_reference_id")
        metadata = session.get("metadata", {})
        
        user_id = client_reference_id or metadata.get("user_id")
        product_type = metadata.get("product_type") # subscription, boost, superlike
        
        if not user_id:
            logger.error("Stripe Webhook: No user_id found in metadata")
            return

        amount = session.get("amount_total", 0) / 100.0
        currency = session.get("currency", "usd")
        payment_intent = session.get("payment_intent")
        
        logger.info(f"Processing payment for user {user_id}: {product_type} - {amount} {currency}")
        
        # 1. Record Transaction
        transaction = models.RevenueTransaction(
            user_id=user_id,
            transaction_type=product_type or "unknown",
            amount=amount,
            currency=currency,
            status="completed",
            payment_gateway="stripe",
            gateway_transaction_id=payment_intent,
            custom_metadata=metadata
        )
        db.add(transaction)
        await db.flush() # Get ID
        
        # 2. Grant Logic
        # 2. Grant Logic
        if product_type == "subscription":
            plan_id = metadata.get("plan_id")
            
            # Fetch Plan Duration
            plan = None
            if plan_id:
                try:
                    plan_uuid = uuid.UUID(plan_id)
                    res = await db.execute(select(models.SubscriptionPlan).where(models.SubscriptionPlan.id == plan_uuid))
                    plan = res.scalars().first()
                except:
                    logger.warning(f"Invalid plan_id in metadata: {plan_id}")

            duration_days = plan.duration_days if plan else 30
            expires_at = datetime.utcnow() + timedelta(days=duration_days)
            
            sub = models.UserSubscription(
                user_id=user_id,
                plan_id=plan.id if plan else None, 
                status="active",
                started_at=datetime.utcnow(),
                expires_at=expires_at,
                payment_method="stripe",
                stripe_subscription_id=session.get("subscription")
            )
            db.add(sub)
            
            # Update User status
            user_res = await db.execute(select(User).where(User.id == user_id))
            user = user_res.scalars().first()
            if user:
                user.is_vip = True
                
        elif product_type == "superlike":
             qty = int(metadata.get("quantity", 5))
             purchase = models.SuperLikePurchase(
                 user_id=user_id,
                 transaction_id=transaction.id,
                 quantity_purchased=qty,
                 quantity_remaining=qty,
                 source="purchase"
             )
             db.add(purchase)
             
        elif product_type == "boost":
            duration = int(metadata.get("duration", 30))
            boost = models.BoostPurchase(
                user_id=user_id,
                transaction_id=transaction.id,
                boost_type=metadata.get("boost_type", "standard"),
                duration_minutes=duration
            )
            db.add(boost)

        await db.commit()
        logger.info(f"Payment processed successfully for {user_id}")

    except Exception as e:
        logger.error(f"Error handling checkout: {e}")
        await db.rollback()
        raise e


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: AsyncSession = Depends(get_db)):
    """
    Stripe Webhook Handler.
    Verifies signature and processes events.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook Secret not configured")
        
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        logger.error("Stripe Webhook Error: Invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error("Stripe Webhook Error: Invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await handle_checkout_completed(session, db)
        
    elif event['type'] == 'payment_intent.succeeded':
        # Handled via checkout usually, but kept for custom flows
        logger.info(f"Payment intent succeeded: {event['data']['object'].get('id')}")
        
    elif event['type'] == 'customer.subscription.deleted':
        # Handle churn
        sub_data = event['data']['object']
        stripe_sub_id = sub_data.get("id")
        
        # Find subscription and cancel
        txn = await db.execute(select(models.UserSubscription).where(models.UserSubscription.stripe_subscription_id == stripe_sub_id))
        sub = txn.scalars().first()
        if sub:
            sub.status = "cancelled"
            sub.cancelled_at = datetime.utcnow()
            sub.auto_renew = False
            
            # Remove VIP? Depending on logic (period end vs immediate)
            # Usually we let it run until expires_at
            await db.commit()

    return {"status": "success"}
