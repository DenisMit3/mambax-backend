"""
Admin Monetization endpoints: revenue, subscriptions, promos.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, or_, cast, Date, select
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import uuid as uuid_module

from backend.database import get_db
from backend.models.user import User, SubscriptionTier
from backend.models.monetization import UserSubscription, RevenueTransaction, PromoCode
from backend.models.system import AuditLog
from .deps import get_current_admin

router = APIRouter()


class PromoCodeCreate(BaseModel):
    code: str
    discount_percent: int = 0
    discount_amount: float = 0
    max_uses: int = 100
    valid_until: Optional[str] = None
    description: Optional[str] = None


@router.get("/monetization/revenue")
async def get_revenue_metrics(
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get revenue metrics with real data"""
    now = datetime.utcnow()
    today = now.date()

    result = await db.execute(
        select(func.sum(RevenueTransaction.amount)).where(
            and_(RevenueTransaction.status == 'completed', cast(RevenueTransaction.created_at, Date) == today)
        )
    )
    today_revenue = float(result.scalar() or 0)

    result = await db.execute(
        select(func.sum(RevenueTransaction.amount)).where(
            and_(RevenueTransaction.status == 'completed', RevenueTransaction.created_at >= now - timedelta(days=7))
        )
    )
    week_revenue = float(result.scalar() or 0)

    result = await db.execute(
        select(func.sum(RevenueTransaction.amount)).where(
            and_(RevenueTransaction.status == 'completed', RevenueTransaction.created_at >= now - timedelta(days=30))
        )
    )
    month_revenue = float(result.scalar() or 0)

    result = await db.execute(
        select(func.sum(RevenueTransaction.amount)).where(
            and_(RevenueTransaction.status == 'completed', RevenueTransaction.created_at >= now - timedelta(days=365))
        )
    )
    year_revenue = float(result.scalar() or 0)

    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 1

    result = await db.execute(
        select(func.count(func.distinct(RevenueTransaction.user_id))).where(
            and_(RevenueTransaction.status == 'completed', RevenueTransaction.created_at >= now - timedelta(days=30))
        )
    )
    paying_users = result.scalar() or 1

    arpu = round(month_revenue / total_users, 2)
    arppu = round(month_revenue / max(paying_users, 1), 2)

    tiers = ['free', 'gold', 'platinum', 'vip']
    breakdown = {}
    for tier in tiers:
        if tier == 'free':
            result = await db.execute(
                select(func.count(User.id)).where(
                    or_(User.subscription_tier == tier, User.subscription_tier.is_(None))
                )
            )
        else:
            result = await db.execute(
                select(func.count(User.id)).where(User.subscription_tier == tier)
            )
        breakdown[tier] = result.scalar() or 0

    return {
        "today": today_revenue,
        "week": week_revenue,
        "month": month_revenue,
        "year": year_revenue,
        "arpu": arpu,
        "arppu": arppu,
        "paying_users": paying_users,
        "subscription_breakdown": breakdown
    }


@router.get("/monetization/subscriptions")
async def get_subscriptions_overview(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get subscriptions list"""
    query = select(UserSubscription, User.name, User.email).join(
        User, UserSubscription.user_id == User.id
    )

    if status and status != 'all':
        query = query.where(UserSubscription.status == status)

    count_q = select(func.count(UserSubscription.id))
    if status and status != 'all':
        count_q = count_q.where(UserSubscription.status == status)
    result = await db.execute(count_q)
    total = result.scalar() or 0

    query = query.order_by(desc(UserSubscription.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for sub, name, email in rows:
        items.append({
            "id": str(sub.id),
            "user_id": str(sub.user_id),
            "user_name": name,
            "user_email": email,
            "plan": sub.plan,
            "status": sub.status,
            "amount": float(sub.amount) if sub.amount else 0,
            "started_at": sub.created_at.isoformat(),
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
        })

    return {
        "subscriptions": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/monetization/transactions")
async def get_transactions(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get revenue transactions list"""
    query = select(RevenueTransaction, User.name).outerjoin(
        User, RevenueTransaction.user_id == User.id
    )

    if status and status != 'all':
        query = query.where(RevenueTransaction.status == status)

    count_q = select(func.count(RevenueTransaction.id))
    if status and status != 'all':
        count_q = count_q.where(RevenueTransaction.status == status)
    result = await db.execute(count_q)
    total = result.scalar() or 0

    query = query.order_by(desc(RevenueTransaction.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for tx, name in rows:
        items.append({
            "id": str(tx.id),
            "user_id": str(tx.user_id),
            "user_name": name or "Неизвестный",
            "amount": float(tx.amount),
            "currency": tx.currency,
            "type": tx.type,
            "status": tx.status,
            "created_at": tx.created_at.isoformat(),
        })

    return {
        "transactions": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/monetization/promos")
async def get_promo_codes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all promo codes"""
    result = await db.execute(select(PromoCode).order_by(desc(PromoCode.created_at)))
    promos = result.scalars().all()

    return {
        "promos": [
            {
                "id": str(p.id),
                "code": p.code,
                "discount_percent": p.discount_percent,
                "discount_amount": float(p.discount_amount) if p.discount_amount else 0,
                "max_uses": p.max_uses,
                "current_uses": p.current_uses,
                "valid_until": p.valid_until.isoformat() if p.valid_until else None,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat(),
            }
            for p in promos
        ]
    }


@router.post("/monetization/promos")
async def create_promo_code(
    data: PromoCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new promo code"""
    existing = await db.execute(select(PromoCode).where(PromoCode.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Промокод уже существует")

    valid_until = None
    if data.valid_until:
        try:
            valid_until = datetime.fromisoformat(data.valid_until)
        except ValueError:
            raise HTTPException(status_code=400, detail="Некорректный формат даты")

    promo = PromoCode(
        code=data.code,
        discount_percent=data.discount_percent,
        discount_amount=data.discount_amount,
        max_uses=data.max_uses,
        valid_until=valid_until,
        description=data.description,
        is_active=True,
    )
    db.add(promo)

    db.add(AuditLog(
        admin_id=current_user.id,
        action="create_promo",
        target_resource=f"promo:{data.code}",
        changes={"code": data.code, "discount_percent": data.discount_percent}
    ))

    await db.commit()
    return {"status": "success", "message": f"Промокод {data.code} создан", "id": str(promo.id)}


@router.delete("/monetization/promos/{promo_id}")
async def delete_promo_code(
    promo_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Deactivate a promo code"""
    try:
        pid = uuid_module.UUID(promo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")

    result = await db.execute(select(PromoCode).where(PromoCode.id == pid))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")

    promo.is_active = False
    await db.commit()
    return {"status": "success", "message": "Промокод деактивирован"}
