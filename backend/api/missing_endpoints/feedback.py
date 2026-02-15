# Missing Endpoints - Feedback & Interests

from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
import logging

from backend.db.session import get_db
from backend.api.missing_endpoints.deps import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Feedback ---
class FeedbackRequest(BaseModel):
    type: str = "general"
    message: str
    rating: Optional[int] = None


@router.post("/feedback")
async def submit_feedback(
    data: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Submit user feedback"""
    try:
        await db.execute(
            text("""
                INSERT INTO feedback (user_id, type, message, rating, created_at)
                VALUES (:user_id, :type, :message, :rating, NOW())
            """),
            {
                "user_id": current_user_id,
                "type": data.type,
                "message": data.message,
                "rating": data.rating
            }
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Feedback table may not exist: {e}")
    
    return {"status": "ok", "message": "Feedback submitted. Thank you!"}


# --- Interests ---
@router.get("/interests/categories")
async def get_interest_categories():
    """Get all interest categories"""
    return {
        "categories": [
            {
                "id": "lifestyle",
                "name": "Образ жизни",
                "interests": ["Спорт", "Йога", "Фитнес", "Путешествия", "Кулинария", "Здоровое питание"]
            },
            {
                "id": "entertainment",
                "name": "Развлечения",
                "interests": ["Кино", "Музыка", "Игры", "Сериалы", "Концерты", "Театр"]
            },
            {
                "id": "creative",
                "name": "Творчество",
                "interests": ["Фотография", "Рисование", "Музыка", "Танцы", "Писательство", "Дизайн"]
            },
            {
                "id": "social",
                "name": "Социальное",
                "interests": ["Волонтерство", "Нетворкинг", "Вечеринки", "Клубы по интересам"]
            },
            {
                "id": "intellectual",
                "name": "Интеллектуальное",
                "interests": ["Книги", "Наука", "Технологии", "Языки", "История", "Философия"]
            },
            {
                "id": "outdoor",
                "name": "На природе",
                "interests": ["Походы", "Кемпинг", "Рыбалка", "Велосипед", "Бег", "Плавание"]
            }
        ]
    }


@router.put("/interests")
async def update_interests(
    interests: list = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update user interests"""
    try:
        await db.execute(
            text("DELETE FROM user_interests WHERE user_id = :user_id"),
            {"user_id": current_user_id}
        )
        for tag in interests:
            await db.execute(
                text("INSERT INTO user_interests (user_id, tag) VALUES (:user_id, :tag)"),
                {"user_id": current_user_id, "tag": tag}
            )
        await db.commit()
    except Exception as e:
        logger.warning(f"Interests update error: {e}")
    
    return {"status": "ok", "interests": interests}


# --- Analytics ---
@router.get("/analytics/profile")
async def get_profile_analytics(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get profile analytics"""
    try:
        views_result = await db.execute(
            text("SELECT COUNT(*) FROM profile_views WHERE viewed_id = :user_id"),
            {"user_id": current_user_id}
        )
        views = views_result.scalar() or 0
    except Exception:
        views = 0
    
    try:
        likes_result = await db.execute(
            text("SELECT COUNT(*) FROM swipes WHERE to_user_id = :user_id AND action IN ('like', 'superlike')"),
            {"user_id": current_user_id}
        )
        likes = likes_result.scalar() or 0
    except Exception:
        likes = 0
    
    try:
        matches_result = await db.execute(
            text("SELECT COUNT(*) FROM matches WHERE user1_id = :user_id OR user2_id = :user_id"),
            {"user_id": current_user_id}
        )
        matches = matches_result.scalar() or 0
    except Exception:
        matches = 0
    
    try:
        messages_result = await db.execute(
            text("SELECT COUNT(*) FROM messages WHERE sender_id = :user_id"),
            {"user_id": current_user_id}
        )
        messages = messages_result.scalar() or 0
    except Exception:
        messages = 0
    
    return {
        "profile_views": views,
        "likes_received": likes,
        "matches": matches,
        "messages_sent": messages,
        "period": "all_time"
    }
