"""
Profile Verification Service
=============================
Верификация профиля через селфи с жестом.

Процесс:
1. Пользователь запрашивает верификацию
2. Система выдаёт случайный жест (показать большой палец, знак мира и т.д.)
3. Пользователь делает селфи с этим жестом
4. Система проверяет и выдаёт бейдж верификации

Для MVP: автоматическое подтверждение.
Для Production: AI распознавание лица + ручная модерация.
"""

import os
import uuid
import random
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend import models

logger = logging.getLogger(__name__)

# ============================================================================
# CONSTANTS
# ============================================================================

class VerificationStatus(str, Enum):
    NOT_STARTED = "not_started"
    PENDING = "pending"  # Ожидает загрузки селфи
    UNDER_REVIEW = "under_review"  # На проверке
    VERIFIED = "verified"  # Верифицирован
    REJECTED = "rejected"  # Отклонён

class GestureType(str, Enum):
    THUMBS_UP = "thumbs_up"
    PEACE_SIGN = "peace_sign"
    HAND_ON_CHIN = "hand_on_chin"
    WAVE = "wave"
    POINT_UP = "point_up"
    OK_SIGN = "ok_sign"

# Описания жестов на русском
GESTURE_DESCRIPTIONS = {
    GestureType.THUMBS_UP: {
        "name": "Большой палец вверх",
        "emoji": "👍",
        "instruction": "Покажите большой палец вверх рядом с лицом"
    },
    GestureType.PEACE_SIGN: {
        "name": "Знак мира",
        "emoji": "✌️",
        "instruction": "Покажите знак мира (два пальца) рядом с лицом"
    },
    GestureType.HAND_ON_CHIN: {
        "name": "Рука на подбородке",
        "emoji": "🤔",
        "instruction": "Положите руку на подбородок"
    },
    GestureType.WAVE: {
        "name": "Помахать рукой",
        "emoji": "👋",
        "instruction": "Помашите рукой рядом с лицом"
    },
    GestureType.POINT_UP: {
        "name": "Указать вверх",
        "emoji": "☝️",
        "instruction": "Покажите указательный палец вверх"
    },
    GestureType.OK_SIGN: {
        "name": "ОК",
        "emoji": "👌",
        "instruction": "Покажите знак 'ОК' рядом с лицом"
    }
}

# In-memory storage для верификаций (в продакшене - Redis/БД)
_verification_sessions: Dict[str, Dict[str, Any]] = {}

# ============================================================================
# SCHEMAS
# ============================================================================

class VerificationRequest(BaseModel):
    """Запрос на начало верификации"""
    pass

class VerificationChallenge(BaseModel):
    """Ответ с заданием для верификации"""
    session_id: str
    gesture: str
    gesture_name: str
    gesture_emoji: str
    instruction: str
    expires_at: str

class VerificationSubmit(BaseModel):
    """Отправка селфи для верификации"""
    session_id: str
    selfie_url: str

class VerificationResult(BaseModel):
    """Результат верификации"""
    status: str
    is_verified: bool
    message: str
    badge_awarded: bool = False

# ============================================================================
# SERVICE FUNCTIONS
# ============================================================================

def generate_random_gesture() -> GestureType:
    """Генерация случайного жеста для верификации"""
    return random.choice(list(GestureType))


async def start_verification(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """
    Начать процесс верификации.
    Генерирует случайный жест и создаёт сессию верификации.
    """
    # Проверить, не верифицирован ли уже
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"error": "User not found"}
    
    # Проверяем атрибут is_verified (добавим позже если нет)
    if hasattr(user, 'is_verified') and user.is_verified:
        return {
            "error": "already_verified",
            "message": "Ваш профиль уже верифицирован! ✅"
        }
    
    # Генерируем жест
    gesture = generate_random_gesture()
    gesture_info = GESTURE_DESCRIPTIONS[gesture]
    
    # Создаём сессию
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow().isoformat() + "Z"  # +10 минут в реальности
    
    _verification_sessions[session_id] = {
        "user_id": user_id,
        "gesture": gesture.value,
        "created_at": datetime.utcnow().isoformat(),
        "status": VerificationStatus.PENDING.value,
        "selfie_url": None
    }
    
    logger.info(f"Verification started for user {user_id}, gesture: {gesture.value}")
    
    return {
        "session_id": session_id,
        "gesture": gesture.value,
        "gesture_name": gesture_info["name"],
        "gesture_emoji": gesture_info["emoji"],
        "instruction": gesture_info["instruction"],
        "expires_at": expires_at
    }


