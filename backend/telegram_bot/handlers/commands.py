import logging
from aiogram import Router, types, F
from aiogram.filters import Command, CommandStart
from aiogram.enums import ParseMode
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

from backend.db.session import async_session_maker
from backend.crud import user as crud_user
from backend.schemas.user import UserCreate
from backend.telegram_bot.keyboards import (
    get_main_keyboard, 
    get_back_keyboard, 
    get_premium_keyboard, 
    FRONTEND_URL
)
from backend.telegram_bot import texts

from backend.services.telegram_payments import create_stars_invoice
from backend.models.monetization import RevenueTransaction

logger = logging.getLogger(__name__)
router = Router()

@router.message(CommandStart())
async def cmd_start(message: types.Message):
    """Команда /start — приветствие"""
    user = message.from_user
    logger.info(f"User {user.id} (@{user.username}) started the bot")
    
    # Save user to DB
    try:
        async with async_session_maker() as db:
            db_user = await crud_user.get_user_by_telegram_id(db, str(user.id))
            
            if not db_user:
                if user.username:
                    db_user = await crud_user.get_user_by_username(db, user.username)
                    
                if db_user:
                    db_user.telegram_id = str(user.id)
                    db.add(db_user)
                    await db.commit()
                else:
                    new_user = UserCreate(
                        telegram_id=str(user.id),
                        username=user.username,
                        name=user.first_name,
                        age=18,
                        gender="other"
                    )
                    await crud_user.create_user(db, new_user)
    except Exception as e:
        logger.error(f"Failed to save user {user.id}: {e}")

    await message.answer(
        texts.WELCOME_MESSAGE.format(name=user.first_name), 
        reply_markup=get_main_keyboard(),
        parse_mode=ParseMode.MARKDOWN
    )

@router.message(Command("help"))
async def cmd_help(message: types.Message):
    """Команда /help"""
    await message.answer(texts.HELP_MESSAGE, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)

@router.message(Command("profile"))
async def cmd_profile(message: types.Message):
    profile_url = f"{FRONTEND_URL}/profile"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👤  Открыть профиль", web_app=WebAppInfo(url=profile_url))],
        [InlineKeyboardButton(text="⬅️  Назад в меню", callback_data="main_menu")]
    ])
    await message.answer(texts.PROFILE_MESSAGE, reply_markup=kb, parse_mode=ParseMode.MARKDOWN)

@router.message(Command("matches"))
async def cmd_matches(message: types.Message):
    chat_url = f"{FRONTEND_URL}/chat"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬  Открыть чаты", web_app=WebAppInfo(url=chat_url))],
        [InlineKeyboardButton(text="⬅️  Назад в меню", callback_data="main_menu")]
    ])
    await message.answer(texts.MATCHES_MESSAGE, reply_markup=kb, parse_mode=ParseMode.MARKDOWN)

@router.message(Command("premium"))
async def cmd_premium(message: types.Message):
    await show_premium(message)

# Callbacks

@router.callback_query(F.data == "main_menu")
async def callback_main_menu(callback: types.CallbackQuery):
    await callback.message.edit_text(texts.MAIN_MENU_TEXT, reply_markup=get_main_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@router.callback_query(F.data == "how_it_works")
async def callback_how_it_works(callback: types.CallbackQuery):
    await callback.message.edit_text(texts.HOW_IT_WORKS_TEXT, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@router.callback_query(F.data == "premium")
async def callback_premium(callback: types.CallbackQuery):
    await callback.message.edit_text(texts.PREMIUM_TEXT, reply_markup=get_premium_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@router.callback_query(F.data.in_({"buy_gold", "buy_vip"}))
async def callback_buy_subscription(callback: types.CallbackQuery):
    tier = "gold" if callback.data == "buy_gold" else "platinum"
    amount = 500 if tier == "gold" else 1000
    title = "MambaX Gold" if tier == "gold" else "MambaX VIP"
    description = f"Purchase {title} for 1 month"
    
    await initiate_payment(callback, amount, title, description, tier)

@router.callback_query(F.data == "free_trial")
async def callback_free_trial(callback: types.CallbackQuery):
    await callback.answer("Free trial is currently unavailable.", show_alert=True)

@router.callback_query(F.data == "faq")
async def callback_faq(callback: types.CallbackQuery):
    """Обработчик кнопки FAQ"""
    await callback.message.edit_text(
        "❓ Часто задаваемые вопросы:\n\n"
        "1. Как начать? — Нажмите '💘 Открыть MambaX'\n"
        "2. Как найти пару? — Свайпайте анкеты вправо\n"
        "3. Как написать? — После взаимного лайка откроется чат",
        reply_markup=get_back_keyboard()
    )
    await callback.answer()

@router.callback_query(F.data == "support")
async def callback_support(callback: types.CallbackQuery):
    """Обработчик кнопки поддержки"""
    await callback.message.edit_text(
        "📧 Поддержка:\n\n"
        "Напишите нам: @MambaX_support\n"
        "Или опишите проблему прямо здесь, и мы ответим в ближайшее время.",
        reply_markup=get_back_keyboard()
    )
    await callback.answer()

@router.callback_query(F.data == "stats")
async def callback_stats(callback: types.CallbackQuery):
    """Обработчик кнопки статистики"""
    await callback.message.edit_text(
        "📊 Статистика пока недоступна.\n\n"
        "Мы работаем над этой функцией!",
        reply_markup=get_back_keyboard()
    )
    await callback.answer()

@router.callback_query(F.data == "settings")
async def callback_settings(callback: types.CallbackQuery):
    """Обработчик кнопки настроек"""
    await callback.message.edit_text(
        "⚙️ Настройки доступны в приложении.\n\n"
        "Откройте MambaX и перейдите в раздел профиля.",
        reply_markup=get_back_keyboard()
    )
    await callback.answer()

# Helpers

async def show_premium(message: types.Message):
    await message.answer(texts.PREMIUM_TEXT, reply_markup=get_premium_keyboard(), parse_mode=ParseMode.MARKDOWN)

async def initiate_payment(callback: types.CallbackQuery, amount: int, title: str, description: str, tier: str):
    from decimal import Decimal
    await callback.answer("Creating invoice...")
    
    try:
        telegram_id = str(callback.from_user.id)
        async with async_session_maker() as db:
            user = await crud_user.get_user_by_telegram_id(db, telegram_id)
            if not user:
                await callback.message.answer(texts.USER_NOT_FOUND)
                return

            tx = RevenueTransaction(
                user_id=user.id,
                transaction_type="subscription",
                amount=Decimal(amount),
                currency="XTR",
                status="pending",
                payment_gateway="telegram_stars",
                custom_metadata={"plan_tier": tier}
            )
            db.add(tx)
            await db.commit()
            await db.refresh(tx)
            
            invoice_link = await create_stars_invoice(
                title=title,
                description=description,
                payload=str(tx.id),
                amount=amount
            )
            
            if invoice_link:
                kb = InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text=f"Pay {amount} XTR ⭐", url=invoice_link)],
                    [InlineKeyboardButton(text="⬅️  Back", callback_data="premium")]
                ])
                await callback.message.edit_text(f"👇 Click below to pay:", reply_markup=kb)
            else:
                await callback.message.answer("❌ Error creating invoice.")
    except Exception as e:
        logger.error(f"Payment initiation error: {e}")
        await callback.message.answer("❌ System error occurred.")
