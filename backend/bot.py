import asyncio
import os
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize bot and dispatcher
# Default token is a placeholder, ensure it's set in .env or replaced
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8531547163:AAEE2xF6cfTqshbtSVjGktz3bDkj8Pwum0E")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://t.me/MambaXBot/app") # Replace with actial Direct Link if needed or just URL

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """
    Send a message with a button that opens the Web App.
    """
    # Get WebApp URL from env
    web_app_url = os.getenv("FRONTEND_URL")
    if not web_app_url:
        web_app_url = "https://mambax-frontend.vercel.app" # Default fallback
        logging.warning("FRONTEND_URL not set in .env, using default: %s", web_app_url)

    kb = [
        [
            InlineKeyboardButton(text="Open Dating App 💘", web_app=WebAppInfo(url=web_app_url))
        ]
    ]
    keyboard = InlineKeyboardMarkup(inline_keyboard=kb)
    
    await message.answer(
        "Welcome to MambaX! 🚀\n\nFind your soulmate with AI-powered matching.",
        reply_markup=keyboard
    )

async def main():
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
