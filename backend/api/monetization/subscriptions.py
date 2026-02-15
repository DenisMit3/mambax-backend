"""
Subscription statistics (admin).
"""

from backend.api.monetization._common import *


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
