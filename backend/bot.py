"""
MambaX Telegram Bot
====================
Telegram Mini App бот для дейтинг-платформы MambaX.

Функции:
- Приветствие и онбординг
- WebApp для знакомств
- Уведомления о матчах и сообщениях
- FAQ и поддержка
"""

import asyncio
import os
import logging
from aiogram import Bot, Dispatcher, types, F
from sqlalchemy import select
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    WebAppInfo, 
    InlineKeyboardMarkup, 
    InlineKeyboardButton,
    MenuButtonWebApp,
    BotCommand
)
from aiogram.enums import ParseMode
from dotenv import load_dotenv

from backend.db.session import async_session_maker
from backend.crud_pkg import user as crud_user
from backend.schemas.user import UserCreate


# Load environment variables
from pathlib import Path
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError(
        "❌ TELEGRAM_BOT_TOKEN не найден!\n"
        "Укажите его в .env файле или переменных окружения.\n"
        "Получить токен можно у @BotFather"
    )

# Frontend URL для WebApp
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://mambax.vercel.app")

# ============================================================================
# BOT INITIALIZATION
# ============================================================================

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# ============================================================================
# KEYBOARDS
# ============================================================================

def get_main_keyboard() -> InlineKeyboardMarkup:
    """Главная клавиатура с WebApp"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💘  Открыть MambaX", 
                web_app=WebAppInfo(url=FRONTEND_URL)
            )
        ],
        [
            InlineKeyboardButton(text="✨  Как это работает", callback_data="how_it_works"),
            InlineKeyboardButton(text="💎  Premium", callback_data="premium")
        ],
        [
            InlineKeyboardButton(text="❓  FAQ", callback_data="faq"),
            InlineKeyboardButton(text="💬  Поддержка", callback_data="support")
        ],
        [
            InlineKeyboardButton(text="📊  Статистика", callback_data="stats"),
            InlineKeyboardButton(text="⚙️  Настройки", callback_data="settings")
        ]
    ])

def get_back_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура возврата в меню"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💘  Открыть приложение", 
                web_app=WebAppInfo(url=FRONTEND_URL)
            )
        ],
        [
            InlineKeyboardButton(text="⬅️  Назад в меню", callback_data="main_menu")
        ]
    ])

def get_premium_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура премиум-подписок"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🥇  Gold — 499₽/мес", callback_data="buy_gold"),
        ],
        [
            InlineKeyboardButton(text="💎  VIP — 999₽/мес", callback_data="buy_vip"),
        ],
        [
            InlineKeyboardButton(text="🎁  Попробовать бесплатно", callback_data="free_trial"),
        ],
        [
            InlineKeyboardButton(text="⬅️  Назад", callback_data="main_menu")
        ]
    ])

def get_faq_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура FAQ"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔐  Безопасность", callback_data="faq_safety"),
        ],
        [
            InlineKeyboardButton(text="💬  Про матчи и чаты", callback_data="faq_matches"),
        ],
        [
            InlineKeyboardButton(text="📸  Про фото", callback_data="faq_photos"),
        ],
        [
            InlineKeyboardButton(text="💰  Про оплату", callback_data="faq_payment"),
        ],
        [
            InlineKeyboardButton(text="⬅️  Назад", callback_data="main_menu")
        ]
    ])

def get_settings_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура настроек"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔔  Уведомления", callback_data="settings_notifications"),
        ],
        [
            InlineKeyboardButton(text="👀  Приватность", callback_data="settings_privacy"),
        ],
        [
            InlineKeyboardButton(text="🌍  Язык", callback_data="settings_language"),
        ],
        [
            InlineKeyboardButton(text="🗑  Удалить аккаунт", callback_data="settings_delete"),
        ],
        [
            InlineKeyboardButton(text="⬅️  Назад", callback_data="main_menu")
        ]
    ])

# ============================================================================
# COMMAND HANDLERS
# ============================================================================

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    """Команда /start — приветствие"""
    user = message.from_user
    logger.info(f"User {user.id} (@{user.username}) started the bot")
    
    # Save user to DB
    try:
        async with async_session_maker() as db:
            # Check if user exists
            db_user = await crud_user.get_user_by_telegram_id(db, str(user.id))
            
            if not db_user:
                # Try to find by username (if they started verifying on web first?)
                # Or simply create new
                if user.username:
                    db_user = await crud_user.get_user_by_username(db, user.username)
                    
                if db_user:
                    # Update existing user with telegram_id
                    db_user.telegram_id = str(user.id)
                    db.add(db_user)
                    await db.commit()
                    logger.info(f"Updated user {user.id}")
                else:
                    # Create new user
                    new_user = UserCreate(
                        telegram_id=str(user.id),
                        username=user.username,
                        name=user.first_name,
                        # Default values
                        age=18,
                        gender="other"
                    )
                    await crud_user.create_user(db, new_user)
                    logger.info(f"Created new user {user.id}")
    except Exception as e:
        logger.error(f"Failed to save user {user.id}: {e}")

    # Проверяем, новый ли пользователь (можно добавить БД проверку)
    welcome_text = f"""
