"""
Telegram Stars Payment Service

Uses Telegram Bot API to create invoices and process payments.
Documentation: https://core.telegram.org/bots/api#payments

For XTR (Telegram Stars) payments:
- Currency must be "XTR"
- provider_token must be OMITTED or empty
- prices must contain exactly ONE item
"""

import logging
import httpx
from backend.core.config import settings
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Using settings.TELEGRAM_BOT_TOKEN



def get_api_base() -> str:
    """Get Telegram Bot API base URL."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return ""
    return f"https://api.telegram.org/bot{token}"


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
    api_base = get_api_base()
    if not api_base:
        logger.error("TELEGRAM_BOT_TOKEN not configured")
        return None
    
    # Prepare request data for XTR payments
    # Note: provider_token is NOT included for XTR
    data = {
        "title": title[:32],
        "description": description[:255],
        "payload": payload,
        "currency": "XTR",  # Telegram Stars
        "prices": [{"label": f"{amount} Stars", "amount": amount}],
    }
    
    if photo_url:
        data["photo_url"] = photo_url
        data["photo_width"] = 512
        data["photo_height"] = 512
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/createInvoiceLink",
                json=data,
                timeout=10.0
            )
            result = response.json()
            
            if result.get("ok"):
                invoice_url = result["result"]
                logger.info(f"Created invoice link: {invoice_url}")
                return invoice_url
            else:
                logger.error(f"Invoice creation failed: {result.get('description', 'Unknown error')}")
                return None
                
    except httpx.TimeoutException:
        logger.error("Invoice creation timeout")
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
    api_base = get_api_base()
    if not api_base:
        logger.error("TELEGRAM_BOT_TOKEN not configured")
        return False
    
    data = {
        "pre_checkout_query_id": pre_checkout_query_id,
        "ok": ok
    }
    
    if not ok and error_message:
        data["error_message"] = error_message[:255]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/answerPreCheckoutQuery",
                json=data,
                timeout=10.0
            )
            result = response.json()
            
            if result.get("ok"):
                logger.info(f"Pre-checkout answered: ok={ok}")
                return True
            else:
                logger.error(f"Pre-checkout answer failed: {result.get('description')}")
                return False
                
    except httpx.TimeoutException:
        logger.critical(f"TIMEOUT answering pre-checkout {pre_checkout_query_id}! Query will be auto-rejected by Telegram.")
        return False
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
        user_id: Telegram user ID (integer)
        telegram_payment_charge_id: Charge ID from successful_payment
        
    Returns:
        True if refund successful
    """
    api_base = get_api_base()
    if not api_base:
        logger.error("TELEGRAM_BOT_TOKEN not configured")
        return False
    
    data = {
        "user_id": user_id,
        "telegram_payment_charge_id": telegram_payment_charge_id
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/refundStarPayment",
                json=data,
                timeout=10.0
            )
            result = response.json()
            
            if result.get("ok"):
                logger.info(f"Refund successful for charge {telegram_payment_charge_id}")
                return True
            else:
                logger.error(f"Refund failed: {result.get('description')}")
                return False
                
    except Exception as e:
        logger.error(f"Refund error: {e}")
        return False


async def send_message(
    chat_id: int,
    text: str,
    parse_mode: str = "HTML"
) -> bool:
    """
    Send a message to a Telegram user.
    
    Args:
        chat_id: Telegram user/chat ID
        text: Message text
        parse_mode: Parse mode (HTML or Markdown)
        
    Returns:
        True if sent successfully
    """
    api_base = get_api_base()
    if not api_base:
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{api_base}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode
                },
                timeout=10.0
            )
            return response.json().get("ok", False)
    except Exception as e:
        logger.error(f"Send message error: {e}")
        return False
