"""
Monetization API Routes

Comprehensive API for revenue management including:
- Subscription plan management (Telegram Stars)
- Promo code campaigns
- Revenue analytics (Real DB Aggregations)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, extract, select, update, delete, cast, Date
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import os
import logging
import httpx

logger = logging.getLogger(__name__)

# Use AsyncSession
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.auth import get_current_user_from_token, get_current_admin
from backend.models.user import User
from backend.models.monetization import (
    SubscriptionPlan, UserSubscription, RevenueTransaction, 
    PromoCode, PromoRedemption, Refund, PricingTest, PaymentGatewayLog,
    VirtualGift, GiftCategory, BoostPurchase, SuperLikePurchase, AffiliatePartner
)
from backend.schemas.monetization import (
    SubscriptionPlanCreate, SubscriptionPlanResponse, 
    TelegramPaymentRequest, TelegramStarsInvoice, TransactionResponse,
    TransactionListResponse, RefundRequest, SendGiftRequest,
    SubscriptionPlanUpdate
)
from backend.core.redis import redis_manager


router = APIRouter(prefix="/admin/monetization", tags=["monetization"])

# ============================================
# SUBSCRIPTION PLANS (Telegram Stars)
# ============================================

@router.get("/plans", response_model=dict)
async def get_subscription_plans(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all subscription plans from DB"""
    stmt = select(SubscriptionPlan)
    if not include_inactive:
        stmt = stmt.where(SubscriptionPlan.is_active == True)
    
    result = await db.execute(stmt)
    plans = result.scalars().all()
    
    return {"plans": plans}