Привет, {user.first_name}! 👋

Добро пожаловать в **MambaX** — умное приложение для знакомств!

🎯  **Что тебя ждёт:**
• Умный алгоритм подбора пар
• Только реальные анкеты с верификацией
• Удобный чат с emoji и голосовыми
• Поиск по интересам и локации

💡  Нажми кнопку ниже, чтобы начать искать свою половинку!

_Уже более 10 000 пар нашли друг друга благодаря MambaX_ ❤️
"""
    
    await message.answer(
        welcome_text, 
        reply_markup=get_main_keyboard(),
        parse_mode=ParseMode.MARKDOWN
    )

@dp.message(Command("help"))
async def cmd_help(message: types.Message):
    """Команда /help"""
    help_text = """
🆘  **Помощь по MambaX**

**Команды бота:**
/start — Открыть главное меню
/profile — Посмотреть свой профиль
/matches — Мои матчи и чаты
/premium — Информация о подписках
/help — Эта справка

**Как пользоваться:**
1️⃣  Нажми «Открыть MambaX»
2️⃣  Заполни профиль и добавь фото
3️⃣  Листай анкеты и ставь лайки
4️⃣  Общайся с теми, кто тоже лайкнул тебя!

**Есть вопросы?**
Напиши в поддержку: @MambaXSupport
"""
    await message.answer(help_text, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)

@dp.message(Command("profile"))
async def cmd_profile(message: types.Message):
    """Команда /profile"""
    profile_url = f"{FRONTEND_URL}/profile"
    text = """
👤  **Твой профиль**

Здесь ты можешь:
• Изменить фото и описание
• Добавить интересы
• Настроить параметры поиска

Нажми кнопку, чтобы открыть профиль ⬇️
"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👤  Открыть профиль", web_app=WebAppInfo(url=profile_url))],
        [InlineKeyboardButton(text="⬅️  Назад в меню", callback_data="main_menu")]
    ])
    await message.answer(text, reply_markup=kb, parse_mode=ParseMode.MARKDOWN)

