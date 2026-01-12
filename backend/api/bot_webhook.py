"""
Telegram Bot Webhook Integration
=================================
Интеграция Telegram бота с FastAPI через webhook.

Режимы работы:
- POLLING: для локальной разработки (python bot.py)
- WEBHOOK: для продакшена (интегрировано в main.py)

Настройка webhook:
1. Задеплоить бэкенд на Railway
2. Установить WEBHOOK_URL в переменных окружения
3. Бот автоматически зарегистрирует webhook при старте
"""

import os
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.types import Update
from fastapi import APIRouter, Request, HTTPException
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEBHOOK_PATH = f"/bot/webhook/{BOT_TOKEN}" if BOT_TOKEN else "/bot/webhook/invalid"
WEBHOOK_URL = os.getenv("WEBHOOK_URL")  # e.g., https://mambax-production.up.railway.app
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "mambax-secret-token-change-in-prod")

# ============================================================================
# ROUTER
# ============================================================================

router = APIRouter(tags=["Telegram Bot"])

# Import bot and dispatcher from bot.py
# This is done lazily to avoid circular imports
_bot = None
_dp = None

def get_bot_and_dp():
    """Lazy import of bot and dispatcher"""
    global _bot, _dp
    if _bot is None:
        from backend.bot import bot, dp
        _bot = bot
        _dp = dp
    return _bot, _dp

# ============================================================================
# WEBHOOK ENDPOINT
# ============================================================================

@router.post(WEBHOOK_PATH)
async def telegram_webhook(request: Request):
    """
    Webhook endpoint для получения обновлений от Telegram.
    Telegram отправляет POST запросы на этот URL при новых событиях.
    """
    # 1. Verify Secret Token
    secret_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if secret_token != WEBHOOK_SECRET:
        logger.warning("Webhook Unauthorized: Invalid Secret Token")
        raise HTTPException(status_code=403, detail="Invalid Secret Token")

    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    try:
        bot, dp = get_bot_and_dp()
        
        # Parse incoming update
        update_data = await request.json()
        update = Update(**update_data)
        
        # Process update
        await dp.feed_update(bot, update)
        
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        # Return 200 to prevent Telegram from retrying
        return {"ok": False, "error": str(e)}

# ============================================================================
# WEBHOOK SETUP
# ============================================================================

async def setup_webhook(backend_url: str = None):
    """
    Регистрация webhook URL в Telegram.
    Вызывается при старте приложения в продакшене.
    """
    if not BOT_TOKEN:
        logger.error("Cannot setup webhook: BOT_TOKEN not set")
        return False
    
    webhook_url = backend_url or WEBHOOK_URL
    if not webhook_url:
        logger.warning("WEBHOOK_URL not set, skipping webhook setup")
        return False
    
    full_webhook_url = f"{webhook_url}{WEBHOOK_PATH}"
    
    try:
        bot, _ = get_bot_and_dp()
        
        # Delete existing webhook
        await bot.delete_webhook(drop_pending_updates=True)
        
        # Set new webhook
        result = await bot.set_webhook(
            url=full_webhook_url,
            allowed_updates=[
                "message",
                "callback_query",
                "inline_query",
                "pre_checkout_query",  # Required for Telegram Stars payments
            ],
            drop_pending_updates=True,
            secret_token=WEBHOOK_SECRET
        )
        
        if result:
            logger.info(f"✅ Webhook set: {full_webhook_url}")
            return True
        else:
            logger.error("Failed to set webhook")
            return False
            
    except Exception as e:
        logger.error(f"Webhook setup error: {e}")
        return False

async def delete_webhook():
    """Удаление webhook (для перехода в режим polling)"""
    if not BOT_TOKEN:
        return False
    
    try:
        bot, _ = get_bot_and_dp()
        await bot.delete_webhook(drop_pending_updates=True)
        logger.info("Webhook deleted")
        return True
    except Exception as e:
        logger.error(f"Webhook delete error: {e}")
        return False

# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/bot/status")
async def bot_status():
    """Статус бота"""
    if not BOT_TOKEN:
        return {
            "status": "error",
            "message": "BOT_TOKEN not configured"
        }
    
    try:
        bot, _ = get_bot_and_dp()
        bot_info = await bot.get_me()
        webhook_info = await bot.get_webhook_info()
        
        return {
            "status": "ok",
            "bot": {
                "id": bot_info.id,
                "username": bot_info.username,
                "name": bot_info.first_name
            },
            "webhook": {
                "url": webhook_info.url or "not set (polling mode)",
                "pending_updates": webhook_info.pending_update_count,
                "last_error": webhook_info.last_error_message
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@router.post("/bot/setup-webhook")
async def api_setup_webhook(request: Request):
    """API для ручной настройки webhook"""
    try:
        data = await request.json()
        url = data.get("url")
        
        if not url:
            raise HTTPException(status_code=400, detail="URL required")
        
        success = await setup_webhook(url)
        
        if success:
            return {"status": "ok", "message": f"Webhook set to {url}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to set webhook")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bot/delete-webhook")
async def api_delete_webhook():
    """API для удаления webhook (переход в polling)"""
    success = await delete_webhook()
    
    if success:
        return {"status": "ok", "message": "Webhook deleted, use polling mode"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete webhook")
