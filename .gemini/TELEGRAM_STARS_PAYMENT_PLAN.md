# ⭐ TELEGRAM STARS PAYMENT INTEGRATION PLAN

## Executive Summary
Integrate real Telegram Stars (XTR) payments to replace mock invoice links. Users will purchase Stars packages via native Telegram payment flow, with automatic balance update upon successful payment.

---

## ARCHITECTURE OVERVIEW

```
┌─────────────┐    ┌───────────────┐    ┌──────────────────┐
│  Frontend   │───▶│   Backend     │───▶│  Telegram Bot API│
│ (TopUpModal)│    │ /payments/    │    │  createInvoice   │
└─────────────┘    │  top-up       │    │  Link            │
                   └───────────────┘    └──────────────────┘
                          │                      │
                          │                      ▼
                          │              ┌──────────────────┐
                          │              │ Telegram Payment │
                          │              │ (Native UI)      │
                          │              └──────────────────┘
                          │                      │
                          ▼                      ▼
                   ┌───────────────┐    ┌──────────────────┐
                   │ Bot Webhook   │◀───│ successful_      │
                   │ /bot/webhook  │    │ payment update   │
                   └───────────────┘    └──────────────────┘
                          │
                          ▼
                   ┌───────────────┐
                   │ Update User   │
                   │ stars_balance │
                   └───────────────┘
```

---

## TASK 1: CREATE TELEGRAM PAYMENT SERVICE

### 1.1 Create telegram_payments.py service
**File:** `backend/services/telegram_payments.py`
**Action:** CREATE new file

**Content:**
```python
"""
Telegram Stars Payment Service

Uses Telegram Bot API to create invoices and process payments.
Documentation: https://core.telegram.org/bots/api#payments
"""

import os
import logging
import httpx
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"


async def create_stars_invoice(
    title: str,
    description: str,
    payload: str,  # Our transaction_id
    amount: int,  # Amount in Stars (XTR)
    photo_url: Optional[str] = None,
) -> Optional[str]:
    """
    Create invoice link for Telegram Stars payment.
    
    Args:
        title: Product name (1-32 characters)
        description: Product description (1-255 characters)
        payload: Bot-defined invoice payload (our transaction_id)
        amount: Amount in Telegram Stars
        photo_url: Optional product photo URL
        
    Returns:
        Invoice URL or None if failed
    """
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not configured")
        return None
    
    # Prepare request data
    data = {
        "title": title[:32],
        "description": description[:255],
        "payload": payload,
        "currency": "XTR",  # Telegram Stars
        "prices": [{"label": f"{amount} Stars", "amount": amount}],
        # provider_token is OMITTED for XTR payments
    }
    
    if photo_url:
        data["photo_url"] = photo_url
        data["photo_width"] = 512
        data["photo_height"] = 512
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/createInvoiceLink",
                json=data,
                timeout=10.0
            )
            result = response.json()
            
            if result.get("ok"):
                invoice_url = result["result"]
                logger.info(f"Created invoice: {invoice_url}")
                return invoice_url
            else:
                logger.error(f"Invoice creation failed: {result}")
                return None
                
    except Exception as e:
        logger.error(f"Invoice creation error: {e}")
        return None


async def answer_pre_checkout_query(
    pre_checkout_query_id: str,
    ok: bool = True,
    error_message: Optional[str] = None
) -> bool:
    """
    Answer pre-checkout query from Telegram.
    Must be called within 10 seconds of receiving the query.
    
    Args:
        pre_checkout_query_id: Query ID from Telegram
        ok: True to allow payment, False to reject
        error_message: Error message if rejecting
        
    Returns:
        True if answered successfully
    """
    if not BOT_TOKEN:
        return False
    
    data = {
        "pre_checkout_query_id": pre_checkout_query_id,
        "ok": ok
    }
    
    if not ok and error_message:
        data["error_message"] = error_message
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/answerPreCheckoutQuery",
                json=data,
                timeout=10.0
            )
            result = response.json()
            return result.get("ok", False)
            
    except Exception as e:
        logger.error(f"Pre-checkout answer error: {e}")
        return False


async def refund_stars_payment(
    user_id: int,
    telegram_payment_charge_id: str
) -> bool:
    """
    Refund a Telegram Stars payment.
    
    Args:
        user_id: Telegram user ID
        telegram_payment_charge_id: Charge ID from successful_payment
        
    Returns:
        True if refund successful
    """
    if not BOT_TOKEN:
        return False
    
    data = {
        "user_id": user_id,
        "telegram_payment_charge_id": telegram_payment_charge_id
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/refundStarPayment",
                json=data,
                timeout=10.0
            )
            result = response.json()
            return result.get("ok", False)
            
    except Exception as e:
        logger.error(f"Refund error: {e}")
        return False
```