@dp.message(Command("matches"))
async def cmd_matches(message: types.Message):
    """Команда /matches"""
    chat_url = f"{FRONTEND_URL}/chat"
    text = """
💬  **Твои матчи**

Здесь все люди, которым ты понравился,
и они понравились тебе! 

Время познакомиться поближе 😊

Нажми кнопку, чтобы открыть чаты ⬇️
"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬  Открыть чаты", web_app=WebAppInfo(url=chat_url))],
        [InlineKeyboardButton(text="⬅️  Назад в меню", callback_data="main_menu")]
    ])
    await message.answer(text, reply_markup=kb, parse_mode=ParseMode.MARKDOWN)

@dp.message(Command("premium"))
async def cmd_premium(message: types.Message):
    """Команда /premium"""
    await show_premium(message)


# ============================================================================
# PAYMENT HANDLERS — TELEGRAM STARS
# ============================================================================

@dp.pre_checkout_query()
async def handle_pre_checkout(pre_checkout_query: types.PreCheckoutQuery):
    """
    Handle pre-checkout query - MUST respond within 10 seconds.
    Validates the payment before Telegram processes it.
    """
    from backend.services.telegram_payments import answer_pre_checkout_query
    
    payload = pre_checkout_query.invoice_payload
    logger.info(f"Pre-checkout query received: payload={payload}, amount={pre_checkout_query.total_amount} XTR")
    
    try:
        # Validate transaction exists and is pending
        async with async_session_maker() as db:
            from backend.models.monetization import RevenueTransaction
            from uuid import UUID
            
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
                logger.error(f"Pre-checkout: Invalid payload format: {payload}")
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


@dp.message(F.successful_payment)
async def handle_successful_payment(message: types.Message):
    """
    Handle successful payment - update user balance and transaction status.
    Called after Telegram has processed the payment.
    """
    from datetime import datetime
    from uuid import UUID
    from decimal import Decimal
    from backend.models.monetization import RevenueTransaction
    from backend.models.user import User
    
    payment = message.successful_payment
    payload = payment.invoice_payload  # Our transaction_id
    telegram_payment_id = payment.telegram_payment_charge_id
    telegram_user_id = message.from_user.id
    amount = payment.total_amount  # Amount in Stars (XTR)
    currency = payment.currency  # Should be "XTR"
    
    logger.info(
        f"Successful payment: {amount} {currency}, "
        f"payload={payload}, telegram_user={telegram_user_id}, "
        f"charge_id={telegram_payment_id}"
    )
    
    try:
        transaction_id = UUID(payload)
        
        async with async_session_maker() as db:
            # 0. Idempotency Check (Charge ID)
            stmt = select(RevenueTransaction).where(RevenueTransaction.gateway_transaction_id == telegram_payment_id)
            existing_tx = (await db.execute(stmt)).scalars().first()
            
            if existing_tx:
                logger.warning(f"Payment already processed (charge_id={telegram_payment_id} used in tx {existing_tx.id})")
                await message.answer("ℹ️ Этот платёж уже был учтен.")
                return

            # 1. Find pending transaction
            transaction = await db.get(RevenueTransaction, transaction_id)
            
            if not transaction:
                logger.error(f"Payment processing: Transaction not found: {payload}")
                await message.answer(
                    "⚠️ Ошибка: транзакция не найдена.\n"
                    "Обратитесь в поддержку с ID: " + payload
                )
                return
            
            if transaction.status == "completed":
                logger.warning(f"Payment already processed: {payload}")
                # Still send confirmation to user
                user = await db.get(User, transaction.user_id)
                if user:
                    await message.answer(
                        f"ℹ️ Этот платёж уже обработан.\n\n"
                        f"💰 Ваш баланс: {user.stars_balance} Stars"
                    )
                return
            
            # 2. Update transaction status
            transaction.status = "completed"
            transaction.gateway_transaction_id = telegram_payment_id
            transaction.telegram_charge_id = telegram_payment_id
            transaction.completed_at = datetime.utcnow()
            transaction.custom_metadata = {
                **transaction.custom_metadata,
                "telegram_user_id": str(telegram_user_id),
                "telegram_charge_id": telegram_payment_id
            }
            
            # 3. Update user balance
            user = await db.get(User, transaction.user_id)
            if user:
                # Security Check: Verify Telegram User ID
                if user.telegram_id and str(user.telegram_id) != str(telegram_user_id):
                    logger.critical(
                        f"SECURITY ALERT: Telegram ID mismatch! "
                        f"User expected: {user.telegram_id}, Payment from: {telegram_user_id}. "
                        f"Transaction: {transaction.id}"
                    )
                    await message.answer(
                        "⚠️ <b>Ошибка безопасности</b>\n"
                        "Оплата отклонена: аккаунт Telegram не совпадает с профилем.\n"
                        "Пожалуйста, оплачивайте со своего аккаунта.",
                        parse_mode=ParseMode.HTML
                    )
                    return

                if transaction.transaction_type == "gift_purchase":
                    # Handle Gift Delivery
                    try:
                        from backend.services.gifts import deliver_gift
                        import uuid
                        
                        meta = transaction.custom_metadata or {}
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
                        await message.answer(f"🎁 Gift sent successfully! ({amount} Stars paid)")
                    except Exception as e:
                        logger.error(f"Gift delivery failed: {e}")
                        # Fallback: Add to balance
                        user.stars_balance = (user.stars_balance or Decimal("0")) + Decimal(str(amount))
                        await message.answer("⚠️ Payment successful but gift delivery failed. Stars added to balance.")

                elif transaction.transaction_type == "subscription":
                    # 1. Top Up (Credit)
                    user.stars_balance = (user.stars_balance or Decimal("0")) + Decimal(str(amount))
                    
                    # 2. Auto-Activate (Debit)
                    tier = transaction.custom_metadata.get("plan_tier")
                    if tier:
                        from backend.services.monetization import buy_subscription_with_stars
                        res = await buy_subscription_with_stars(db, str(user.id), tier)
                        if res.get("success"):
                             await message.answer(f"✅ Subscription activated: {res.get('plan')}")
                        else:
                             await message.answer(f"💰 Balance topped up ({amount} Stars). Auto-activation failed: {res.get('error')}")
                    else:
                        await message.answer(f"💰 Balance topped up: {amount} Stars.")
                
                else:
                    # Default Top Up
                    old_balance = user.stars_balance or Decimal("0")
                    user.stars_balance = old_balance + Decimal(str(amount))
                    new_balance = user.stars_balance
                    logger.info(
                        f"Balance updated for user {user.id}: "
                        f"{old_balance} -> {new_balance} (+{amount} Stars)"
                    )

            else:
                logger.error(f"User not found for transaction: {transaction.user_id}")
                await message.answer(
                    "⚠️ Ошибка: пользователь не найден.\n"
                    "Обратитесь в поддержку."
                )
                return
            
            await db.commit()
            
            # 5. Notify frontend via WebSocket (Real-time balance update)
            try:
                from backend.core.websocket import manager
                # Need to convert UUID to str
                await manager.send_personal_message({
                    "type": "balance_update",
                    "balance": float(new_balance)
                }, str(transaction.user_id))
            except Exception as e:
                logger.error(f"WS notification failed: {e}")

            # 4. Send confirmation message to user
            await message.answer(
                f"✅ **Платёж успешен!**\n\n"
                f"💫 Зачислено: **{amount} Stars**\n"
                f"💰 Ваш баланс: **{new_balance} Stars**\n\n"
                f"Спасибо за покупку! ❤️",
                parse_mode=ParseMode.MARKDOWN
            )
            
            logger.info(f"Payment completed successfully: {payload}")
            
    except ValueError:
        logger.error(f"Invalid transaction ID format: {payload}")
        await message.answer(
            "⚠️ Ошибка обработки платежа.\n"
            "Обратитесь в поддержку."
        )
    except Exception as e:
        logger.error(f"Payment processing error: {e}")
        await message.answer(
            "⚠️ Произошла ошибка при обработке платежа.\n"
            "Средства будут зачислены в ближайшее время."
        )


@dp.message()
async def all_messages(message: types.Message):
    """Catch all for debugging"""
    # Skip payment messages - they are handled by handle_successful_payment
    if message.successful_payment:
        return
    
    logger.debug(f"RECEIVED MESSAGE: {message.text} from {message.from_user.id}")
    # Если это не команда, то просто игнорим или отвечаем (для теста)
    if message.text and not message.text.startswith('/'):
         await message.answer("Я тебя слышу! Напиши /start")

# ============================================================================
# CALLBACK HANDLERS — MAIN MENU
# ============================================================================

@dp.callback_query(F.data == "main_menu")
async def callback_main_menu(callback: types.CallbackQuery):
    """Возврат в главное меню"""
    text = """
