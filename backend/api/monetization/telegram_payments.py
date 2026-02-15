"""
Telegram Stars Payment Flow — invoice creation for subscriptions and gifts.
"""

from backend.api.monetization._common import *


@router.post("/telegram/create-invoice", response_model=TelegramStarsInvoice)
async def create_telegram_invoice(
    request: TelegramPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Generates a Telegram Stars Invoice Link.
    """
    # 1. Fetch Plan
    plan = await db.get(SubscriptionPlan, request.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Create Pending Transaction
    transaction = RevenueTransaction(
        user_id=current_user.id,
        transaction_type="subscription",
        amount=plan.price,
        currency="XTR",
        status="pending",
        payment_gateway="telegram_stars",
        custom_metadata={"plan_id": str(plan.id), "plan_name": plan.name}
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # 3. Generate Link (Real using Bot API)
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not bot_token:
        # Fallback for dev without token
        invoice_link = f"https://t.me/MambaXBot?start=invoice_{transaction.id}"
    else:
        # Call Telegram API
        async with httpx.AsyncClient() as client:
            payload = {
                "title": f"MambaX {plan.name}",
                "description": f"{plan.duration_days} days premium access",
                "payload": str(transaction.id),
                "currency": "XTR",
                "prices": [{"label": plan.name, "amount": int(plan.price)}],
                "provider_token": ""  # Empty for Telegram Stars
            }
            try:
                resp = await client.post(
                    f"https://api.telegram.org/bot{bot_token}/createInvoiceLink",
                    json=payload
                )
                data = resp.json()
                if data.get("ok"):
                    invoice_link = data["result"]
                else:
                    print(f"Telegram API Error: {data}")
                    raise HTTPException(status_code=500, detail=f"Telegram Error: {data.get('description')}")
            except Exception as e:
                print(f"Invoice Gen Failed: {e}")
                raise HTTPException(status_code=500, detail="Failed to connect to Telegram API")

    return TelegramStarsInvoice(
        invoice_link=invoice_link,
        amount=int(plan.price),
        currency="XTR",
        transaction_id=transaction.id
    )


@router.post("/payments/gift", response_model=TelegramStarsInvoice)
async def create_gift_purchase_invoice(
    request: SendGiftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """
    Generate Invoice for Direct Gift Purchase (Telegram Stars).
    """
    from backend.services.telegram_payments import create_stars_invoice

    # 1. Fetch Gift
    gift = await db.get(VirtualGift, request.gift_id)
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
        
    if not gift.is_active:
        raise HTTPException(status_code=400, detail="Gift is not active")

    # 2. Create Pending RevenueTransaction
    transaction = RevenueTransaction(
        user_id=current_user.id,
        transaction_type="gift_purchase",
        amount=gift.price,
        currency="XTR",
        status="pending",
        payment_gateway="telegram_stars",
        custom_metadata={
            "gift_id": str(gift.id),
            "gift_name": gift.name,
            "receiver_id": str(request.receiver_id),
            "message": request.message,
            "is_anonymous": request.is_anonymous
        }
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    
    # 3. Create Invoice Link
    title = f"Gift: {gift.name}"
    description = f"Send {gift.name} to user"
    
    invoice_link = await create_stars_invoice(
        title=title,
        description=description,
        payload=str(transaction.id),
        amount=int(gift.price),
        photo_url=gift.image_url if gift.image_url.startswith("http") else None
    )
    
    if not invoice_link:
        raise HTTPException(status_code=500, detail="Failed to generate invoice link")
    
    return TelegramStarsInvoice(
        invoice_link=invoice_link,
        amount=int(gift.price),
        currency="XTR",
        transaction_id=transaction.id
    )