### Verification:
- [ ] File `backend/services/telegram_payments.py` exists
- [ ] Function `create_stars_invoice()` uses correct XTR parameters
- [ ] `provider_token` is NOT included (required for XTR)

---

## TASK 2: UPDATE TOP-UP ENDPOINT

### 2.1 Modify /payments/top-up to use real invoice
**File:** `backend/api/monetization.py`
**Action:** MODIFY
**Location:** `create_topup()` function (lines 1170-1211)

**Current code (mock):**
```python
    # Generate invoice link
    # In production, use Telegram Bot API createInvoiceLink
    invoice_link = f"https://t.me/$stars_topup_{transaction.id}"
```

**Replace with:**
```python
    # Generate real invoice link via Telegram Bot API
    from backend.services.telegram_payments import create_stars_invoice
    
    invoice_link = await create_stars_invoice(
        title=f"{request.amount} Telegram Stars",
        description=f"Top up your balance with {request.amount} Stars for sending gifts",
        payload=str(transaction.id),  # Our transaction ID as payload
        amount=request.amount,
        photo_url="https://yourapp.com/static/stars_icon.png"  # Optional
    )
    
    if not invoice_link:
        # Fallback to mock for development without bot token
        import os
        if os.getenv("ENVIRONMENT") == "development":
            invoice_link = f"https://t.me/$stars_topup_{transaction.id}"
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to create payment invoice"
            )
```

### Verification:
- [ ] Real invoice URL returned when BOT_TOKEN configured
- [ ] Fallback to mock in development
- [ ] Transaction ID passed as payload

---

## TASK 3: HANDLE PAYMENT WEBHOOK

### 3.1 Add payment handlers to bot.py
**File:** `backend/bot.py`
**Action:** MODIFY
**Location:** After existing message handlers

**Add imports:**
```python
from aiogram.types import PreCheckoutQuery, Message
from aiogram import F
```

