"""
MambaX Telegram Bot Entry Point
===============================
Initializes the Bot and Dispatcher, registers routers, and handles startup.
Logic is distributed across backend/telegram_bot/handlers/
"""

import asyncio
import os
import logging
from aiogram import Bot, Dispatcher
from dotenv import load_dotenv
from pathlib import Path

# Import Routers
from backend.telegram_bot.handlers.commands import router as commands_router
from backend.telegram_bot.handlers.payment import router as payment_router

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    # Warning instead of raise to allow importing file even without token (for tests)
    logger.warning("TELEGRAM_BOT_TOKEN is missing! Bot will not start.")

# ============================================================================
# BOT INITIALIZATION
# ============================================================================

if BOT_TOKEN:
    bot = Bot(token=BOT_TOKEN)
else:
    bot = None

dp = Dispatcher()

# Register Routers
# Order matters: more specific handlers first? 
# In aiogram 3, routers traverse in order.
dp.include_router(payment_router)  # Handle payments first (important)
dp.include_router(commands_router) # Commands and general callbacks

# ============================================================================
# RUN (POLLING)
# ============================================================================

async def main():
    if not bot:
        logger.error("Cannot start polling: No BOT_TOKEN")
        return
        
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("🚀 Starting Bot in POLLING mode...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
