from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.db.session import get_db
from backend.auth import get_current_user_from_token
from backend.models.user import User
from backend.models.monetization import RevenueTransaction
from backend.schemas.monetization import TelegramStarsInvoice
from pydantic import BaseModel
import httpx
import os
import uuid

router = APIRouter(prefix="/api/payments", tags=["payments"])

class TopUpRequest(BaseModel):
    amount: int
    label: str = "Top Up"

@router.post("/invoice", response_model=TelegramStarsInvoice)
async def create_invoice(
    data: TopUpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """
    Generate Invoice for Telegram Stars (XTR) Top-Up.
    User pays XTR -> We credit their internal balance.
    """
    
    # 1. Create Transaction (Pending)
    transaction = RevenueTransaction(
        user_id=current_user.id,
        transaction_type="topup",
        amount=data.amount,
        currency="XTR",
        status="pending",
        payment_gateway="telegram_stars",
        custom_metadata={"label": data.label}
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # 2. Generate Telegram Invoice Link
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    # Fallback for local testing if no token
    if not bot_token:
        # Mock link that frontend can intercept if needed, 
        # but realistically WebApp.openInvoice needs a real link.
        # We will return a dummy that works with our debug frontend logic if any.
        return TelegramStarsInvoice(
            invoice_link=f"https://t.me/YouMeMeet_bot?start=invoice_{transaction.id}",
            amount=data.amount,
            currency="XTR",
            transaction_id=transaction.id
        )

    # Real API Call
    async with httpx.AsyncClient() as client:
        payload = {
            "title": f"Top Up: {data.amount} Stars",
            "description": f"Add {data.amount} Stars to your balance",
            "payload": str(transaction.id),
            "currency": "XTR",
            "prices": [{"label": data.label, "amount": int(data.amount)}],
            "provider_token": "" # Empty for Stars
        }
        
        try:
            resp = await client.post(
                f"https://api.telegram.org/bot{bot_token}/createInvoiceLink",
                json=payload
            )
            result = resp.json()
            
            if not result.get("ok"):
                print(f"Telegram Invoice Error: {result}")
                raise HTTPException(status_code=500, detail=result.get("description", "Telegram API Error"))
                
            invoice_link = result["result"]
            
        except Exception as e:
            print(f"Invoice Generation Failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate invoice")

    return TelegramStarsInvoice(
        invoice_link=invoice_link,
        amount=data.amount,
        currency="XTR",
        transaction_id=transaction.id
    )

@router.get("/status/{transaction_id}")
async def check_status(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    try:
        uuid_id = uuid.UUID(transaction_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID")

    tx = await db.get(RevenueTransaction, uuid_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    return {"status": tx.status, "amount": tx.amount}
