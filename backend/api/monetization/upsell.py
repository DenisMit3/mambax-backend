"""
Upsell opportunities analysis (admin).
"""

from backend.api.monetization._common import *


@router.get("/upsell/opportunities")
async def get_upsell_opportunities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Identify upsell opportunities (Real DB)"""
    now = datetime.utcnow()

    # Segment 1: Active free users
    free_active_stmt = select(func.count(User.id)).where(
        and_(
            User.subscription_tier == "free",
            User.is_active == True,
            User.last_seen >= now - timedelta(days=7),
        )
    )
    free_active = (await db.execute(free_active_stmt)).scalar() or 0

    # Segment 2: Gold users who bought boosts
    gold_boost_stmt = select(func.count(func.distinct(BoostPurchase.user_id))).join(
        User, BoostPurchase.user_id == User.id
    ).where(
        and_(
            User.subscription_tier == "gold",
            BoostPurchase.created_at >= now - timedelta(days=30),
        )
    )
    gold_boosters = (await db.execute(gold_boost_stmt)).scalar() or 0

    # Segment 3: Lapsed premium
    lapsed_stmt = select(func.count(func.distinct(UserSubscription.user_id))).where(
        and_(
            UserSubscription.status.in_(["cancelled", "expired"]),
            UserSubscription.cancelled_at >= now - timedelta(days=60),
            UserSubscription.cancelled_at < now - timedelta(days=7),
        )
    )
    lapsed = (await db.execute(lapsed_stmt)).scalar() or 0

    # Segment 4: Users who bought superlikes
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
