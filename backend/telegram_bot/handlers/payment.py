import logging
import uuid
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from aiogram import Router, types, F
from aiogram.enums import ParseMode
from sqlalchemy import select

from backend.db.session import async_session_maker
from backend.services.telegram_payments import answer_pre_checkout_query
from backend.models.monetization import RevenueTransaction
from backend.models.user import User
from backend.telegram_bot import texts
from backend.services.gifts import deliver_gift
from backend.services.monetization import buy_subscription_with_stars
from backend.core.websocket import manager

logger = logging.getLogger(__name__)
router = Router()

@router.pre_checkout_query()
async def handle_pre_checkout(pre_checkout_query: types.PreCheckoutQuery):
    """
    Handle pre-checkout query - MUST respond within 10 seconds.
    Validates the payment before Telegram processes it.
    """
    payload = pre_checkout_query.invoice_payload
    # logger.info(f"Pre-checkout query received.") # Don't log payload if sensitive
    
    try:
        # Validate transaction exists and is pending
        async with async_session_maker() as db:
            try:
                transaction_id = UUID(payload)
                transaction = await db.get(RevenueTransaction, transaction_id)
                
                if not transaction:
                    logger.error(f"Pre-checkout: Transaction not found: {payload}")
                    await answer_pre_checkout_query(
                        pre_checkout_query_id=pre_checkout_query.id,
                        ok=False,
                        error_message="Транзакция не найдена. Попробуйте снова."
                    )
                    return
                
                if transaction.status != "pending":
                    logger.warning(f"Pre-checkout: Transaction already processed: {payload}")
                    await answer_pre_checkout_query(
                        pre_checkout_query_id=pre_checkout_query.id,
                        ok=False,
                        error_message="Эта транзакция уже обработана."
                    )
                    return
                
                # All checks passed - approve the payment
                await answer_pre_checkout_query(
                    pre_checkout_query_id=pre_checkout_query.id,
                    ok=True
                )
                logger.info(f"Pre-checkout approved for transaction {payload}")
                
            except ValueError:
                logger.error(f"Pre-checkout: Invalid payload format.")
                await answer_pre_checkout_query(
                    pre_checkout_query_id=pre_checkout_query.id,
                    ok=False,
                    error_message="Неверный формат данных платежа."
                )
                
    except Exception as e:
        logger.error(f"Pre-checkout error: {e}")
        # In case of error, still try to respond (better UX than timeout)
        await answer_pre_checkout_query(
            pre_checkout_query_id=pre_checkout_query.id,
            ok=False,
            error_message="Ошибка валидации. Попробуйте позже."
        )

@router.message(F.successful_payment)
async def handle_successful_payment(message: types.Message):
    """
    Handle successful payment - update user balance and transaction status.
    Called after Telegram has processed the payment.
    """
    payment = message.successful_payment
    payload = payment.invoice_payload  # Our transaction_id
    telegram_payment_id = payment.telegram_payment_charge_id
    telegram_user_id = message.from_user.id
    amount = payment.total_amount  # Amount in Stars (XTR)
    
    logger.info(f"Successful payment received from user {telegram_user_id}")
    
    try:
        transaction_id = UUID(payload)
        
        async with async_session_maker() as db:
            # 0. Idempotency Check (Charge ID)
            stmt = select(RevenueTransaction).where(RevenueTransaction.gateway_transaction_id == telegram_payment_id)
            existing_tx = (await db.execute(stmt)).scalars().first()
            
            if existing_tx:
                logger.warning(f"Payment already processed (charge_id={telegram_payment_id})")
                await message.answer(texts.TRANSACTION_EXISTS)
                return

            # 1. Find pending transaction
            transaction = await db.get(RevenueTransaction, transaction_id)
            
            if not transaction:
                logger.error(f"Payment processing: Transaction not found: {payload}")
                await message.answer(texts.PAYMENT_ERROR)
                return
            
            if transaction.status == "completed":
                # Still send confirmation to user logic could go here
                return
            
            # 2. Update transaction status
            transaction.status = "completed"
            transaction.gateway_transaction_id = telegram_payment_id
            transaction.telegram_charge_id = telegram_payment_id
            transaction.completed_at = datetime.utcnow()
            transaction.custom_metadata = {
                **(transaction.custom_metadata or {}),
                "telegram_user_id": str(telegram_user_id),
                "telegram_charge_id": telegram_payment_id
            }
            
            # 3. Update user balance
            user = await db.get(User, transaction.user_id)
            if not user:
                logger.error(f"User not found for transaction: {transaction.user_id}")
                return

            # Security Check
            if user.telegram_id and str(user.telegram_id) != str(telegram_user_id):
                logger.critical(f"SECURITY ALERT: Telegram ID mismatch for tx {transaction.id}")
                await message.answer(texts.SECURITY_ERROR)
                return

            # Process specific payment types
            await process_payment_type(db, user, transaction, amount, message)
            
            await db.commit()
            
            # Notify frontend
            await notify_frontend(transaction.user_id, user.stars_balance)

            # Send confirmation
            await message.answer(
                texts.PAYMENT_SUCCESS.format(amount=amount, balance=user.stars_balance),
                parse_mode=ParseMode.MARKDOWN
            )
            
    except Exception as e:
        logger.error(f"Payment processing error: {e}")
        await message.answer(texts.PAYMENT_ERROR)


async def process_payment_type(db, user, transaction, amount, message):
    """Delegate payment processing based on type"""
    tx_type = transaction.transaction_type
    
    if tx_type == "gift_purchase":
        await process_gift_purchase(db, user, transaction, amount, message)
    elif tx_type == "subscription":
        await process_subscription_purchase(db, user, transaction, amount, message)
    else:
        # Default Top Up
        user.stars_balance = (user.stars_balance or Decimal("0")) + Decimal(str(amount))

async def process_gift_purchase(db, user, transaction, amount, message):
    meta = transaction.custom_metadata or {}
    try:
        await deliver_gift(
            db=db,
            sender_id=user.id,
            receiver_id=uuid.UUID(meta.get("receiver_id")),
            gift_id=uuid.UUID(meta.get("gift_id")),
            message=meta.get("message"),
            is_anonymous=meta.get("is_anonymous", False),
            price_paid=float(amount),
            payment_transaction_id=transaction.id
        )
        await message.answer(texts.GIFT_SENT)
    except Exception as e:
        logger.error(f"Gift delivery failed: {e}")
        # Fallback: Add to balance
        user.stars_balance = (user.stars_balance or Decimal("0")) + Decimal(str(amount))
        await message.answer("⚠️ Payment successful but gift delivery failed. Stars added to balance.")

async def process_subscription_purchase(db, user, transaction, amount, message):
    # 1. Credit Balance first
    user.stars_balance = (user.stars_balance or Decimal("0")) + Decimal(str(amount))
    
    # 2. Try to activate subscription using that balance
    tier = transaction.custom_metadata.get("plan_tier")
    if tier:
        res = await buy_subscription_with_stars(db, str(user.id), tier)
        if res.get("success"):
             await message.answer(f"✅ Subscription activated: {res.get('plan')}")
        else:
             await message.answer(f"💰 Balance topped up. Auto-activation failed: {res.get('error')}")

async def notify_frontend(user_id, new_balance):
    try:
        await manager.send_personal_message({
            "type": "balance_update",
            "balance": float(new_balance)
        }, str(user_id))
    except Exception as e:
        logger.error(f"WS notification failed: {e}")

