"""
Virtual Gifts — public gifts_router + admin gift management endpoints.
"""

import json
from backend.api.monetization._common import *
from backend.services.chat import manager

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
    
    # Wrap everything in an ATOMIC TRANSACTION
    try:
        async with db.begin():
            # 1. Validate gift still available
            result = await db.execute(select(VirtualGift).where(VirtualGift.id == request.gift_id).with_for_update())
            gift = result.scalar_one_or_none()
            if not gift:
                raise HTTPException(status_code=404, detail="Gift not found")
            if not gift.is_active:
                raise HTTPException(status_code=400, detail="This gift is no longer available")
            if gift.max_quantity and gift.times_sent >= gift.max_quantity:
                raise HTTPException(status_code=400, detail="This gift has reached its maximum quantity")

            # 2. Lock Sender and Receiver to prevent race conditions
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
        "bonus_received": receiver_bonus,
        "timestamp": transaction.created_at.isoformat()
    }
    
    # Trigger Admin update via Pub/Sub
    await redis_manager.publish("admin_updates", {"type": "gift_sent", "amount": gift.price})

    
    # Check if receiver is online and send via WebSocket
    is_receiver_online = await manager.is_online_async(str(request.receiver_id))
    if is_receiver_online:
        await manager.send_personal(str(request.receiver_id), notification)
    
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
    
    # 10. Create a chat message for the gift
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
        gift_message = Message(
            match_id=match.id,
            sender_id=sender_id,
            receiver_id=request.receiver_id,
            text=f"🎁 Sent a gift: {gift.name}",
            type="gift",
            photo_url=gift.image_url,
        )
        db.add(gift_message)
        await db.commit()
        await db.refresh(gift_message)
        
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
        await manager.send_personal(str(request.receiver_id), gift_chat_message)
    
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
        gift=VirtualGiftResponse.model_validate(gift)
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
    """Get gifts received by the current user."""
    user_id = uuid.UUID(current_user)
    
    stmt = select(GiftTransaction).where(GiftTransaction.receiver_id == user_id)
    
    if unread_only:
        stmt = stmt.where(GiftTransaction.is_read == False)
    
    count_stmt = select(func.count(GiftTransaction.id)).where(GiftTransaction.receiver_id == user_id)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    unread_stmt = select(func.count(GiftTransaction.id)).where(
        and_(GiftTransaction.receiver_id == user_id, GiftTransaction.is_read == False)
    )
    unread_result = await db.execute(unread_stmt)
    unread_count = unread_result.scalar() or 0
    
    stmt = stmt.order_by(desc(GiftTransaction.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    
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
    
    return ReceivedGiftsResponse(gifts=enriched, total=total, unread_count=unread_count)


@gifts_router.get("/sent", response_model=SentGiftsResponse)
async def get_sent_gifts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """Get gifts sent by the current user."""
    user_id = uuid.UUID(current_user)
    
    stmt = select(GiftTransaction).where(GiftTransaction.sender_id == user_id)
    
    count_stmt = select(func.count(GiftTransaction.id)).where(GiftTransaction.sender_id == user_id)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0
    
    sum_stmt = select(func.sum(GiftTransaction.price_paid)).where(GiftTransaction.sender_id == user_id)
    sum_result = await db.execute(sum_stmt)
    total_spent = float(sum_result.scalar() or 0)
    
    stmt = stmt.order_by(desc(GiftTransaction.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    
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
    
    return SentGiftsResponse(gifts=enriched, total=total, total_spent=total_spent)


@gifts_router.post("/mark-read")
async def mark_gift_read(
    request: MarkGiftReadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: str = Depends(get_current_user_from_token)
):
    """Mark a received gift as read."""
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


# ============================================
# Admin endpoints for managing gifts
# ============================================

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
    total_stmt = select(func.count(GiftTransaction.id))
    total_result = await db.execute(total_stmt)
    total_sent = total_result.scalar() or 0
    
    revenue_stmt = select(func.sum(GiftTransaction.price_paid))
    revenue_result = await db.execute(revenue_stmt)
    total_revenue = float(revenue_result.scalar() or 0)
    
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
