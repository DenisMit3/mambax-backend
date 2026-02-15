"""
Boosts & Super Likes analytics (admin).
"""

from backend.api.monetization._common import *


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
