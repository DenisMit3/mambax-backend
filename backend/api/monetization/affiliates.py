"""
Affiliate program management (admin).
"""

from backend.api.monetization._common import *


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
