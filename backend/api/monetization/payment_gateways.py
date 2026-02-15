"""
Payment gateway stats, failed payments, retry (admin).
"""

from backend.api.monetization._common import *


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
