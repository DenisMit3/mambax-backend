"""
Revenue Analytics — metrics, trends, channels, churn, forecast, ARPU/ARPPU.
"""

from backend.api.monetization._common import *


# ============================================
# Pydantic models for analytics
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


# ============================================
# REVENUE METRICS
# ============================================

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

    total_users_res = await db.execute(select(func.count(User.id)))
    total_users = total_users_res.scalar() or 1
    
    paying_users_res = await db.execute(
        select(func.count(func.distinct(RevenueTransaction.user_id))).where(
            RevenueTransaction.status == 'completed'
        )
    )
    paying_users = paying_users_res.scalar() or 0

    arpu = revenue_month / total_users if total_users > 0 else 0
    arppu = revenue_month / paying_users if paying_users > 0 else 0

    from backend.models.user import SubscriptionTier
    
    async def get_sub_count(tier_name: str):
        res = await db.execute(select(func.count(User.id)).where(User.subscription_tier == tier_name))
        return res.scalar() or 0

    free_count = await get_sub_count('free')
    gold_count = await get_sub_count('gold')
    platinum_count = await get_sub_count('platinum')
    
    total_subs = free_count + gold_count + platinum_count or 1

    sub_breakdown = SubscriptionBreakdown(
        free=SubscriptionBreakdownItem(count=free_count, percentage=(free_count/total_subs)*100),
        gold=SubscriptionBreakdownItem(count=gold_count, percentage=(gold_count/total_subs)*100),
        platinum=SubscriptionBreakdownItem(count=platinum_count, percentage=(platinum_count/total_subs)*100),
    )

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


# ============================================
# REVENUE TREND
# ============================================

@router.get("/revenue/trend")
async def get_revenue_trend(
    period: str = "30d",
    granularity: str = "day",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get revenue trend data for charts (Real DB)"""
    days = 30
    if period == "7d":
        days = 7
    elif period == "90d":
        days = 90
        
    start_date = datetime.utcnow() - timedelta(days=days)
    
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
    
    data_map = {str(row.date): {"revenue": float(row.revenue or 0), "transactions": row.transactions} for row in rows}
    
    trend_data = []
    for i in range(days):
        date_obj = datetime.utcnow() - timedelta(days=days - 1 - i)
        date_str = date_obj.strftime("%Y-%m-%d")
        day_data = data_map.get(date_str, {"revenue": 0, "transactions": 0})
        trend_data.append({
            "date": date_str,
            "revenue": day_data["revenue"],
            "transactions": day_data["transactions"],
            "new_subscribers": 0
        })
        
    return {"trend": trend_data}


# ============================================
# REVENUE BY CHANNEL
# ============================================

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


# ============================================
# CHURN ANALYSIS
# ============================================

@router.get("/revenue/churn")
async def get_churn_analysis(
    period: str = "month",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get churn analysis by subscription tier (Real DB)"""
    days = {"week": 7, "month": 30, "quarter": 90, "year": 365}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

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

    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    stmt = select(func.sum(RevenueTransaction.amount)).where(
        and_(
            RevenueTransaction.status == "completed",
            RevenueTransaction.created_at >= current_month_start,
        )
    )
    current_mrr = float((await db.execute(stmt)).scalar() or 0)

    growth_rates = []
    for i in range(1, len(monthly_revenues)):
        if monthly_revenues[i - 1] > 0:
            rate = (monthly_revenues[i] - monthly_revenues[i - 1]) / monthly_revenues[i - 1]
            growth_rates.append(rate)
    avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0.05

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
# ARPU/ARPPU TRENDS
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

        rev_stmt = select(func.sum(RevenueTransaction.amount)).where(
            and_(
                RevenueTransaction.status == "completed",
                RevenueTransaction.created_at >= m_start,
                RevenueTransaction.created_at < m_end,
            )
        )
        revenue = float((await db.execute(rev_stmt)).scalar() or 0)

        users_stmt = select(func.count(User.id)).where(
            and_(User.created_at < m_end, User.is_active == True)
        )
        total_users = (await db.execute(users_stmt)).scalar() or 1

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