💘  **MambaX — Найди свою любовь**

Выбери, что хочешь сделать:
"""
    await callback.message.edit_text(
        text,
        reply_markup=get_main_keyboard(),
        parse_mode=ParseMode.MARKDOWN
    )
    await callback.answer()

@dp.callback_query(F.data == "how_it_works")
async def callback_how_it_works(callback: types.CallbackQuery):
    """Как это работает"""
    text = """
✨  **Как работает MambaX**

**Шаг 1: Создай профиль** 📝
Загрузи свои лучшие фото, напиши пару слов о себе
и выбери интересы.

**Шаг 2: Листай анкеты** 👆
Смахивай вправо ❤️ если человек нравится,
влево 👎 если не твоё.

**Шаг 3: Получай матчи** 🎉
Когда симпатия взаимная — это матч!
Вы оба получите уведомление.

**Шаг 4: Общайся** 💬
Пиши сообщения, отправляй голосовые,
делись фото и emoji!

**Шаг 5: Встречайся** ☕
Договоритесь о встрече и познакомьтесь
в реальной жизни!

_Главное правило: будь собой!_ 💫
"""
    await callback.message.edit_text(text, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "premium")
async def callback_premium(callback: types.CallbackQuery):
    """Премиум подписки"""
    await callback.message.edit_text(
        get_premium_text(),
        reply_markup=get_premium_keyboard(),
        parse_mode=ParseMode.MARKDOWN
    )
    await callback.answer()

@dp.callback_query(F.data.in_({"buy_gold", "buy_vip"}))
async def callback_buy_subscription(callback: types.CallbackQuery):
    """Handle Gold/VIP purchase clicks"""
    tier = "gold" if callback.data == "buy_gold" else "platinum"
    amount = 500 if tier == "gold" else 1000  # Stars
    title = "MambaX Gold" if tier == "gold" else "MambaX VIP"
    description = f"Purchase {title} for 1 month"
    
    await initiate_payment(callback, amount, title, description, tier)

@dp.callback_query(F.data == "free_trial")
async def callback_free_trial(callback: types.CallbackQuery):
    await callback.answer("Free trial is currently unavailable.", show_alert=True)

async def initiate_payment(callback: types.CallbackQuery, amount: int, title: str, description: str, tier: str):
    from backend.services.telegram_payments import create_stars_invoice
    from backend.models.monetization import RevenueTransaction
    from backend.crud_pkg import user as crud_user
    from decimal import Decimal
    
    # Show loading status
    await callback.answer("Creating invoice...")
    
    try:
        telegram_id = str(callback.from_user.id)
        
        async with async_session_maker() as db:
            user = await crud_user.get_user_by_telegram_id(db, telegram_id)
            if not user:
                await callback.message.answer("⚠️ User profile not found. Please type /start first.")
                return

            # Create pending transaction
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
            
            # Generate Link
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
                
                await callback.message.edit_text(
                    f"💎  **{title}**\n\n"
                    f"{description}\n\n"
                    f"💰  **Price:** {amount} Stars\n"
                    f"👇  Click below to pay:",
                    reply_markup=kb,
                    parse_mode=ParseMode.MARKDOWN
                )
            else:
                await callback.message.answer("❌ Error creating invoice. Please try again later.")
                
    except Exception as e:
        logger.error(f"Payment initiation error: {e}")
        await callback.message.answer("❌ System error occurred.")

def get_premium_text() -> str:
    return """