async def submit_verification(
    db: AsyncSession, 
    user_id: str, 
    session_id: str, 
    selfie_url: str
) -> Dict[str, Any]:
    """
    Отправить селфи для верификации.
    
    Для MVP: автоматически подтверждаем.
    Для Production: отправляем на AI проверку или ручную модерацию.
    """
    # Проверяем сессию
    session = _verification_sessions.get(session_id)
    
    if not session:
        return {
            "status": "error",
            "message": "Сессия верификации не найдена или истекла"
        }
    
    if session["user_id"] != user_id:
        return {
            "status": "error", 
            "message": "Неверная сессия верификации"
        }
    
    if session["status"] != VerificationStatus.PENDING.value:
        return {
            "status": "error",
            "message": "Верификация уже обработана"
        }
    
    # Сохраняем селфи
    session["selfie_url"] = selfie_url
    session["submitted_at"] = datetime.utcnow().isoformat()
    
    # ========================================================
    # MVP: Автоматическое подтверждение
    # В продакшене здесь будет:
    # 1. AI проверка лица (сравнение с фото профиля)
    # 2. AI распознавание жеста
    # 3. Liveness detection (проверка что это не фото фото)
    # 4. Ручная модерация при сомнениях
    # ========================================================
    
    verification_passed = True  # MVP: всегда проходит
    
    if verification_passed:
        session["status"] = VerificationStatus.VERIFIED.value
        
        # Обновляем пользователя в БД
        result = await db.execute(select(models.User).where(models.User.id == user_id))
        user = result.scalars().first()
        
        if user:
            # Добавляем флаг верификации если есть
            if hasattr(user, 'is_verified'):
                user.is_verified = True
            
            # Сохраняем URL селфи верификации
            if hasattr(user, 'verification_selfie'):
                user.verification_selfie = selfie_url
            
            await db.commit()
        
        logger.info(f"User {user_id} verified successfully")
        
        return {
            "status": "verified",
            "is_verified": True,
            "message": "🎉 Поздравляем! Ваш профиль верифицирован!",
            "badge_awarded": True
        }
    else:
        session["status"] = VerificationStatus.REJECTED.value
        
        return {
            "status": "rejected",
            "is_verified": False,
            "message": "Верификация не пройдена. Попробуйте снова.",
            "badge_awarded": False
        }


async def get_verification_status(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """
    Получить статус верификации пользователя.
    """
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"error": "User not found"}
    
    is_verified = getattr(user, 'is_verified', False)
    verification_selfie = getattr(user, 'verification_selfie', None)
    
    # Проверяем активные сессии
    active_session = None
    for session_id, session in _verification_sessions.items():
        if session["user_id"] == user_id:
            active_session = {
                "session_id": session_id,
                "status": session["status"],
                "gesture": session["gesture"]
            }
            break
    
    return {
        "is_verified": is_verified,
        "verification_selfie": verification_selfie,
        "active_session": active_session,
        "can_start_verification": not is_verified and active_session is None
    }


async def cancel_verification(user_id: str, session_id: str) -> Dict[str, Any]:
    """
    Отменить текущую верификацию.
    """
    session = _verification_sessions.get(session_id)
    
    if not session or session["user_id"] != user_id:
        return {"error": "Session not found"}
    
    del _verification_sessions[session_id]
    
    return {"status": "cancelled", "message": "Верификация отменена"}


# ============================================================================
# CLEANUP (для cron jobs)
# ============================================================================

def cleanup_expired_sessions(max_age_minutes: int = 30):
    """Очистка истёкших сессий верификации"""
    from datetime import timedelta
    
    now = datetime.utcnow()
    expired = []
    
    for session_id, session in _verification_sessions.items():
        created = datetime.fromisoformat(session["created_at"])
        if (now - created) > timedelta(minutes=max_age_minutes):
            expired.append(session_id)
    
    for session_id in expired:
        del _verification_sessions[session_id]
    
    if expired:
        logger.info(f"Cleaned up {len(expired)} expired verification sessions")
