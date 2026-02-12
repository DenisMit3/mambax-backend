from aiogram.types import (
    WebAppInfo, 
    InlineKeyboardMarkup, 
    InlineKeyboardButton
)
import os

# Frontend URL
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://frontend-two-brown-70.vercel.app").rstrip("/")

def get_main_keyboard() -> InlineKeyboardMarkup:
    """Главная клавиатура с WebApp"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="💘  Открыть MambaX", 
                web_app=WebAppInfo(url=f"{FRONTEND_URL}/onboarding")
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
                web_app=WebAppInfo(url=f"{FRONTEND_URL}/onboarding")
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
