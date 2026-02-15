"""
Transactions management + Refund management.
"""

from backend.api.monetization._common import *


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
        
    if tx.status == "refunded":
        raise HTTPException(status_code=400, detail="Already refunded")
        
    if tx.status != "completed":
        raise HTTPException(status_code=400, detail="Transaction not completed")

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
    
    # Refund Balance
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
    
    tx = await db.get(RevenueTransaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if tx.status != "completed":
        raise HTTPException(status_code=400, detail="Can only refund completed transactions")
        
    if tx.payment_gateway != "telegram_stars":
         raise HTTPException(status_code=400, detail="Not a Telegram Stars transaction")

    if not tx.gateway_transaction_id:
        raise HTTPException(status_code=400, detail="No Telegram charge ID found")
        
    user = await db.get(User, tx.user_id)
    if not user or not user.telegram_id:
         raise HTTPException(status_code=400, detail="User Telegram ID not found")
         
    success = await refund_stars_payment(
        user_id=int(user.telegram_id),
        telegram_payment_charge_id=tx.gateway_transaction_id
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Telegram API refund failed")
        
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(stars_balance=User.stars_balance - tx.amount)
    )
    
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
    
    count_stmt = select(func.count()).select_from(Refund)
    if status:
        count_stmt = count_stmt.where(Refund.status == status)
    total = (await db.execute(count_stmt)).scalar() or 0
    
    stmt = stmt.offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    refunds = result.scalars().all()
    
    items = []
    for r in refunds:
        tx = await db.get(RevenueTransaction, r.transaction_id) if r.transaction_id else None
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
        if refund.transaction_id:
            tx = await db.get(RevenueTransaction, refund.transaction_id)
            if tx:
                tx.status = "refunded"
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