@router.post("/plans", response_model=dict)
async def create_subscription_plan(
    plan: SubscriptionPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new subscription plan"""
    db_plan = SubscriptionPlan(
        name=plan.name,
        tier=plan.tier,
        price=plan.price,
        currency=plan.currency,
        duration_days=plan.duration_days
    )
    
    # Map features
    if plan.features:
        for key, value in plan.features.items():
            if hasattr(db_plan, key):
                setattr(db_plan, key, value)
                
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan)
    
    return {"status": "success", "plan": db_plan}

@router.patch("/plans/{plan_id}", response_model=dict)
async def update_subscription_plan(
    plan_id: uuid.UUID,
    plan_update: SubscriptionPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update an existing subscription plan"""
    db_plan = await db.get(SubscriptionPlan, plan_id)
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    update_data = plan_update.model_dump(exclude_unset=True)
    
    # Handle direct fields
    for key in ["name", "tier", "price", "currency", "duration_days", "is_active", "is_popular"]:
        if key in update_data:
            setattr(db_plan, key, update_data[key])
            
    # Handle features
    if "features" in update_data and update_data["features"]:
        for key, value in update_data["features"].items():
            if hasattr(db_plan, key):
                setattr(db_plan, key, value)
                
    await db.commit()
    await db.refresh(db_plan)
    
    return {"status": "success", "plan": db_plan}

@router.delete("/plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a subscription plan (soft delete logic could be added instead)"""
    db_plan = await db.get(SubscriptionPlan, plan_id)
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await db.delete(db_plan)
    await db.commit()
    
    return {"status": "success", "message": "Plan deleted"}

# ============================================
# TELEGRAM STARS PAYMENT FLOW
# ============================================

@router.post("/telegram/create-invoice", response_model=TelegramStarsInvoice)
async def create_telegram_invoice(
    request: TelegramPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Generates a Telegram Stars Invoice Link.
    """
    # 1. Fetch Plan
    plan = await db.get(SubscriptionPlan, request.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Create Pending Transaction
    transaction = RevenueTransaction(
        user_id=current_user.id,
        transaction_type="subscription",
        amount=plan.price,
        currency="XTR",
        status="pending",
        payment_gateway="telegram_stars",
        custom_metadata={"plan_id": str(plan.id), "plan_name": plan.name}
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # 3. Generate Link (Real using Bot API)
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not bot_token:
        # Fallback for dev without token
        invoice_link = f"https://t.me/MambaXBot?start=invoice_{transaction.id}"
    else:
        # Call Telegram API
        async with httpx.AsyncClient() as client:
            payload = {
                "title": f"MambaX {plan.name}",
                "description": f"{plan.duration_days} days premium access",
                "payload": str(transaction.id),
                "currency": "XTR",
                "prices": [{"label": plan.name, "amount": int(plan.price)}],
                "provider_token": "" # Empty for Telegram Stars
            }
            try:
                resp = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/createInvoiceLink",
                    json=payload
                )
                data = resp.json()
                if data.get("ok"):
                    invoice_link = data["result"]
                else:
                    # Log error but return fallback if needed or raise
                    print(f"Telegram API Error: {data}")
                    raise HTTPException(status_code=500, detail=f"Telegram Error: {data.get('description')}")
            except Exception as e:
                print(f"Invoice Gen Failed: {e}")
                raise HTTPException(status_code=500, detail="Failed to connect to Telegram API")

    return TelegramStarsInvoice(
        invoice_link=invoice_link,
        amount=int(plan.price),
        currency="XTR",
        transaction_id=transaction.id
    )


@router.post("/payments/gift", response_model=TelegramStarsInvoice)
async def create_gift_purchase_invoice(
    request: SendGiftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """
    Generate Invoice for Direct Gift Purchase (Telegram Stars).
    """
    from backend.services.telegram_payments import create_stars_invoice

    # 1. Fetch Gift
    gift = await db.get(VirtualGift, request.gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
        
    if not gift.is_active:
        raise HTTPException(status_code=400, detail="Gift is not active")

    # 2. Create Pending RevenueTransaction
    transaction = RevenueTransaction(
        user_id=current_user.id,
        transaction_type="gift_purchase",
        amount=gift.price,
        currency="XTR",
        status="pending",
        payment_gateway="telegram_stars",
        custom_metadata={
            "gift_id": str(gift.id),
            "gift_name": gift.name,
            "receiver_id": str(request.receiver_id),
            "message": request.message,
            "is_anonymous": request.is_anonymous
        }
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    
    # 3. Create Invoice Link
    title = f"Gift: {gift.name}"
    description = f"Send {gift.name} to user"
    
    invoice_link = await create_stars_invoice(
        title=title,
        description=description,
        payload=str(transaction.id),
        amount=int(gift.price),
        photo_url=gift.image_url if gift.image_url.startswith("http") else None
    )
    
    if not invoice_link:
        # Fallback or error
        raise HTTPException(status_code=500, detail="Failed to generate invoice link")
    
    return TelegramStarsInvoice(
        invoice_link=invoice_link,
        amount=int(gift.price),
        currency="XTR",
        transaction_id=transaction.id
    )

# ============================================
# TRANSACTIONS MANAGEMENT
# ============================================

@router.get("/transactions", response_model=TransactionListResponse)
async def get_transactions(
    page: int = 1,
    size: int = 20,
    status: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get list of revenue transactions"""
    offset = (page - 1) * size
    
    stmt = select(RevenueTransaction).order_by(RevenueTransaction.created_at.desc())
    
    if status:
        stmt = stmt.where(RevenueTransaction.status == status)
    if user_id:
        stmt = stmt.where(RevenueTransaction.user_id == user_id)
    if start_date:
        stmt = stmt.where(RevenueTransaction.created_at >= start_date)
    if end_date:
        stmt = stmt.where(RevenueTransaction.created_at <= end_date)
        
    # Count
    try:
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0
    except Exception:
        # Fallback if complex query
        total = 0
    
    # Fetch
    stmt = stmt.offset(offset).limit(size)
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    
    return {
        "items": [
            TransactionResponse(
                id=t.id,
                user_id=t.user_id,
                amount=float(t.amount),
                currency=t.currency,
                status=t.status,
                created_at=t.created_at,
                metadata=t.custom_metadata or {}
            ) for t in transactions
        ],
        "total": total,
        "page": page,
        "size": size
    }


@router.post("/transactions/{transaction_id}/refund")
async def refund_transaction(
    transaction_id: uuid.UUID,
    data: RefundRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Refund a transaction"""
    
    tx = await db.get(RevenueTransaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.status != "completed":
        raise HTTPException(status_code=400, detail="Transaction not completed")
        
    if tx.status == "refunded":
        raise HTTPException(status_code=400, detail="Already refunded")

    # Create Refund
    refund = Refund(
        transaction_id=tx.id,
        user_id=tx.user_id,
        amount=tx.amount,
        reason=data.reason,
        status="processed",
        reviewed_by=current_user.id,
        reviewed_at=datetime.utcnow()
    )
    db.add(refund)
    
    # Refund Balance (Credit back to user)
    # Assuming user spent stars (gift) or bought plan with stars?
    # If they bought plan with stars, we give stars back.
    user = await db.get(User, tx.user_id)
    if user:
        user.stars_balance = (user.stars_balance or Decimal("0")) + tx.amount
        
    tx.status = "refunded"
    await db.commit()
    
    return {"status": "success", "refund_id": str(refund.id)}


@router.post("/transactions/{transaction_id}/telegram-refund")
async def telegram_refund_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Refund a Telegram Stars transaction via Telegram Board API.
    Deducts stars from user balance.
    """
    from backend.services.telegram_payments import refund_stars_payment
    
    # Get transaction
    tx = await db.get(RevenueTransaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.status != "completed":
        raise HTTPException(status_code=400, detail="Can only refund completed transactions")
        
    if tx.payment_gateway != "telegram_stars":
         raise HTTPException(status_code=400, detail="Not a Telegram Stars transaction")

    if not tx.gateway_transaction_id:
        raise HTTPException(status_code=400, detail="No Telegram charge ID found")
        
    # Get user
    user = await db.get(User, tx.user_id)
    if not user or not user.telegram_id:
         raise HTTPException(status_code=400, detail="User Telegram ID not found")
         
    # Call Telegram API
    success = await refund_stars_payment(
        user_id=int(user.telegram_id),
        telegram_payment_charge_id=tx.gateway_transaction_id
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Telegram API refund failed")
        
    # Deduct balance (Atomic Update to prevent Race Condition)
    # user.stars_balance = User.stars_balance - tx.amount
    # However, SQLAlchemy async session handling of expression updates on ORM objects can be tricky.
    # Safe way: Execute an update statement.
    
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(stars_balance=User.stars_balance - tx.amount)
    )
    
    # We need to refresh user to get new balance if needed, or just expire it
    # But here we don't return the balance, so it's fine.
    
    tx.status = "refunded"
    tx.custom_metadata = {**(tx.custom_metadata or {}), "refunded_by": str(current_user.id)}
    
    await db.commit()
    
    return {"status": "success", "message": "Refund processed and balance deducted"}


# ============================================
# REFUND MANAGEMENT (Real DB)
# ============================================

@router.get("/refunds")
async def list_refunds(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """List all refund requests with filtering"""
    stmt = (
        select(Refund)
        .order_by(desc(Refund.created_at))
    )
    
    if status:
        stmt = stmt.where(Refund.status == status)
    
    # Count
    count_stmt = select(func.count()).select_from(Refund)
    if status:
        count_stmt = count_stmt.where(Refund.status == status)
    total = (await db.execute(count_stmt)).scalar() or 0
    
    # Paginate
    stmt = stmt.offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    refunds = result.scalars().all()
    
    items = []
    for r in refunds:
        # Get transaction info
        tx = await db.get(RevenueTransaction, r.transaction_id) if r.transaction_id else None
        # Get user info
        user = await db.get(User, r.user_id) if r.user_id else None
        items.append({
            "id": str(r.id),
            "transaction_id": str(r.transaction_id) if r.transaction_id else None,
            "user_id": str(r.user_id) if r.user_id else None,
            "user_name": user.name if user else "Unknown",
            "amount": float(r.amount) if r.amount else 0,
            "reason": r.reason,
            "status": r.status,
            "original_amount": float(tx.amount) if tx else 0,
            "payment_gateway": tx.payment_gateway if tx else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "resolved_at": r.resolved_at.isoformat() if hasattr(r, 'resolved_at') and r.resolved_at else None,
        })
    
    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/refunds/{refund_id}/{action}")
async def refund_action(
    refund_id: uuid.UUID,
    action: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Approve or reject a refund request"""
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    refund = await db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")
    
    if refund.status not in ("pending", "requested"):
        raise HTTPException(status_code=400, detail=f"Refund already {refund.status}")
    
    if action == "approve":
        refund.status = "approved"
        # Also refund the transaction
        if refund.transaction_id:
            tx = await db.get(RevenueTransaction, refund.transaction_id)
            if tx:
                tx.status = "refunded"
                # Return funds to user balance if applicable
                if tx.user_id and tx.payment_gateway == "telegram_stars":
                    await db.execute(
                        update(User)
                        .where(User.id == tx.user_id)
                        .values(stars_balance=User.stars_balance + tx.amount)
                    )
    else:
        refund.status = "rejected"
    
    if hasattr(refund, 'resolved_at'):
        refund.resolved_at = datetime.utcnow()
    if hasattr(refund, 'resolved_by'):
        refund.resolved_by = current_user.id
    
    await db.commit()
    
    return {"status": "success", "refund_status": refund.status}


# ============================================
# REVENUE ANALYTICS (Real DB)
# ============================================

class RevenueSourceItem(BaseModel):
    source: str
    amount: float
    percentage: float

class SubscriptionBreakdownItem(BaseModel):
    count: int
    percentage: float

class SubscriptionBreakdown(BaseModel):
    free: SubscriptionBreakdownItem
    gold: SubscriptionBreakdownItem
    platinum: SubscriptionBreakdownItem

class RevenueMetricsResponse(BaseModel):
    today: float
    week: float
    month: float
    year: float
    arpu: float
    arppu: float
    subscription_breakdown: SubscriptionBreakdown
    revenue_sources: List[RevenueSourceItem]


@router.get("/revenue/metrics", response_model=RevenueMetricsResponse)
async def get_revenue_metrics(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get comprehensive revenue metrics from Real DB"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    year_start = now - timedelta(days=365)

    # Helper to sum revenue
    async def get_revenue(start_date: datetime):
        result = await db.execute(
            select(func.sum(RevenueTransaction.amount)).where(
                and_(
                    RevenueTransaction.status == 'completed',
                    RevenueTransaction.created_at >= start_date
                )
            )
        )
        return float(result.scalar() or 0.0)

    revenue_today = await get_revenue(today_start)
    revenue_week = await get_revenue(week_start)
    revenue_month = await get_revenue(month_start)
    revenue_year = await get_revenue(year_start)

    # User Counts for ARPU
    total_users_res = await db.execute(select(func.count(User.id)))
    total_users = total_users_res.scalar() or 1
    
    # Paying Users
    paying_users_res = await db.execute(
        select(func.count(func.distinct(RevenueTransaction.user_id))).where(
            RevenueTransaction.status == 'completed'
        )
    )
    paying_users = paying_users_res.scalar() or 0

    arpu = revenue_month / total_users if total_users > 0 else 0
    arppu = revenue_month / paying_users if paying_users > 0 else 0

    # Subscription Breakdown
    from backend.models.user import SubscriptionTier # Import locally to avoid circulars if any
    
    async def get_sub_count(tier_name: str):
        # Count by checking user.subscription_tier
        # Note: This requires the User model to have subscription_tier populated
        res = await db.execute(select(func.count(User.id)).where(User.subscription_tier == tier_name))
        return res.scalar() or 0

    # Assuming 'free', 'gold', 'platinum' values in DB. 
    # If enum is used, use .value
    free_count = await get_sub_count('free')
    gold_count = await get_sub_count('gold')
    platinum_count = await get_sub_count('platinum')
    
    total_subs = free_count + gold_count + platinum_count or 1

    sub_breakdown = SubscriptionBreakdown(
        free=SubscriptionBreakdownItem(count=free_count, percentage=(free_count/total_subs)*100),
        gold=SubscriptionBreakdownItem(count=gold_count, percentage=(gold_count/total_subs)*100),
        platinum=SubscriptionBreakdownItem(count=platinum_count, percentage=(platinum_count/total_subs)*100),
    )

    # Revenue Sources
    sources_res = await db.execute(
        select(
            RevenueTransaction.transaction_type, 
            func.sum(RevenueTransaction.amount)
        ).where(
            RevenueTransaction.status == 'completed'
        ).group_by(RevenueTransaction.transaction_type)
    )
    sources_data = sources_res.all()
    total_rev_all_time = sum(float(r[1]) for r in sources_data) or 1.0
    
    revenue_sources = []
    source_map = {
        'subscription': 'Subscriptions',
        'gift_purchase': 'Gifts',
        'boost': 'Boosts',
        'super_like': 'Super Likes'
    }
    
    for r in sources_data:
        r_type = r[0]
        r_amount = float(r[1])
        display_name = source_map.get(r_type, r_type.title())
        revenue_sources.append(RevenueSourceItem(
            source=display_name,
            amount=r_amount,
            percentage=(r_amount / total_rev_all_time) * 100
        ))

    # Sort by amount desc
    revenue_sources.sort(key=lambda x: x.amount, reverse=True)

    return RevenueMetricsResponse(
        today=revenue_today,
        week=revenue_week,
        month=revenue_month,
        year=revenue_year,
        arpu=arpu,
        arppu=arppu,
        subscription_breakdown=sub_breakdown,
        revenue_sources=revenue_sources
    )
@router.get("/revenue/trend")
async def get_revenue_trend(
    period: str = "30d",
    granularity: str = "day",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get revenue trend data for charts (Real DB)"""
    
    # Verify period
    days = 30
    if period == "7d":
        days = 7
    elif period == "90d":
        days = 90
        
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Query: Sum amount by date
    # SQLite/Postgres compatibility note: assuming Postgres 'date_trunc' or simple date casting
    # For general compatibility:
    
    stmt = (
        select(
            cast(RevenueTransaction.created_at, Date).label('date'),
            func.sum(RevenueTransaction.amount).label('revenue'),
            func.count(RevenueTransaction.id).label('transactions')
        )
        .where(
            and_(
                RevenueTransaction.created_at >= start_date,
                RevenueTransaction.status == 'completed'
            )
        )
        .group_by(cast(RevenueTransaction.created_at, Date))
        .order_by(cast(RevenueTransaction.created_at, Date))
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Convert to dict lookup
    data_map = {str(row.date): {"revenue": float(row.revenue or 0), "transactions": row.transactions} for row in rows}
    
    # Fill gaps
    categories = []
    trend_data = []
    
    for i in range(days):
        date_obj = datetime.utcnow() - timedelta(days=days - 1 - i)
        date_str = date_obj.strftime("%Y-%m-%d")
        
        day_data = data_map.get(date_str, {"revenue": 0, "transactions": 0})
        
        trend_data.append({
            "date": date_str,
            "revenue": day_data["revenue"],
            "transactions": day_data["transactions"],
            "new_subscribers": 0 # Placeholder for now, requires Subscription query
        })
        
    return {"trend": trend_data}

@router.get("/revenue/by-channel")
async def get_revenue_by_channel(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get revenue breakdown by acquisition channel (Real DB)"""
    days = {"week": 7, "month": 30, "quarter": 90, "year": 365}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    stmt = (
        select(
            func.coalesce(RevenueTransaction.acquisition_channel, "organic").label("channel"),
            func.sum(RevenueTransaction.amount).label("revenue"),
            func.count(func.distinct(RevenueTransaction.user_id)).label("users"),
        )
        .where(
            and_(
                RevenueTransaction.status == "completed",
                RevenueTransaction.created_at >= start_date,
            )
        )
        .group_by(func.coalesce(RevenueTransaction.acquisition_channel, "organic"))
        .order_by(func.sum(RevenueTransaction.amount).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    total_revenue = sum(float(r.revenue or 0) for r in rows) or 1.0
    channels = []
    for r in rows:
        rev = float(r.revenue or 0)
        users = r.users or 0
        channels.append({
            "channel": (r.channel or "organic").replace("_", " ").title(),
            "revenue": round(rev, 2),
            "users": users,
            "arpu": round(rev / users, 2) if users else 0,
        })

    return {"channels": channels, "total_revenue": round(total_revenue, 2)}


@router.get("/revenue/churn")
async def get_churn_analysis(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get churn analysis by subscription tier (Real DB)"""
    days = {"week": 7, "month": 30, "quarter": 90, "year": 365}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    # Cancelled/expired subscriptions in period grouped by plan tier
    # Join UserSubscription -> SubscriptionPlan to get tier
    stmt = (
        select(
            SubscriptionPlan.tier,
            func.count(UserSubscription.id).label("churned"),
        )
        .join(SubscriptionPlan, UserSubscription.plan_id == SubscriptionPlan.id)
        .where(
            and_(
                UserSubscription.status.in_(["cancelled", "expired"]),
                UserSubscription.cancelled_at >= start_date,
            )
        )
        .group_by(SubscriptionPlan.tier)
    )
    result = await db.execute(stmt)
    churned_rows = result.all()

    # Total active per tier at start of period
    active_stmt = (
        select(
            SubscriptionPlan.tier,
            func.count(UserSubscription.id).label("active"),
        )
        .join(SubscriptionPlan, UserSubscription.plan_id == SubscriptionPlan.id)
        .where(UserSubscription.status == "active")
        .group_by(SubscriptionPlan.tier)
    )
    active_result = await db.execute(active_stmt)
    active_map = {r.tier: r.active for r in active_result.all()}

    churned_map = {r.tier: r.churned for r in churned_rows}

    total_active = sum(active_map.values()) or 1
    total_churned = sum(churned_map.values())
    overall_churn = round((total_churned / total_active) * 100, 1) if total_active else 0

    by_tier = []
    for tier in ["free", "vip", "gold", "platinum"]:
        churned = churned_map.get(tier, 0)
        active = active_map.get(tier, 0)
        if churned == 0 and active == 0:
            continue
        rate = round((churned / (active + churned)) * 100, 1) if (active + churned) else 0
        by_tier.append({
            "tier": tier,
            "churn_rate": rate,
            "churned_users": churned,
            "active_users": active,
        })

    # Churn trend — last 4 months
    churn_trend = []
    for i in range(3, -1, -1):
        m_start = datetime.utcnow() - timedelta(days=30 * (i + 1))
        m_end = datetime.utcnow() - timedelta(days=30 * i)
        cnt_stmt = select(func.count(UserSubscription.id)).where(
            and_(
                UserSubscription.status.in_(["cancelled", "expired"]),
                UserSubscription.cancelled_at >= m_start,
                UserSubscription.cancelled_at < m_end,
            )
        )
        cnt = (await db.execute(cnt_stmt)).scalar() or 0
        churn_trend.append({
            "month": m_start.strftime("%b"),
            "churned": cnt,
        })

    return {
        "overall_churn": overall_churn,
        "by_tier": by_tier,
        "churn_trend": churn_trend,
    }


# ============================================
# FORECASTING
# ============================================

@router.get("/revenue/forecast")
async def get_revenue_forecast(
    months: int = 3,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get revenue forecast based on real DB trends"""
    now = datetime.utcnow()

    # Calculate MRR for last 3 months to derive growth rate
    monthly_revenues = []
    for i in range(3, 0, -1):
        m_start = now - timedelta(days=30 * i)
        m_end = now - timedelta(days=30 * (i - 1))
        stmt = select(func.sum(RevenueTransaction.amount)).where(
            and_(
                RevenueTransaction.status == "completed",
                RevenueTransaction.created_at >= m_start,
                RevenueTransaction.created_at < m_end,
            )
        )
        rev = float((await db.execute(stmt)).scalar() or 0)
        monthly_revenues.append(rev)

    # Current month MRR
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    stmt = select(func.sum(RevenueTransaction.amount)).where(
        and_(
            RevenueTransaction.status == "completed",
            RevenueTransaction.created_at >= current_month_start,
        )
    )
    current_mrr = float((await db.execute(stmt)).scalar() or 0)

    # Growth rate from historical data
    growth_rates = []
    for i in range(1, len(monthly_revenues)):
        if monthly_revenues[i - 1] > 0:
            rate = (monthly_revenues[i] - monthly_revenues[i - 1]) / monthly_revenues[i - 1]
            growth_rates.append(rate)
    avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0.05

    # Churn rate
    total_subs = (await db.execute(select(func.count(UserSubscription.id)).where(UserSubscription.status == "active"))).scalar() or 1
    cancelled_last_month = (await db.execute(
        select(func.count(UserSubscription.id)).where(
            and_(
                UserSubscription.status.in_(["cancelled", "expired"]),
                UserSubscription.cancelled_at >= now - timedelta(days=30),
            )
        )
    )).scalar() or 0
    churn_rate = round((cancelled_last_month / total_subs) * 100, 1) if total_subs else 0

    base_mrr = current_mrr if current_mrr > 0 else (monthly_revenues[-1] if monthly_revenues and monthly_revenues[-1] > 0 else 0)

    forecasts = []
    for i in range(1, months + 1):
        projected = base_mrr * ((1 + avg_growth) ** i)
        forecasts.append({
            "month": (now + timedelta(days=30 * i)).strftime("%B %Y"),
            "projected_mrr": round(projected, 2),
            "projected_arr": round(projected * 12, 2),
            "confidence_low": round(projected * 0.85, 2),
            "confidence_high": round(projected * 1.15, 2),
            "growth_from_current": round((projected / base_mrr - 1) * 100, 1) if base_mrr > 0 else 0,
        })

    return {
        "current_mrr": round(base_mrr, 2),
        "current_arr": round(base_mrr * 12, 2),
        "growth_rate": round(avg_growth * 100, 1),
        "historical_mrr": [round(r, 2) for r in monthly_revenues],
        "forecasts": forecasts,
        "assumptions": {
            "churn_rate": churn_rate,
            "avg_growth_rate": round(avg_growth * 100, 1),
            "based_on_months": len(monthly_revenues),
        },
    }


# ============================================
# BOOSTS & SUPERLIKES
# ============================================

@router.get("/boosts/analytics")
async def get_boost_analytics(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get boost purchase and usage analytics (Real DB)"""
    days = {"week": 7, "month": 30, "quarter": 90, "year": 365}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    # Total purchases
    total_stmt = select(func.count(BoostPurchase.id)).where(BoostPurchase.created_at >= start_date)
    total = (await db.execute(total_stmt)).scalar() or 0

    # Revenue from boosts
    rev_stmt = select(func.sum(RevenueTransaction.amount)).where(
        and_(
            RevenueTransaction.transaction_type == "boost",
            RevenueTransaction.status == "completed",
            RevenueTransaction.created_at >= start_date,
        )
    )
    revenue = float((await db.execute(rev_stmt)).scalar() or 0)

    # Used vs unused
    used_stmt = select(func.count(BoostPurchase.id)).where(
        and_(BoostPurchase.created_at >= start_date, BoostPurchase.used_at != None)
    )
    used = (await db.execute(used_stmt)).scalar() or 0
    unused = total - used

    # Avg effectiveness
    eff_stmt = select(
        func.avg(BoostPurchase.views_during_boost),
        func.avg(BoostPurchase.likes_during_boost),
        func.avg(BoostPurchase.matches_during_boost),
    ).where(and_(BoostPurchase.created_at >= start_date, BoostPurchase.used_at != None))
    eff = (await db.execute(eff_stmt)).one_or_none()

    # By type
    by_type_stmt = (
        select(
            BoostPurchase.boost_type,
            func.count(BoostPurchase.id).label("purchases"),
        )
        .where(BoostPurchase.created_at >= start_date)
        .group_by(BoostPurchase.boost_type)
    )
    by_type_rows = (await db.execute(by_type_stmt)).all()

    return {
        "purchases": {"total": total, "revenue": round(revenue, 2), "average_per_day": round(total / max(days, 1), 1)},
        "usage": {"used": used, "unused": unused, "usage_rate": round((used / total) * 100, 1) if total else 0},
        "effectiveness": {
            "avg_views_increase": round(float(eff[0] or 0)) if eff else 0,
            "avg_likes_increase": round(float(eff[1] or 0)) if eff else 0,
            "avg_matches_increase": round(float(eff[2] or 0)) if eff else 0,
        },
        "by_type": [{"type": r.boost_type, "purchases": r.purchases} for r in by_type_rows],
    }


@router.get("/superlikes/analytics")
async def get_superlike_analytics(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get super like analytics (Real DB)"""
    days = {"week": 7, "month": 30, "quarter": 90, "year": 365}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    # Purchased superlikes
    purchased_stmt = select(
        func.count(SuperLikePurchase.id),
        func.sum(SuperLikePurchase.quantity_purchased),
    ).where(and_(SuperLikePurchase.created_at >= start_date, SuperLikePurchase.source == "purchase"))
    purchased = (await db.execute(purchased_stmt)).one_or_none()
    total_purchases = purchased[0] or 0 if purchased else 0
    total_qty_purchased = int(purchased[1] or 0) if purchased else 0

    # From subscription
    from_sub_stmt = select(func.sum(SuperLikePurchase.quantity_purchased)).where(
        and_(SuperLikePurchase.created_at >= start_date, SuperLikePurchase.source == "subscription")
    )
    from_sub = int((await db.execute(from_sub_stmt)).scalar() or 0)

    # Revenue
    rev_stmt = select(func.sum(RevenueTransaction.amount)).where(
        and_(
            RevenueTransaction.transaction_type == "super_like",
            RevenueTransaction.status == "completed",
            RevenueTransaction.created_at >= start_date,
        )
    )
    revenue = float((await db.execute(rev_stmt)).scalar() or 0)

    # Remaining (unused)
    remaining_stmt = select(func.sum(SuperLikePurchase.quantity_remaining)).where(
        SuperLikePurchase.created_at >= start_date
    )
    remaining = int((await db.execute(remaining_stmt)).scalar() or 0)
    total_sent = (total_qty_purchased + from_sub) - remaining

    return {
        "purchases": {
            "total": total_purchases,
            "revenue": round(revenue, 2),
            "from_subscription": from_sub,
            "total_sent": max(total_sent, 0),
        },
        "effectiveness": {
            "total_purchased_qty": total_qty_purchased,
            "remaining": remaining,
            "usage_rate": round(((total_qty_purchased - remaining) / total_qty_purchased) * 100, 1) if total_qty_purchased else 0,
        },
    }


# ============================================
# AFFILIATE PROGRAM
# ============================================

@router.get("/affiliates")
async def get_affiliates(
    status: str = "active",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get affiliate partners (Real DB)"""
    stmt = select(AffiliatePartner).order_by(AffiliatePartner.total_revenue_generated.desc())
    if status == "active":
        stmt = stmt.where(AffiliatePartner.is_active == True)
    elif status == "inactive":
        stmt = stmt.where(AffiliatePartner.is_active == False)

    offset = (page - 1) * page_size
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = stmt.offset(offset).limit(page_size)
    result = await db.execute(stmt)
    partners = result.scalars().all()

    affiliates = []
    for p in partners:
        conv_rate = round((p.total_conversions / p.total_referrals) * 100, 1) if p.total_referrals else 0
        affiliates.append({
            "id": str(p.id),
            "name": p.name,
            "code": p.code,
            "email": p.email,
            "commission_rate": float(p.commission_rate),
            "total_referrals": p.total_referrals,
            "total_conversions": p.total_conversions,
            "conversion_rate": conv_rate,
            "revenue_generated": float(p.total_revenue_generated),
            "commission_paid": float(p.total_commission_paid),
            "pending_commission": float(p.pending_commission),
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {
        "affiliates": affiliates,
        "total": total,
        "total_revenue": sum(a["revenue_generated"] for a in affiliates),
        "total_commission": sum(a["commission_paid"] + a["pending_commission"] for a in affiliates),
    }


@router.get("/affiliates/stats")
async def get_affiliate_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get affiliate program overview stats (Real DB)"""
    active_stmt = select(func.count(AffiliatePartner.id)).where(AffiliatePartner.is_active == True)
    active_count = (await db.execute(active_stmt)).scalar() or 0

    agg_stmt = select(
        func.sum(AffiliatePartner.total_referrals),
        func.sum(AffiliatePartner.total_conversions),
        func.sum(AffiliatePartner.total_revenue_generated),
        func.sum(AffiliatePartner.total_commission_paid),
        func.sum(AffiliatePartner.pending_commission),
    )
    agg = (await db.execute(agg_stmt)).one_or_none()

    total_referrals = int(agg[0] or 0) if agg else 0
    total_conversions = int(agg[1] or 0) if agg else 0
    total_revenue = float(agg[2] or 0) if agg else 0
    total_paid = float(agg[3] or 0) if agg else 0
    total_pending = float(agg[4] or 0) if agg else 0

    # Top performer
    top_stmt = select(AffiliatePartner).order_by(AffiliatePartner.total_revenue_generated.desc()).limit(1)
    top = (await db.execute(top_stmt)).scalar_one_or_none()

    return {
        "active_affiliates": active_count,
        "total_referrals": total_referrals,
        "total_conversions": total_conversions,
        "conversion_rate": round((total_conversions / total_referrals) * 100, 1) if total_referrals else 0,
        "revenue_generated": round(total_revenue, 2),
        "commission_paid": round(total_paid, 2),
        "pending_commission": round(total_pending, 2),
        "top_performer": {
            "name": top.name if top else "N/A",
            "revenue": float(top.total_revenue_generated) if top else 0,
        },
    }


# ============================================
# UPSELL OPPORTUNITIES
# ============================================

@router.get("/upsell/opportunities")
async def get_upsell_opportunities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Identify upsell opportunities (Real DB)"""
    now = datetime.utcnow()

    # Segment 1: Active free users (high activity = have transactions)
    free_active_stmt = select(func.count(User.id)).where(
        and_(
            User.subscription_tier == "free",
            User.is_active == True,
            User.last_seen >= now - timedelta(days=7),
        )
    )
    free_active = (await db.execute(free_active_stmt)).scalar() or 0

    # Segment 2: Gold users who bought boosts (near limit)
    gold_boost_stmt = select(func.count(func.distinct(BoostPurchase.user_id))).join(
        User, BoostPurchase.user_id == User.id
    ).where(
        and_(
            User.subscription_tier == "gold",
            BoostPurchase.created_at >= now - timedelta(days=30),
        )
    )
    gold_boosters = (await db.execute(gold_boost_stmt)).scalar() or 0

    # Segment 3: Lapsed premium — cancelled in last 60 days
    lapsed_stmt = select(func.count(func.distinct(UserSubscription.user_id))).where(
        and_(
            UserSubscription.status.in_(["cancelled", "expired"]),
            UserSubscription.cancelled_at >= now - timedelta(days=60),
            UserSubscription.cancelled_at < now - timedelta(days=7),
        )
    )
    lapsed = (await db.execute(lapsed_stmt)).scalar() or 0

    # Segment 4: Users who bought superlikes (engaged free/gold)
    superlike_buyers_stmt = select(func.count(func.distinct(SuperLikePurchase.user_id))).where(
        and_(
            SuperLikePurchase.source == "purchase",
            SuperLikePurchase.created_at >= now - timedelta(days=30),
        )
    )
    superlike_buyers = (await db.execute(superlike_buyers_stmt)).scalar() or 0

    segments = []
    if free_active > 0:
        segments.append({
            "segment": "Active Free Users",
            "description": "Free users active in last 7 days",
            "count": free_active,
            "recommended_offer": "50% off Gold for first month",
            "estimated_conversion": 12.5,
            "potential_revenue": round(free_active * 0.125 * 9.99, 2),
        })
    if gold_boosters > 0:
        segments.append({
            "segment": "Gold Users Buying Boosts",
            "description": "Gold users who purchased boosts this month",
            "count": gold_boosters,
            "recommended_offer": "Upgrade to Platinum — 30% off",
            "estimated_conversion": 8.5,
            "potential_revenue": round(gold_boosters * 0.085 * 19.99, 2),
        })
    if lapsed > 0:
        segments.append({
            "segment": "Lapsed Premium Users",
            "description": "Former premium users cancelled 7-60 days ago",
            "count": lapsed,
            "recommended_offer": "Come back offer — 40% off",
            "estimated_conversion": 15.2,
            "potential_revenue": round(lapsed * 0.152 * 9.99, 2),
        })
    if superlike_buyers > 0:
        segments.append({
            "segment": "Super Like Buyers",
            "description": "Users purchasing super likes this month",
            "count": superlike_buyers,
            "recommended_offer": "Gold plan includes 5 free super likes/day",
            "estimated_conversion": 18.5,
            "potential_revenue": round(superlike_buyers * 0.185 * 9.99, 2),
        })

    total_potential = sum(s["potential_revenue"] for s in segments)

    return {"segments": segments, "total_potential_revenue": round(total_potential, 2)}


# ============================================
# PRICING A/B TESTS CRUD (Feature 67)
# ============================================

class PricingTestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    variants: list
    target_segment: str = "all"
    traffic_split: list = []
    start_date: datetime
    end_date: datetime

class PricingTestUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    variants: Optional[list] = None
    target_segment: Optional[str] = None
    traffic_split: Optional[list] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    winner_variant: Optional[str] = None


@router.get("/pricing-tests")
async def get_pricing_tests(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all pricing A/B tests"""
    stmt = select(PricingTest).order_by(PricingTest.created_at.desc())
    if status:
        stmt = stmt.where(PricingTest.status == status)
    result = await db.execute(stmt)
    tests = result.scalars().all()

    return {
        "tests": [
            {
                "id": str(t.id),
                "name": t.name,
                "description": t.description,
                "variants": t.variants,
                "target_segment": t.target_segment,
                "traffic_split": t.traffic_split,
                "start_date": t.start_date.isoformat() if t.start_date else None,
                "end_date": t.end_date.isoformat() if t.end_date else None,
                "status": t.status,
                "results": t.results,
                "winner_variant": t.winner_variant,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tests
        ],
        "total": len(tests),
    }


@router.post("/pricing-tests")
async def create_pricing_test(
    data: PricingTestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new pricing A/B test"""
    test = PricingTest(
        name=data.name,
        description=data.description,
        variants=data.variants,
        target_segment=data.target_segment,
        traffic_split=data.traffic_split or [50] * len(data.variants),
        start_date=data.start_date,
        end_date=data.end_date,
        status="draft",
        created_by=current_user.id,
    )
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return {"status": "success", "id": str(test.id)}


@router.patch("/pricing-tests/{test_id}")
async def update_pricing_test(
    test_id: uuid.UUID,
    data: PricingTestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a pricing A/B test"""
    test = await db.get(PricingTest, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(test, key):
            setattr(test, key, value)

    await db.commit()
    await db.refresh(test)
    return {"status": "success", "id": str(test.id)}


@router.delete("/pricing-tests/{test_id}")
async def delete_pricing_test(
    test_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a pricing A/B test"""
    test = await db.get(PricingTest, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    await db.delete(test)
    await db.commit()
    return {"status": "success"}


@router.get("/pricing-tests/{test_id}/results")
async def get_pricing_test_results(
    test_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get results for a specific pricing test"""
    test = await db.get(PricingTest, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Calculate real conversion data per variant from transactions
    variant_results = []
    for i, variant in enumerate(test.variants or []):
        variant_name = variant.get("name", f"Variant {i}")
        # Count transactions tagged with this test variant
        stmt = select(
            func.count(RevenueTransaction.id),
            func.sum(RevenueTransaction.amount),
        ).where(
            and_(
                RevenueTransaction.custom_metadata["pricing_test_id"].as_string() == str(test_id),
                RevenueTransaction.custom_metadata["variant"].as_string() == variant_name,
                RevenueTransaction.status == "completed",
            )
        )
        try:
            res = (await db.execute(stmt)).one_or_none()
            conversions = res[0] or 0 if res else 0
            revenue = float(res[1] or 0) if res else 0
        except Exception:
            conversions = 0
            revenue = 0

        variant_results.append({
            "variant": variant_name,
            "price": variant.get("price", 0),
            "conversions": conversions,
            "revenue": round(revenue, 2),
        })

    return {
        "test_id": str(test.id),
        "name": test.name,
        "status": test.status,
        "variants": variant_results,
        "winner_variant": test.winner_variant,
    }


# ============================================
# COUPON REDEMPTION TRACKING (Feature 73)
# ============================================

@router.get("/promo-redemptions")
async def get_promo_redemptions(
    promo_code_id: Optional[uuid.UUID] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get detailed promo code redemption tracking"""
    stmt = select(PromoRedemption).order_by(PromoRedemption.redeemed_at.desc())
    if promo_code_id:
        stmt = stmt.where(PromoRedemption.promo_code_id == promo_code_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)
    result = await db.execute(stmt)
    redemptions = result.scalars().all()

    items = []
    for r in redemptions:
        user = await db.get(User, r.user_id)
        promo = await db.get(PromoCode, r.promo_code_id)
        items.append({
            "id": str(r.id),
            "promo_code": promo.code if promo else "N/A",
            "promo_name": promo.name if promo else "N/A",
            "user_id": str(r.user_id),
            "user_name": user.name if user else "Unknown",
            "discount_applied": float(r.discount_applied),
            "transaction_id": str(r.transaction_id),
            "redeemed_at": r.redeemed_at.isoformat() if r.redeemed_at else None,
        })

    # Summary stats
    total_discount_stmt = select(func.sum(PromoRedemption.discount_applied))
    if promo_code_id:
        total_discount_stmt = total_discount_stmt.where(PromoRedemption.promo_code_id == promo_code_id)
    total_discount = float((await db.execute(total_discount_stmt)).scalar() or 0)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_discount_given": round(total_discount, 2),
    }


@router.get("/promo-redemptions/analytics")
async def get_promo_redemption_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get promo code redemption analytics overview"""
    # Per-code stats
    stmt = (
        select(
            PromoCode.id,
            PromoCode.code,
            PromoCode.name,
            PromoCode.discount_type,
            PromoCode.discount_value,
            PromoCode.max_uses,
            PromoCode.current_uses,
            PromoCode.is_active,
            func.count(PromoRedemption.id).label("redemptions"),
            func.sum(PromoRedemption.discount_applied).label("total_discount"),
        )
        .outerjoin(PromoRedemption, PromoCode.id == PromoRedemption.promo_code_id)
        .group_by(PromoCode.id)
        .order_by(func.count(PromoRedemption.id).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    codes = []
    for r in rows:
        conversion = round((r.current_uses / r.max_uses) * 100, 1) if r.max_uses else 0
        codes.append({
            "id": str(r.id),
            "code": r.code,
            "name": r.name,
            "discount_type": r.discount_type,
            "discount_value": float(r.discount_value),
            "max_uses": r.max_uses,
            "current_uses": r.current_uses,
            "is_active": r.is_active,
            "redemptions": r.redemptions or 0,
            "total_discount": round(float(r.total_discount or 0), 2),
            "usage_rate": conversion,
        })

    total_redemptions = sum(c["redemptions"] for c in codes)
    total_discount = sum(c["total_discount"] for c in codes)

    return {
        "codes": codes,
        "total_codes": len(codes),
        "total_redemptions": total_redemptions,
        "total_discount_given": round(total_discount, 2),
    }


# ============================================
# ARPU/ARPPU TRENDS (Feature 78)
# ============================================

@router.get("/revenue/arpu-trends")
async def get_arpu_trends(
    months: int = 6,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get ARPU/ARPPU historical trends"""
    now = datetime.utcnow()
    trends = []

    for i in range(months - 1, -1, -1):
        m_start = now - timedelta(days=30 * (i + 1))
        m_end = now - timedelta(days=30 * i)

        # Revenue in period
        rev_stmt = select(func.sum(RevenueTransaction.amount)).where(
            and_(
                RevenueTransaction.status == "completed",
                RevenueTransaction.created_at >= m_start,
                RevenueTransaction.created_at < m_end,
            )
        )
        revenue = float((await db.execute(rev_stmt)).scalar() or 0)

        # Total active users in period
        users_stmt = select(func.count(User.id)).where(
            and_(User.created_at < m_end, User.is_active == True)
        )
        total_users = (await db.execute(users_stmt)).scalar() or 1

        # Paying users in period
        paying_stmt = select(func.count(func.distinct(RevenueTransaction.user_id))).where(
            and_(
                RevenueTransaction.status == "completed",
                RevenueTransaction.created_at >= m_start,
                RevenueTransaction.created_at < m_end,
            )
        )
        paying_users = (await db.execute(paying_stmt)).scalar() or 0

        arpu = round(revenue / total_users, 2) if total_users else 0
        arppu = round(revenue / paying_users, 2) if paying_users else 0

        trends.append({
            "month": m_start.strftime("%b %Y"),
            "revenue": round(revenue, 2),
            "total_users": total_users,
            "paying_users": paying_users,
            "arpu": arpu,
            "arppu": arppu,
            "paying_ratio": round((paying_users / total_users) * 100, 1) if total_users else 0,
        })

    return {"trends": trends, "months": months}


# ============================================
# PAYMENT GATEWAY ENDPOINTS (Features 71-72)
# ============================================

@router.get("/payments/gateways")
async def get_payment_gateways(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get payment gateway stats (Real DB)"""
    days = {"week": 7, "month": 30, "quarter": 90}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    stmt = (
        select(
            PaymentGatewayLog.gateway,
            func.count(PaymentGatewayLog.id).label("total_events"),
            func.avg(PaymentGatewayLog.response_time_ms).label("avg_response_time"),
            func.count(PaymentGatewayLog.id).filter(
                PaymentGatewayLog.event_type == "payment_completed"
            ).label("success_count"),
            func.count(PaymentGatewayLog.id).filter(
                PaymentGatewayLog.event_type == "payment_failed"
            ).label("failure_count"),
        )
        .where(PaymentGatewayLog.created_at >= start_date)
        .group_by(PaymentGatewayLog.gateway)
    )
    result = await db.execute(stmt)
    rows = result.all()

    gateways = []
    for r in rows:
        total = r.total_events or 1
        success = r.success_count or 0
        failure = r.failure_count or 0
        gateways.append({
            "gateway": r.gateway,
            "total_events": total,
            "success_count": success,
            "failure_count": failure,
            "success_rate": round((success / total) * 100, 1),
            "failure_rate": round((failure / total) * 100, 1),
            "avg_response_time_ms": round(float(r.avg_response_time or 0)),
        })

    return {"gateways": gateways, "period": period}


@router.get("/payments/failed")
async def get_failed_payments(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get failed payment transactions"""
    stmt = (
        select(RevenueTransaction)
        .where(RevenueTransaction.status == "failed")
        .order_by(RevenueTransaction.created_at.desc())
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    items = []
    for t in transactions:
        user = await db.get(User, t.user_id)
        items.append({
            "id": str(t.id),
            "user_id": str(t.user_id),
            "user_name": user.name if user else "Unknown",
            "amount": float(t.amount),
            "currency": t.currency,
            "payment_gateway": t.payment_gateway,
            "transaction_type": t.transaction_type,
            "created_at": t.created_at.isoformat(),
            "metadata": t.custom_metadata or {},
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/payments/{transaction_id}/retry")
async def retry_failed_payment(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Retry a failed payment transaction"""
    tx = await db.get(RevenueTransaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed transactions can be retried")

    # Create a new pending transaction as retry
    retry_tx = RevenueTransaction(
        user_id=tx.user_id,
        transaction_type=tx.transaction_type,
        amount=tx.amount,
        currency=tx.currency,
        status="pending",
        payment_gateway=tx.payment_gateway,
        subscription_id=tx.subscription_id,
        promo_code_id=tx.promo_code_id,
        custom_metadata={**(tx.custom_metadata or {}), "retry_of": str(tx.id)},
    )
    db.add(retry_tx)

    # Mark original as retried
    tx.custom_metadata = {**(tx.custom_metadata or {}), "retried": True, "retry_id": str(retry_tx.id)}

    # Log gateway event
    log = PaymentGatewayLog(
        gateway=tx.payment_gateway or "unknown",
        event_type="payment_retry",
        transaction_id=tx.id,
        request_data={"original_tx": str(tx.id), "admin": str(current_user.id)},
    )
    db.add(log)

    await db.commit()
    await db.refresh(retry_tx)

    return {"status": "success", "retry_transaction_id": str(retry_tx.id)}


# ============================================
# SUBSCRIPTIONS DETAILS
# ============================================

@router.get("/subscriptions", response_model=dict)
async def get_subscription_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get detailed subscription statistics"""
    # Total Subscriptions
    result = await db.execute(select(func.count(UserSubscription.id)))
    total_subs = result.scalar() or 0
    
    # Active Subscriptions
    result = await db.execute(select(func.count(UserSubscription.id)).where(UserSubscription.status == 'active'))
    active_subs = result.scalar() or 0
    
    # Cancelled/Expired
    result = await db.execute(select(func.count(UserSubscription.id)).where(UserSubscription.status.in_(['cancelled', 'expired'])))
    inactive_subs = result.scalar() or 0
    
    return {
        "total_subscriptions": total_subs,
        "active_subscriptions": active_subs,
        "inactive_subscriptions": inactive_subs,
        "breakdown": {
            "active": active_subs,
            "inactive": inactive_subs
        }
    }


# ============================================
# VIRTUAL GIFTS API
# ============================================

from backend.models.monetization import VirtualGift, GiftCategory, GiftTransaction
from backend.schemas.monetization import (
    GiftCategoryResponse, VirtualGiftResponse, GiftTransactionResponse,
    GiftCatalogResponse, SendGiftRequest, ReceivedGiftsResponse, 
    SentGiftsResponse, MarkGiftReadRequest, VirtualGiftCreate, GiftCategoryCreate
)
from backend.core.websocket import manager

# Public gifts router (accessible by authenticated users)
gifts_router = APIRouter(prefix="/gifts", tags=["gifts"])


@gifts_router.get("/catalog", response_model=GiftCatalogResponse)
async def get_gift_catalog(
    category_id: Optional[uuid.UUID] = None,
    include_premium: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """
    Get available virtual gifts catalog.
    
    Filtering options:
    - category_id: Filter by specific category
    - include_premium: Include premium gifts (default: True)
    
    NOTE: Cached for 1 hour to reduce DB load.
    """
    import json
    
    # FIX (CACHE): Try Redis cache first
    cache_key = f"gifts_catalog:{category_id or 'all'}:{include_premium}"
    cached = None
    try:
        cached = await redis_manager.get_value(cache_key)
    except Exception:
        pass  # Redis not available, skip cache
    
    if cached:
        try:
            data = json.loads(cached)
            return GiftCatalogResponse(**data)
        except Exception:
            pass  # Cache miss or corrupt data, continue to DB
    
    # Get categories
    cat_stmt = select(GiftCategory).where(GiftCategory.is_active == True).order_by(GiftCategory.sort_order)
    cat_result = await db.execute(cat_stmt)
    categories = cat_result.scalars().all()
    
    # Get gifts
    gift_stmt = select(VirtualGift).where(VirtualGift.is_active == True)
    
    if category_id:
        gift_stmt = gift_stmt.where(VirtualGift.category_id == category_id)
    
    if not include_premium:
        gift_stmt = gift_stmt.where(VirtualGift.is_premium == False)
    
    # Exclude expired limited gifts
    gift_stmt = gift_stmt.where(
        or_(
            VirtualGift.available_until == None,
            VirtualGift.available_until > datetime.utcnow()
        )
    )
    
    gift_stmt = gift_stmt.order_by(VirtualGift.sort_order, VirtualGift.price)
    gift_result = await db.execute(gift_stmt)
    gifts = gift_result.scalars().all()
    
    response = GiftCatalogResponse(
        categories=[GiftCategoryResponse.model_validate(c) for c in categories],
        gifts=[VirtualGiftResponse.model_validate(g) for g in gifts],
        total_gifts=len(gifts)
    )
    
    # Store in cache for 1 hour
    try:
        await redis_manager.set_value(cache_key, response.model_dump_json(), expire=3600)
    except Exception:
        pass  # Don't fail if cache write fails
    
    return response


@gifts_router.post("/send", response_model=GiftTransactionResponse)
async def send_gift(
    request: SendGiftRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """
    Send a virtual gift to another user.
    
    This endpoint:
    1. Validates the gift exists and is available
    2. Deducts the gift price from sender's balance (Telegram Stars)
    3. Creates a gift transaction
    4. Sends a WebSocket notification to the receiver
    5. Updates gift statistics
    """
    sender_id = uuid.UUID(current_user)
    
    # 1. Validate gift exists
    gift = await db.get(VirtualGift, request.gift_id)
    if not gift or not gift.is_active:
        raise HTTPException(status_code=404, detail="Gift not found or unavailable")
    
    # Check if gift is expired
    if gift.available_until and gift.available_until < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This gift is no longer available")
    
    # Check max quantity
    # Wrap everything in an ATOMIC TRANSACTION
    try:
        async with db.begin():
            # 1. Validate gift still available
            # Use with_for_update() on gift to prevent over-selling limited items
            result = await db.execute(select(VirtualGift).where(VirtualGift.id == request.gift_id).with_for_update())
            gift = result.scalar_one_or_none()
            if not gift:
                raise HTTPException(status_code=404, detail="Gift not found")
            if not gift.is_active:
                raise HTTPException(status_code=400, detail="This gift is no longer available")
            if gift.max_quantity and gift.times_sent >= gift.max_quantity:
                raise HTTPException(status_code=400, detail="This gift has reached its maximum quantity")

            # 2. Lock Sender and Receiver to prevent race conditions (Lost Update)
            # Crucial: Always lock user rows in the same order (e.g. by ID) to prevent deadlocks
            user_ids = sorted([sender_id, request.receiver_id])
            result = await db.execute(
                select(User).where(User.id.in_(user_ids)).with_for_update()
            )
            users_map = {str(u.id): u for u in result.scalars().all()}
            
            sender = users_map.get(str(sender_id))
            receiver = users_map.get(str(request.receiver_id))
            
            if not sender: raise HTTPException(status_code=404, detail="Sender not found")
            if not receiver: raise HTTPException(status_code=404, detail="Receiver not found")
            if sender_id == request.receiver_id:
                raise HTTPException(status_code=400, detail="Cannot send gift to yourself")

            # 3. Budget Check and Deduct
            if sender.stars_balance < gift.price:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient balance. Required: {gift.price} XTR, Available: {sender.stars_balance} XTR"
                )
            
            # ATOMIC UPDATES via locked records
            sender.stars_balance = sender.stars_balance - gift.price
            
            receiver_bonus = int(gift.price * 0.1)
            if receiver_bonus > 0:
                receiver.stars_balance = (receiver.stars_balance or 0) + receiver_bonus
            
            # 5. Create transactions
            transaction = GiftTransaction(
                sender_id=sender_id,
                receiver_id=request.receiver_id,
                gift_id=gift.id,
                price_paid=gift.price,
                currency=gift.currency,
                message=request.message,
                status="completed",
                is_anonymous=request.is_anonymous
            )
            db.add(transaction)
            
            gift.times_sent += 1
            
            revenue_tx = RevenueTransaction(
                user_id=sender_id,
                transaction_type="gift",
                amount=gift.price,
                currency=gift.currency,
                status="completed",
                payment_gateway="telegram_stars",
                custom_metadata={
                    "gift_id": str(gift.id),
                    "gift_name": gift.name,
                    "receiver_id": str(request.receiver_id)
                }
            )
            db.add(revenue_tx)
            await db.flush()
            transaction.payment_transaction_id = revenue_tx.id
            
            # Success! Transaction is committed automatically at end of block
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Atomic gift delivery failed: {e}")
        raise HTTPException(status_code=500, detail="Transaction failed")

    
    # 9. Send WebSocket notification to receiver
    notification = {
        "type": "gift_received",
        "transaction_id": str(transaction.id),
        "gift_id": str(gift.id),
        "gift_name": gift.name,
        "gift_image": gift.image_url,
        "sender_id": str(sender_id) if not request.is_anonymous else None,
        "sender_name": sender.name if sender and not request.is_anonymous else "Anonymous",
        "sender_photo": sender.photos[0] if sender and sender.photos and not request.is_anonymous else None,
        "message": request.message,
        "bonus_received": receiver_bonus,  # 10% bonus for receiver
        "timestamp": transaction.created_at.isoformat()
    }
    
    # Trigger Admin update via Pub/Sub
    await redis_manager.publish("admin_updates", {"type": "gift_sent", "amount": gift.price})

    
    # Check if receiver is online and send via WebSocket
    is_receiver_online = manager.is_user_online(str(request.receiver_id))
    if is_receiver_online:
        await manager.send_personal_message(notification, str(request.receiver_id))
    
    # 9b. Send Push Notification if user is offline
    if not is_receiver_online:
        from backend.services.notification import send_push_notification
        try:
            sender_display = "Someone" if request.is_anonymous else (sender.name or "A user")
            bonus_text = f" (+{receiver_bonus} ⭐)" if receiver_bonus > 0 else ""
            await send_push_notification(
                db=db,
                user_id=str(request.receiver_id),
                title=f"🎁 {sender_display} sent you a gift!",
                body=f"You received a {gift.name}{bonus_text}",
                url="/gifts",
                tag=f"gift_{transaction.id}"
            )
        except Exception as push_err:
            print(f"Push notification failed: {push_err}")
    
    # 10. Create a chat message for the gift (so it appears in chat history)
    # Find match between sender and receiver
    from backend.models.interaction import Match
    from backend.models.chat import Message
    
    match_stmt = select(Match).where(
        and_(
            Match.is_active == True,
            or_(
                and_(Match.user1_id == sender_id, Match.user2_id == request.receiver_id),
                and_(Match.user1_id == request.receiver_id, Match.user2_id == sender_id)
            )
        )
    )
    match_result = await db.execute(match_stmt)
    match = match_result.scalar_one_or_none()
    
    if match:
        # Create gift message in chat
        gift_message = Message(
            match_id=match.id,
            sender_id=sender_id,
            receiver_id=request.receiver_id,
            text=f"🎁 Sent a gift: {gift.name}",
            type="gift",
            photo_url=gift.image_url,  # Store gift image for rendering
        )
        db.add(gift_message)
        await db.commit()
        await db.refresh(gift_message)
        
        # Send gift message via WebSocket as a chat message too
        gift_chat_message = {
            "type": "gift",
            "message_id": str(gift_message.id),
            "sender_id": str(sender_id),
            "match_id": str(match.id),
            "receiver_id": str(request.receiver_id),
            "content": gift_message.text,
            "photo_url": gift.image_url,
            "gift_name": gift.name,
            "gift_id": str(gift.id),
            "timestamp": gift_message.created_at.isoformat(),
            "is_anonymous": request.is_anonymous
        }
        await manager.send_personal_message(gift_chat_message, str(request.receiver_id))
    
    # Build response with enriched data
    response = GiftTransactionResponse(
        id=transaction.id,
        sender_id=transaction.sender_id,
        receiver_id=transaction.receiver_id,
        gift_id=transaction.gift_id,
        price_paid=float(transaction.price_paid),
        currency=transaction.currency,
        message=transaction.message,
        status=transaction.status,
        is_anonymous=transaction.is_anonymous,
        is_read=transaction.is_read,
        read_at=transaction.read_at,
        created_at=transaction.created_at,
        gift=VirtualGiftResponse.model_validate(gift) # Pydantic v2 recommendation
    )
    
    return response


@gifts_router.get("/received", response_model=ReceivedGiftsResponse)
async def get_received_gifts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """
    Get gifts received by the current user.
    """
    user_id = uuid.UUID(current_user)
    
    # Get transactions
    stmt = select(GiftTransaction).where(
        GiftTransaction.receiver_id == user_id
    )
    
    if unread_only:
        stmt = stmt.where(GiftTransaction.is_read == False)
    
    # Get total count
    count_stmt = select(func.count(GiftTransaction.id)).where(
        GiftTransaction.receiver_id == user_id
    )
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    # Get unread count
    unread_stmt = select(func.count(GiftTransaction.id)).where(
        and_(
            GiftTransaction.receiver_id == user_id,
            GiftTransaction.is_read == False
        )
    )
    unread_result = await db.execute(unread_stmt)
    unread_count = unread_result.scalar() or 0
    
    # Apply pagination and ordering
    stmt = stmt.order_by(desc(GiftTransaction.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    
    # Enrich with gift and sender data
    enriched = []
    for tx in transactions:
        gift = await db.get(VirtualGift, tx.gift_id)
        sender = await db.get(User, tx.sender_id) if not tx.is_anonymous else None
        
        enriched.append(GiftTransactionResponse(
            id=tx.id,
            sender_id=tx.sender_id,
            receiver_id=tx.receiver_id,
            gift_id=tx.gift_id,
            price_paid=float(tx.price_paid),
            currency=tx.currency,
            message=tx.message,
            status=tx.status,
            is_anonymous=tx.is_anonymous,
            is_read=tx.is_read,
            read_at=tx.read_at,
            created_at=tx.created_at,
            gift=VirtualGiftResponse.model_validate(gift) if gift else None,
            sender_name=sender.name if sender and not tx.is_anonymous else ("Anonymous" if tx.is_anonymous else None),
            sender_photo=sender.photos[0] if sender and sender.photos and not tx.is_anonymous else None
        ))
    
    return ReceivedGiftsResponse(
        gifts=enriched,
        total=total,
        unread_count=unread_count
    )


@gifts_router.get("/sent", response_model=SentGiftsResponse)
async def get_sent_gifts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """
    Get gifts sent by the current user.
    """
    user_id = uuid.UUID(current_user)
    
    # Get transactions
    stmt = select(GiftTransaction).where(
        GiftTransaction.sender_id == user_id
    )
    
    # Get total count and sum
    count_stmt = select(func.count(GiftTransaction.id)).where(
        GiftTransaction.sender_id == user_id
    )
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    sum_stmt = select(func.sum(GiftTransaction.price_paid)).where(
        GiftTransaction.sender_id == user_id
    )
    sum_result = await db.execute(sum_stmt)
    total_spent = float(sum_result.scalar() or 0)
    
    # Apply pagination and ordering
    stmt = stmt.order_by(desc(GiftTransaction.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    
    # Enrich with gift and receiver data
    enriched = []
    for tx in transactions:
        gift = await db.get(VirtualGift, tx.gift_id)
        receiver = await db.get(User, tx.receiver_id)
        
        enriched.append(GiftTransactionResponse(
            id=tx.id,
            sender_id=tx.sender_id,
            receiver_id=tx.receiver_id,
            gift_id=tx.gift_id,
            price_paid=float(tx.price_paid),
            currency=tx.currency,
            message=tx.message,
            status=tx.status,
            is_anonymous=tx.is_anonymous,
            is_read=tx.is_read,
            read_at=tx.read_at,
            created_at=tx.created_at,
            gift=VirtualGiftResponse.model_validate(gift) if gift else None,
            receiver_name=receiver.name if receiver else None,
            receiver_photo=receiver.photos[0] if receiver and receiver.photos else None
        ))
    
    return SentGiftsResponse(
        gifts=enriched,
        total=total,
        total_spent=total_spent
    )


@gifts_router.post("/mark-read")
async def mark_gift_read(
    request: MarkGiftReadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """
    Mark a received gift as read.
    """
    user_id = uuid.UUID(current_user)
    
    transaction = await db.get(GiftTransaction, request.transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Gift transaction not found")
    
    if transaction.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to mark this gift as read")
    
    if not transaction.is_read:
        transaction.is_read = True
        transaction.read_at = datetime.utcnow()
        await db.commit()
    
    return {"status": "success", "is_read": True}


# Admin endpoints for managing gifts
@router.post("/gifts/categories", response_model=GiftCategoryResponse)
async def create_gift_category(
    category: GiftCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new gift category (admin only)"""
    db_category = GiftCategory(
        name=category.name,
        description=category.description,
        icon=category.icon,
        sort_order=category.sort_order
    )
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return GiftCategoryResponse.model_validate(db_category)


@router.post("/gifts", response_model=VirtualGiftResponse)
async def create_virtual_gift(
    gift: VirtualGiftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new virtual gift (admin only)"""
    db_gift = VirtualGift(
        name=gift.name,
        description=gift.description,
        image_url=gift.image_url,
        animation_url=gift.animation_url,
        price=gift.price,
        currency=gift.currency,
        is_animated=gift.is_animated,
        is_premium=gift.is_premium,
        is_limited=gift.is_limited,
        available_until=gift.available_until,
        max_quantity=gift.max_quantity,
        category_id=gift.category_id
    )
    db.add(db_gift)
    await db.commit()
    await db.refresh(db_gift)
    return VirtualGiftResponse.model_validate(db_gift)


@router.put("/gifts/{gift_id}", response_model=VirtualGiftResponse)
async def update_virtual_gift(
    gift_id: uuid.UUID,
    gift_data: VirtualGiftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update an existing virtual gift (admin only)"""
    gift = await db.get(VirtualGift, gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
    
    # Update fields
    gift.name = gift_data.name
    gift.description = gift_data.description
    gift.image_url = gift_data.image_url
    gift.animation_url = gift_data.animation_url
    gift.price = gift_data.price
    gift.currency = gift_data.currency
    gift.is_animated = gift_data.is_animated
    gift.is_premium = gift_data.is_premium
    gift.is_limited = gift_data.is_limited
    gift.is_active = gift_data.is_active if hasattr(gift_data, 'is_active') else True
    gift.available_until = gift_data.available_until
    gift.max_quantity = gift_data.max_quantity
    gift.category_id = gift_data.category_id
    gift.sort_order = gift_data.sort_order if hasattr(gift_data, 'sort_order') else gift.sort_order
    
    await db.commit()
    await db.refresh(gift)
    return VirtualGiftResponse.model_validate(gift)


@router.delete("/gifts/{gift_id}")
async def delete_virtual_gift(
    gift_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a virtual gift (admin only)"""
    gift = await db.get(VirtualGift, gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
    
    # Soft delete by setting is_active to False (preserves transaction history)
    gift.is_active = False
    await db.commit()
    
    return {"status": "success", "message": f"Gift '{gift.name}' has been deactivated"}


@router.post("/gifts/upload-image")
async def upload_gift_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Upload an image for a virtual gift (admin only)"""
    import shutil
    from pathlib import Path
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_types}")
    
    from backend.services.storage import storage_service
    url = await storage_service.save_gift_image(file, db)
    return {"url": url, "filename": url.split("/")[-1]}

@router.get("/gifts/analytics")
async def get_gift_analytics(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get gift sending analytics (admin only)"""
    
    # Get total gifts sent
    total_stmt = select(func.count(GiftTransaction.id))
    total_result = await db.execute(total_stmt)
    total_sent = total_result.scalar() or 0
    
    # Get total revenue from gifts
    revenue_stmt = select(func.sum(GiftTransaction.price_paid))
    revenue_result = await db.execute(revenue_stmt)
    total_revenue = float(revenue_result.scalar() or 0)
    
    # Get top gifts
    top_gifts_stmt = (
        select(VirtualGift.name, VirtualGift.times_sent, VirtualGift.price)
        .order_by(desc(VirtualGift.times_sent))
        .limit(10)
    )
    top_result = await db.execute(top_gifts_stmt)
    top_gifts = [{"name": r[0], "times_sent": r[1], "price": float(r[2])} for r in top_result]
    
    return {
        "total_gifts_sent": total_sent,
        "total_revenue": total_revenue,
        "currency": "XTR",
        "top_gifts": top_gifts,
        "period": period
    }


# ============================================
# PUBLIC PAYMENTS API (Top-Up)
# ============================================

from pydantic import BaseModel as PydanticBaseModel

class TopUpRequest(PydanticBaseModel):
    amount: int  # Amount of stars to purchase
    label: str = "Top Up"  # Optional label for the invoice

class TopUpResponse(PydanticBaseModel):
    invoice_link: str
    amount: int
    transaction_id: uuid.UUID

class DevAddStarsRequest(PydanticBaseModel):
    amount: int

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
    # Limit to 3 pending/created invoices in last 5 minutes
    recent_count_stmt = select(func.count(RevenueTransaction.id)).where(
        and_(
            RevenueTransaction.user_id == user_id,
            RevenueTransaction.created_at > datetime.utcnow() - timedelta(minutes=5),
            # Ideally counting 'pending' ones, or all? Screenshot implies simple time-based check.
            # We'll count all transactions initiated in last 5 mins.
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
    
    # 1. Create pending transaction and COMMIT immediately to release the DB connection
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
    
    # 3. Handle failure (New transaction block if we need to update status)
    if not invoice_link:
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


# Dev endpoint for testing (add stars without real payment)
dev_router = APIRouter(prefix="/dev", tags=["dev"])


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
    """
    Purchase a subscription with Telegram Stars.
    """
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
    """
    Купить пакет из 10 свайпов за 10 Telegram Stars.
    
    Используется когда дневной лимит исчерпан.
    """
    result = await buy_swipes_with_stars(db, str(current_user.id))
    return BuySwipesResponse(**result)


@payments_router.post("/buy-superlike", response_model=BuySwipesResponse)
async def buy_superlike(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """
    Купить 1 супер-лайк за 5 Telegram Stars.
    """
    result = await buy_superlike_with_stars(db, str(current_user.id))
    return BuySwipesResponse(**result)


@payments_router.post("/activate-boost", response_model=BoostResponse)
async def activate_boost(
    request: BoostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """
    Активировать буст профиля за Telegram Stars.
    
    Стоимость: 25 Stars за 1 час буста.
    Буст увеличивает видимость профиля в ленте.
    """
    result = await activate_boost_with_stars(db, str(current_user.id), request.duration_hours)
    return BoostResponse(**result)


@payments_router.get("/swipe-status")
async def get_swipe_status_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """
    Получить текущий статус свайпов пользователя.
    
    Включает:
    - Оставшиеся свайпы (daily + bonus)
    - Оставшиеся супер-лайки
    - Баланс Stars
    - Возможность купить свайпы/супер-лайки
    - Цены
    """
    return await get_swipe_status(db, str(current_user.id))



@payments_router.get("/pricing")
async def get_pricing():
    """
    Получить текущие цены на свайпы, супер-лайки и бусты.
    """
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
    """
    Check status of a specific transaction.
    User can only check their own transactions.
    """
    transaction = await db.get(RevenueTransaction, transaction_id)
    
    # If transaction not found or belongs to another user
    if not transaction or str(transaction.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {
        "status": transaction.status,
        "amount": transaction.amount,
        "completed_at": transaction.completed_at,
        "currency": transaction.currency
    }


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
    import os
    
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