**Add handlers:**
```python
# ============================================
# PAYMENT HANDLERS
# ============================================

@dp.pre_checkout_query()
async def handle_pre_checkout(pre_checkout_query: PreCheckoutQuery):
    """
    Handle pre-checkout query - MUST respond within 10 seconds.
    Validate the payment is still valid and answer OK.
    """
    from backend.services.telegram_payments import answer_pre_checkout_query
    
    # In a full implementation, you might:
    # 1. Verify the transaction still exists
    # 2. Check for fraud
    # 3. Validate amounts
    
    # For now, always approve
    await answer_pre_checkout_query(
        pre_checkout_query_id=pre_checkout_query.id,
        ok=True
    )


@dp.message(F.successful_payment)
async def handle_successful_payment(message: Message):
    """
    Handle successful payment - update user balance.
    """
    import logging
    from uuid import UUID
    from backend.db.session import async_session
    from backend.models import User
    from backend.models.monetization import RevenueTransaction
    
    logger = logging.getLogger(__name__)
    
    payment = message.successful_payment
    payload = payment.invoice_payload  # Our transaction_id
    telegram_payment_id = payment.telegram_payment_charge_id
    telegram_user_id = message.from_user.id
    amount = payment.total_amount  # in Stars
    
    logger.info(f"Successful payment: {amount} XTR, payload={payload}, user={telegram_user_id}")
    
    try:
        transaction_id = UUID(payload)
        
        async with async_session() as db:
            # 1. Find pending transaction
            transaction = await db.get(RevenueTransaction, transaction_id)
            
            if not transaction:
                logger.error(f"Transaction not found: {payload}")
                return
            
            if transaction.status != "pending":
                logger.warning(f"Transaction already processed: {payload}")
                return
            
            # 2. Update transaction
            transaction.status = "completed"
            transaction.gateway_transaction_id = telegram_payment_id
            transaction.completed_at = datetime.utcnow()
            
            # 3. Update user balance
            user = await db.get(User, transaction.user_id)
            if user:
                user.stars_balance = (user.stars_balance or 0) + amount
                logger.info(f"Updated balance for user {user.id}: +{amount} Stars")
            
            await db.commit()
            
            # 4. Send confirmation message
            await message.answer(
                f"✅ Платёж успешен!\n\n"
                f"💫 Зачислено: {amount} Stars\n"
                f"💰 Ваш баланс: {user.stars_balance} Stars\n\n"
                f"Спасибо за покупку!"
            )
            
    except Exception as e:
        logger.error(f"Payment processing error: {e}")
        await message.answer(
            "⚠️ Произошла ошибка при обработке платежа. "
            "Средства будут зачислены в ближайшее время."
        )
```

### 3.2 Add datetime import if missing
**File:** `backend/bot.py`
**Check:** Ensure `from datetime import datetime` is present

### Verification:
- [ ] `@dp.pre_checkout_query()` handler exists
- [ ] `@dp.message(F.successful_payment)` handler exists
- [ ] User balance updated on successful payment
- [ ] Confirmation message sent

---

## TASK 4: ADD WEBHOOK ALLOWED_UPDATES

### 4.1 Update webhook setup
**File:** `backend/api/bot_webhook.py`
**Action:** MODIFY
**Location:** `setup_webhook()` function

**Current code:**
```python
        result = await bot.set_webhook(
            url=full_webhook_url,
            allowed_updates=["message", "callback_query", "inline_query"],
```

**Change to:**
```python
        result = await bot.set_webhook(
            url=full_webhook_url,
            allowed_updates=[
                "message",
                "callback_query",
                "inline_query",
                "pre_checkout_query",  # For payment pre-checkout
            ],
```

### Verification:
- [ ] `pre_checkout_query` added to allowed_updates

---

## TASK 5: UPDATE FRONTEND TOPUPMODAL

### 5.1 Handle real Telegram invoice
**File:** `frontend/src/components/ui/TopUpModal.tsx`
**Action:** MODIFY
**Location:** `handlePurchase()` function

**Current behavior:** Opens invoice via `window.Telegram?.WebApp?.openInvoice()`
**Required:** Continue using the same approach - it works for real invoices too!

**Verify current code handles the response:**
```typescript
// The existing code should work:
window.Telegram?.WebApp?.openInvoice(data.invoice_url, (status) => {
    if (status === 'paid') {
        // Payment successful - refresh balance
        onSuccess?.();
    }
});
```

### 5.2 Add polling to check balance after payment
**File:** `frontend/src/components/ui/TopUpModal.tsx`
**Action:** MODIFY (optional enhancement)

The `openInvoice` callback isn't always reliable. Add a fallback:

```typescript
const checkBalanceUpdate = async (expectedAmount: number) => {
    // Wait a moment for webhook to process
    await new Promise(r => setTimeout(r, 2000));
    
    // Fetch updated user data
    try {
        const userData = await authService.getMe();
        // Call onSuccess if balance increased
        onSuccess?.();
    } catch (e) {
        console.error("Balance check failed:", e);
    }
};
```

### Verification:
- [ ] `openInvoice()` call exists
- [ ] `onSuccess` callback refreshes user data
- [ ] Loading state handled correctly