💎  **MambaX Premium**

Открой все возможности для поиска любви!

━━━━━━━━━━━━━━━━━━━━

🆓  **Бесплатно:**
• 30 лайков в день
• Базовые фильтры
• Чат с матчами

━━━━━━━━━━━━━━━━━━━━

🥇  **Gold — 499₽/мес:**
• ♾  Безлимитные лайки
• 👀  Смотри, кто тебя лайкнул
• 🔍  Расширенные фильтры
• ✈️  Режим путешественника
• ⏪  Отмена последнего свайпа

━━━━━━━━━━━━━━━━━━━━

💎  **VIP — 999₽/мес:**
• Всё из Gold
• ⭐  Приоритет в ленте
• 💌  Пиши до матча (1 в день)
• 👻  Режим инкогнито
• ✅  Галочка верификации

━━━━━━━━━━━━━━━━━━━━

_Подписка продлевается автоматически._
_Отменить можно в любой момент._
"""

async def show_premium(message: types.Message):
    """Показать премиум"""
    await message.answer(
        get_premium_text(),
        reply_markup=get_premium_keyboard(),
        parse_mode=ParseMode.MARKDOWN
    )

@dp.callback_query(F.data == "buy_gold")
async def callback_buy_gold(callback: types.CallbackQuery):
    """Покупка Gold"""
    text = """
🥇  **Gold подписка**

Цена: **499₽/месяц**

Для оформления подписки открой приложение
и перейди в раздел «Профиль» → «Premium».

_Оплата через Telegram Stars или банковскую карту._
"""
    await callback.message.edit_text(text, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer("Открой приложение для оплаты 💳")

@dp.callback_query(F.data == "buy_vip")
async def callback_buy_vip(callback: types.CallbackQuery):
    """Покупка VIP"""
    text = """
💎  **VIP подписка**

Цена: **999₽/месяц**

Максимум возможностей для поиска любви!

