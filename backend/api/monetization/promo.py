"""
Promo code redemption tracking (admin).
"""

from backend.api.monetization._common import *


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