---

## TASK 6: ADD USER TELEGRAM_ID MAPPING

### 6.1 Ensure telegram_id is stored on User model
**File:** `backend/models/user.py`
**Check:** Verify field exists:
```python
telegram_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True)
```

### 6.2 Update payment handler to find user by telegram_id
**File:** `backend/bot.py`
**Location:** `handle_successful_payment()` function

**Alternative approach if transaction.user_id is unreliable:**
```python
# Find user by telegram_id if needed
from sqlalchemy import select
result = await db.execute(
    select(User).where(User.telegram_id == str(telegram_user_id))
)
user = result.scalar_one_or_none()
```

### Verification:
- [ ] User can be found by telegram_id
- [ ] Payment credited to correct user

---

## TASK 7: ENVIRONMENT CONFIGURATION

### 7.1 Required environment variables
**File:** `.env` or Railway environment

```env
# Required for payments
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Required for webhook mode
WEBHOOK_URL=https://your-domain.com

# Optional: Set to "production" to disable dev endpoints
ENVIRONMENT=production
```

### 7.2 Verify bot has payment permissions
**Telegram requirement:** Bot must be connected to a payment provider.
For XTR payments, no external provider needed - just Bot API.

### Verification:
- [ ] `TELEGRAM_BOT_TOKEN` is set
- [ ] Bot can call `createInvoiceLink` successfully

---

## EXECUTION ORDER

```
┌────────────────────────────────────────────────────────────────┐
│  PHASE 1: Backend Service (Sequential)                         │
│  1.1 Create telegram_payments.py service                       │
│  2.1 Update /payments/top-up endpoint                          │
├────────────────────────────────────────────────────────────────┤
│  PHASE 2: Webhook Handlers (Sequential)                         │
│  3.1 Add pre_checkout_query handler                            │
│  3.2 Add successful_payment handler                            │
│  4.1 Update allowed_updates in webhook setup                   │
├────────────────────────────────────────────────────────────────┤
│  PHASE 3: Frontend (Parallel with Phase 2)                     │
│  5.1 Verify TopUpModal works with real invoices                │
│  5.2 Optional: Add balance polling fallback                    │
├────────────────────────────────────────────────────────────────┤
│  PHASE 4: Testing                                              │
│  7.1 Test in development (mock mode)                           │
│  7.2 Test in Telegram test environment                         │
│  7.3 Production deployment                                      │
└────────────────────────────────────────────────────────────────┘
```

---

## FILES SUMMARY

### Files to CREATE:
1. `backend/services/telegram_payments.py` — Payment service

### Files to MODIFY:
1. `backend/api/monetization.py` — Real invoice creation
2. `backend/bot.py` — Payment handlers
3. `backend/api/bot_webhook.py` — Allowed updates

### Files to VERIFY:
1. `frontend/src/components/ui/TopUpModal.tsx` — Should work as-is
2. `backend/models/user.py` — telegram_id field

---

## TESTING PROCEDURE

### Step 1: Local Development (Mock Mode)
- Without `TELEGRAM_BOT_TOKEN`, mock links are generated
- Dev endpoint `/dev/add-stars` still works

### Step 2: Telegram Test Environment
- Use `@BotFather` to create a test bot
- Use test Stars (no real money)
- Set up webhook to ngrok tunnel

### Step 3: Production
- Deploy to Railway/Vercel
- Set `WEBHOOK_URL`
- Test with real Stars purchase

---

## ROLLBACK PLAN

If payment integration fails:
1. Keep mock invoice generation as fallback
2. `/dev/add-stars` endpoint remains for testing
3. Existing balances unaffected

---

## SECURITY CONSIDERATIONS

1. **Payload validation**: Always verify transaction exists before crediting
2. **Idempotency**: Check transaction status to prevent double-crediting
3. **Telegram signature**: For production, verify webhook signature
4. **Rate limiting**: Consider limits on payment attempts
5. **Logging**: Log all payment events for audit trail