Для оформления подписки открой приложение
и перейди в раздел «Профиль» → «Premium».

_Оплата через Telegram Stars или банковскую карту._
"""
    await callback.message.edit_text(text, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer("VIP — лучший выбор! 💎")

@dp.callback_query(F.data == "free_trial")
async def callback_free_trial(callback: types.CallbackQuery):
    """Бесплатный пробный период"""
    text = """
🎁  **Бесплатный пробный период**

Попробуй Gold на **3 дня бесплатно!**

Что получишь:
• Безлимитные лайки
• Видеть, кто тебя лайкнул
• Расширенные фильтры

Открой приложение и активируй пробный период
в разделе «Профиль» → «Premium».

_Карта не потребуется. Без автопродления._
"""
    await callback.message.edit_text(text, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer("3 дня бесплатно! 🎁")

# ============================================================================
# CALLBACK HANDLERS — FAQ
# ============================================================================

@dp.callback_query(F.data == "faq")
async def callback_faq(callback: types.CallbackQuery):
    """FAQ - главная"""
    text = """
❓  **Частые вопросы**

Выбери тему, которая тебя интересует:
"""
    await callback.message.edit_text(text, reply_markup=get_faq_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "faq_safety")
async def callback_faq_safety(callback: types.CallbackQuery):
    """FAQ - Безопасность"""
    text = """
🔐  **Безопасность в MambaX**

**Как защищены мои данные?**
Мы используем шифрование для всех сообщений
и не передаём данные третьим лицам.

**Как пожаловаться на пользователя?**
Открой профиль пользователя → нажми «...» → «Пожаловаться».
Мы рассмотрим жалобу в течение 24 часов.

**Как заблокировать человека?**
В чате или профиле нажми «...» → «Заблокировать».
Он больше не сможет писать тебе.

**Советы по безопасности:**
• Не делись личными данными сразу
• Первую встречу назначай в публичном месте
• Доверяй своей интуиции

_Если чувствуешь опасность — сообщи нам!_
"""
    await callback.message.edit_text(text, reply_markup=get_faq_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "faq_matches")
async def callback_faq_matches(callback: types.CallbackQuery):
    """FAQ - Матчи"""
    text = """
💬  **Про матчи и чаты**

**Что такое матч?**
Матч — это когда ты лайкнул человека,
и он тоже лайкнул тебя. 
Теперь вы можете общаться!

**Почему нет матчей?**
• Добавь больше фото (3-6 штук)
• Напиши интересное описание
• Расширь параметры поиска
• Будь активнее — лайкай чаще!

**Как начать разговор?**
• Напиши что-то личное про его/её профиль
• Задай вопрос про интересы
• Избегай банального «Привет»

**Сколько хранятся чаты?**
Чаты хранятся бессрочно, пока вы не
удалите матч или аккаунт.
"""
    await callback.message.edit_text(text, reply_markup=get_faq_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "faq_photos")
async def callback_faq_photos(callback: types.CallbackQuery):
    """FAQ - Фото"""
    text = """
📸  **Про фотографии**

**Сколько фото можно добавить?**
До 6 фотографий. Рекомендуем минимум 3.

**Какие фото лучше работают?**
✅  Чёткие фото лица с улыбкой
✅  Фото в полный рост
✅  Фото с хобби (спорт, путешествия)
✅  Естественное освещение

❌  Групповые фото
❌  Фото в солнцезащитных очках
❌  Слишком отредактированные
❌  Фото с бывшими

**Как изменить главное фото?**
Открой профиль → нажми на фото →
перетащи нужное на первое место.

**Фото проверяются?**
Да, мы модерируем все фото на соответствие
правилам сообщества.
"""
    await callback.message.edit_text(text, reply_markup=get_faq_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "faq_payment")
async def callback_faq_payment(callback: types.CallbackQuery):
    """FAQ - Оплата"""
    text = """
💰  **Про оплату**

**Какие способы оплаты?**
• Telegram Stars ⭐
• Банковские карты (Visa, MasterCard, МИР)
• Apple Pay / Google Pay

**Как отменить подписку?**
Профиль → Premium → Управление подпиской → Отменить.
Доступ сохранится до конца оплаченного периода.

**Можно ли вернуть деньги?**
В течение 3 дней после первой оплаты —
напиши в поддержку @MambaXSupport.

**Подписка безопасна?**
Да, мы используем защищённые платёжные
системы и не храним данные карт.

**Есть скидки?**
При оплате на 3 или 12 месяцев 
предоставляется скидка до 40%!
"""
    await callback.message.edit_text(text, reply_markup=get_faq_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

# ============================================================================
# CALLBACK HANDLERS — SUPPORT & SETTINGS
# ============================================================================

@dp.callback_query(F.data == "support")
async def callback_support(callback: types.CallbackQuery):
    """Поддержка"""
    text = """
💬  **Служба поддержки**

Мы на связи и всегда рады помочь!

**📧  Email:**
support@mambax.app

**💬  Telegram:**
@MambaXSupport

**⏰  Время ответа:**
Обычно отвечаем в течение 2-3 часов.
В выходные может быть дольше.

**🐛  Нашёл баг?**
Опиши проблему и приложи скриншот — 
мы быстро исправим!

**💡  Есть идея?**
Мы любим обратную связь! Напиши нам,
и твоя идея может появиться в приложении.

_Спасибо, что выбрал MambaX!_ ❤️
"""
    await callback.message.edit_text(text, reply_markup=get_back_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "stats")
async def callback_stats(callback: types.CallbackQuery):
    """Статистика"""
    text = """
📊  **Статистика MambaX**

**🌍  Общие цифры:**
• 50 000+ активных пользователей
• 10 000+ успешных матчей
• 1 500+ пар нашли любовь

**📈  Твоя статистика:**
_(откроется в приложении)_

• Сколько лайков ты поставил
• Сколько лайков получил
• Количество матчей
• Активность профиля

Открой приложение, чтобы увидеть
подробную статистику!
"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📊  Моя статистика", web_app=WebAppInfo(url=f"{FRONTEND_URL}/profile"))],
        [InlineKeyboardButton(text="⬅️  Назад", callback_data="main_menu")]
    ])
    await callback.message.edit_text(text, reply_markup=kb, parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "settings")
async def callback_settings(callback: types.CallbackQuery):
    """Настройки"""
    text = """
⚙️  **Настройки**

Выбери, что хочешь настроить:
"""
    await callback.message.edit_text(text, reply_markup=get_settings_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "settings_notifications")
async def callback_settings_notifications(callback: types.CallbackQuery):
    """Настройки уведомлений"""
    text = """
🔔  **Уведомления**

Управляй уведомлениями в приложении:

**Доступные настройки:**
• 💬  Новые сообщения — Вкл/Выкл
• 💘  Новые матчи — Вкл/Выкл
• ❤️  Новые лайки (Premium) — Вкл/Выкл
• 📢  Акции и новости — Вкл/Выкл

Открой приложение → Профиль → Настройки
→ Уведомления

_Telegram уведомления от бота
отключить нельзя — только заблокировать бота._
"""
    await callback.message.edit_text(text, reply_markup=get_settings_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "settings_privacy")
async def callback_settings_privacy(callback: types.CallbackQuery):
    """Настройки приватности"""
    text = """
👀  **Приватность**

**Кто видит мой профиль?**
По умолчанию — все пользователи в твоём
радиусе поиска и возрасте.

**Режим инкогнито (VIP):**
Только те, кого ты лайкнул, увидят твой профиль.

**Скрыть возраст:**
Можно скрыть точный возраст в профиле.

**Скрыть дистанцию:**
Пользователи не увидят, насколько далеко ты.

Все настройки в приложении:
Профиль → Настройки → Приватность
"""
    await callback.message.edit_text(text, reply_markup=get_settings_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "settings_language")
async def callback_settings_language(callback: types.CallbackQuery):
    """Настройки языка"""
    text = """
🌍  **Язык**

Сейчас: **Русский** 🇷🇺

Доступные языки:
• 🇷🇺  Русский
• 🇬🇧  English
• 🇺🇦  Українська

Язык меняется в приложении:
Профиль → Настройки → Язык
"""
    await callback.message.edit_text(text, reply_markup=get_settings_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer()

@dp.callback_query(F.data == "settings_delete")
async def callback_settings_delete(callback: types.CallbackQuery):
    """Удаление аккаунта"""
    text = """
🗑  **Удаление аккаунта**

⚠️  **Внимание!** Это действие необратимо.

При удалении аккаунта:
• Удалятся все фото и данные профиля
• Удалятся все матчи и чаты
• Аннулируется подписка (без возврата)

**Как удалить:**
1. Открой приложение
2. Профиль → Настройки → Аккаунт
3. «Удалить аккаунт»
4. Подтверди действие

**Передумал(а)?**
Просто нажми «Назад» — ничего не удалится 😊
"""
    await callback.message.edit_text(text, reply_markup=get_settings_keyboard(), parse_mode=ParseMode.MARKDOWN)
    await callback.answer("⚠️ Это удалит все данные!")

# ============================================================================
# NOTIFICATION FUNCTIONS (вызываются из бэкенда)
# ============================================================================

async def send_match_notification(user_telegram_id: str, match_name: str) -> bool:
    """Уведомление о новом матче"""
    try:
        text = f"🎉  Это мэтч!\n\nВы с {match_name} понравились друг другу!\n\n👋  Не стесняйся, напиши первым(ой)!"
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💬  Написать", web_app=WebAppInfo(url=f"{FRONTEND_URL}/chat"))]
        ])
        
        await bot.send_message(
            chat_id=user_telegram_id,
            text=text,
            reply_markup=kb
        )
        logger.info(f"Match notification sent to {user_telegram_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send match notification: {e}")
        return False

async def send_message_notification(user_telegram_id: str, sender_name: str) -> bool:
    """Уведомление о новом сообщении"""
    try:
        text = f"💬  {sender_name} отправил(а) тебе сообщение!"
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📖  Прочитать", web_app=WebAppInfo(url=f"{FRONTEND_URL}/chat"))]
        ])
        
        await bot.send_message(
            chat_id=user_telegram_id,
            text=text,
            reply_markup=kb
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send message notification: {e}")
        return False

async def send_otp_code(user_telegram_id: str, otp: str) -> bool:
    """Отправка OTP кода"""
    try:
        text = f"🔐  Ваш код: {otp}\n⏱️  Код истекает через 5 минут."
        await bot.send_message(chat_id=user_telegram_id, text=text)
        logger.info(f"OTP sent to {user_telegram_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
        return False

async def send_like_notification(user_telegram_id: str) -> bool:
    """Уведомление о новом лайке (Premium)"""
    try:
        text = "❤️  Кто-то поставил тебе лайк!\n\nОткрой приложение, чтобы узнать кто 👀"
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="👀  Посмотреть", web_app=WebAppInfo(url=f"{FRONTEND_URL}/likes"))]
        ])
        
        await bot.send_message(
            chat_id=user_telegram_id,
            text=text,
            reply_markup=kb
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send like notification: {e}")
        return False

# ============================================================================
# BOT SETUP
# ============================================================================

async def setup_bot_commands():
    """Настройка команд бота"""
    commands = [
        BotCommand(command="start", description="🏠  Главное меню"),
        BotCommand(command="profile", description="👤  Мой профиль"),
        BotCommand(command="matches", description="💬  Мои матчи"),
        BotCommand(command="premium", description="💎  Premium подписка"),
        BotCommand(command="help", description="🆘  Помощь"),
    ]
    await bot.set_my_commands(commands)
    logger.info("Bot commands set")

async def setup_menu_button():
    """Настройка кнопки меню WebApp"""
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="💘 MambaX",
                web_app=WebAppInfo(url=FRONTEND_URL)
            )
        )
        logger.info("Menu button set")
    except Exception as e:
        logger.warning(f"Could not set menu button: {e}")

# ============================================================================
# MAIN
# ============================================================================

async def main():
    """Запуск бота"""
    logger.info("=" * 50)
    logger.info("🚀  Запуск MambaX Bot...")
    logger.info(f"Frontend URL: {FRONTEND_URL}")
    logger.info("=" * 50)
    
    # Настройка
    await setup_bot_commands()
    await setup_menu_button()
    
    # Удаляем старый webhook и запускаем polling
    await bot.delete_webhook(drop_pending_updates=True)
    
    logger.info("✅  Бот запущен! Нажми Ctrl+C для остановки.")
    
    # Запуск polling
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Бот остановлен пользователем")
    except Exception as e:
        logger.error(f"Бот упал: {e}")
        raise
