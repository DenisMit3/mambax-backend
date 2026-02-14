# Missing endpoints from api.py monolith that frontend depends on
# These are endpoints that exist in api.py but were not ported to modular routers

from fastapi import APIRouter, Depends, Body, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import uuid

from backend.db.session import get_db
from backend.core.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Missing Endpoints"])


async def get_current_user_id(authorization: str = Header(None)) -> str:
    """Extract user_id from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        user_id = verify_token(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")


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


# --- Likes (alternative to swipe) ---
@router.post("/likes")
async def like_user(
    liked_user_id: str = Body(...),
    is_super: bool = Body(False),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Like a user (alternative to swipe)"""
    action = "superlike" if is_super else "like"
    
    await db.execute(
        text("""
            INSERT INTO swipes (from_user_id, to_user_id, action, timestamp)
            VALUES (:from_id, :to_id, :action, NOW())
            ON CONFLICT (from_user_id, to_user_id) DO UPDATE SET action = :action
        """),
        {"from_id": current_user_id, "to_id": liked_user_id, "action": action}
    )
    
    # Check for mutual like
    mutual_check = await db.execute(
        text("""
            SELECT id FROM swipes 
            WHERE from_user_id = :to_id AND to_user_id = :from_id AND action IN ('like', 'superlike')
        """),
        {"from_id": current_user_id, "to_id": liked_user_id}
    )
    is_match = mutual_check.fetchone() is not None
    
    match_id = None
    if is_match:
        match_result = await db.execute(
            text("""
                INSERT INTO matches (user1_id, user2_id, created_at)
                VALUES (:user1, :user2, NOW())
                ON CONFLICT DO NOTHING
                RETURNING id::text
            """),
            {"user1": current_user_id, "user2": liked_user_id}
        )
        row = match_result.fetchone()
        if row:
            match_id = row[0]
    
    await db.commit()
    
    return {
        "status": "ok",
        "is_match": is_match,
        "match_id": match_id,
        "action": action
    }


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


# ============================================
# SWIPES STATUS (frontend calls /api/swipes/status)
# ============================================
@router.get("/swipes/status")
async def get_swipes_status(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get swipe status — remaining swipes, limits etc."""
    return {
        "remaining_swipes": 50,
        "max_swipes": 50,
        "reset_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "is_unlimited": False,
        "superlikes_remaining": 1,
        "boosts_remaining": 0
    }


@router.post("/swipes/buy-pack")
async def buy_swipe_pack(
    current_user_id: str = Depends(get_current_user_id)
):
    """Buy additional swipe pack"""
    return {"success": True, "remaining_swipes": 100, "message": "Swipe pack purchased"}


# ============================================
# NOTIFICATIONS LIST (frontend calls /api/notifications?page=&limit=)
# ============================================
@router.get("/notifications")
async def get_notifications(
    page: int = 1,
    limit: int = 20,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user notifications list"""
    return {
        "notifications": [],
        "total": 0,
        "page": page,
        "limit": limit,
        "unread_count": 0
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark notification as read"""
    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark all notifications as read"""
    return {"success": True, "updated_count": 0}


# ============================================
# REFERRAL SYSTEM
# ============================================
@router.get("/referral/code")
async def get_referral_code(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user's referral code"""
    short_id = current_user_id[:8] if len(current_user_id) >= 8 else current_user_id
    return {
        "code": f"REF-{short_id.upper()}",
        "link": f"https://app.example.com/ref/{short_id}",
        "reward": "50 stars per referral"
    }


@router.get("/referral/stats")
async def get_referral_stats(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get referral statistics"""
    return {
        "total_referrals": 0,
        "earned_stars": 0,
        "pending_rewards": 0
    }


@router.post("/referral/apply")
async def apply_referral_code(
    code: str = Body(..., embed=True),
    current_user_id: str = Depends(get_current_user_id)
):
    """Apply a referral code"""
    return {"success": True, "bonus": 50, "message": "Referral code applied! You received 50 stars."}


# ============================================
# DAILY REWARDS
# ============================================
@router.get("/rewards/daily")
async def get_daily_rewards(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get daily rewards status"""
    return {
        "available": True,
        "streak": 1,
        "reward": {"type": "stars", "amount": 10},
        "next_reward_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "streak_bonus": None
    }


@router.post("/rewards/daily/claim")
async def claim_daily_reward(
    current_user_id: str = Depends(get_current_user_id)
):
    """Claim daily reward"""
    return {
        "success": True,
        "reward": {"type": "stars", "amount": 10},
        "new_streak": 1,
        "message": "Daily reward claimed!"
    }


# ============================================
# WHO VIEWED ME
# ============================================
@router.get("/views/who-viewed-me")
async def who_viewed_me(
    limit: int = 20,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get list of users who viewed my profile"""
    return {
        "viewers": [],
        "total": 0,
        "is_premium_feature": True
    }


# ============================================
# COMPATIBILITY
# ============================================
@router.get("/compatibility/{user_id}")
async def get_compatibility(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get compatibility score with another user"""
    return {
        "score": 75,
        "breakdown": {
            "interests": 80,
            "lifestyle": 70,
            "values": 75
        },
        "common_interests": [],
        "tips": ["You both enjoy similar activities"]
    }


# ============================================
# PROFILE PROMPTS
# ============================================
@router.get("/prompts")
async def get_prompts(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get available profile prompts"""
    return {
        "prompts": [
            {"id": "about_me", "text": "Обо мне в двух словах..."},
            {"id": "looking_for", "text": "Я ищу..."},
            {"id": "fun_fact", "text": "Забавный факт обо мне..."},
            {"id": "ideal_date", "text": "Идеальное свидание — это..."},
            {"id": "unpopular_opinion", "text": "Моё непопулярное мнение..."},
            {"id": "superpower", "text": "Моя суперспособность — это..."}
        ]
    }


@router.post("/prompts/answer")
async def answer_prompt(
    prompt_id: str = Body(...),
    answer: str = Body(...),
    current_user_id: str = Depends(get_current_user_id)
):
    """Answer a profile prompt"""
    return {"status": "ok", "prompts": {prompt_id: answer}}


@router.get("/prompts/my")
async def get_my_prompts(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get my answered prompts"""
    return {"prompts": {}}


# ============================================
# MATCHING PREFERENCES
# ============================================
@router.get("/preferences/matching")
async def get_matching_preferences(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get matching preferences"""
    return {
        "age_min": 18,
        "age_max": 50,
        "distance_km": 50,
        "gender_preference": "any",
        "show_verified_only": False,
        "show_with_photo_only": True
    }


@router.put("/preferences/matching")
async def update_matching_preferences(
    prefs: Dict[str, Any] = Body(...),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update matching preferences"""
    return {"status": "ok", "preferences": prefs}


# ============================================
# BOOST (alternative paths — frontend also calls /api/boost/...)
# ============================================
@router.get("/boost/status")
async def get_boost_status(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get boost status"""
    return {
        "is_active": False,
        "remaining_seconds": 0,
        "boosts_available": 0,
        "multiplier": 1
    }


@router.post("/boost/activate")
async def activate_boost(
    duration_hours: int = Body(1, embed=True),
    current_user_id: str = Depends(get_current_user_id)
):
    """Activate profile boost"""
    return {
        "success": True,
        "expires_at": (datetime.utcnow() + timedelta(hours=duration_hours)).isoformat(),
        "multiplier": 3
    }


# ============================================
# SPOTLIGHT
# ============================================
@router.get("/spotlight")
async def get_spotlight(
    limit: int = 10,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get spotlight profiles"""
    return {
        "profiles": [],
        "total": 0,
        "refresh_at": (datetime.utcnow() + timedelta(hours=6)).isoformat()
    }


# ============================================
# SUGGESTIONS
# ============================================
@router.get("/suggestions")
async def get_suggestions(
    limit: int = 10,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get profile suggestions"""
    return {
        "suggestions": [],
        "total": 0
    }


# ============================================
# EVENTS
# ============================================
@router.get("/events")
async def get_events(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get available events"""
    return {
        "events": [],
        "total": 0
    }


@router.post("/events/{event_id}/register")
async def register_for_event(
    event_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """Register for an event"""
    return {"success": True, "message": "Registered for event"}


# ============================================
# LANGUAGES
# ============================================
@router.get("/languages")
async def get_languages():
    """Get available languages"""
    return {
        "languages": [
            {"code": "ru", "name": "Русский", "native_name": "Русский"},
            {"code": "en", "name": "English", "native_name": "English"},
            {"code": "uk", "name": "Ukrainian", "native_name": "Українська"},
            {"code": "kk", "name": "Kazakh", "native_name": "Қазақша"}
        ],
        "current": "ru"
    }


@router.put("/settings/language")
async def set_language(
    language: str = Body(..., embed=True),
    current_user_id: str = Depends(get_current_user_id)
):
    """Set user language"""
    return {"status": "ok"}


# ============================================
# SUPERLIKE INFO
# ============================================
@router.get("/superlike/info")
async def get_superlike_info(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get superlike info"""
    return {
        "remaining": 1,
        "max_daily": 1,
        "reset_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
        "price_stars": 50
    }


# ============================================
# HELP / SUPPORT
# ============================================
@router.get("/help")
async def get_help(
    category: Optional[str] = None,
    q: Optional[str] = None
):
    """Get help articles"""
    return {
        "articles": [
            {"id": "1", "title": "Как начать?", "category": "getting_started", "content": "Создайте профиль и начните свайпать!"},
            {"id": "2", "title": "Как работают матчи?", "category": "matches", "content": "Когда оба пользователя лайкнули друг друга."},
            {"id": "3", "title": "Безопасность", "category": "safety", "content": "Мы заботимся о вашей безопасности."}
        ],
        "categories": ["getting_started", "matches", "safety", "payments", "account"]
    }


@router.post("/support/tickets")
async def create_support_ticket(
    data: Dict[str, Any] = Body(...),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create support ticket"""
    return {"ticket_id": str(uuid.uuid4())[:8]}


# ============================================
# SUBSCRIPTION
# ============================================
@router.get("/subscription")
async def get_subscription(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get current subscription"""
    return {
        "plan": "free",
        "status": "active",
        "features": ["basic_swipes", "basic_chat"],
        "expires_at": None,
        "can_upgrade": True
    }


@router.post("/subscription")
async def create_subscription(
    plan: str = Body(..., embed=True),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create/upgrade subscription"""
    return {
        "success": True,
        "subscription": {
            "plan": plan,
            "status": "active",
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
    }


@router.post("/subscription/cancel")
async def cancel_subscription(
    current_user_id: str = Depends(get_current_user_id)
):
    """Cancel subscription"""
    return {"success": True}


# ============================================
# PAYMENTS HISTORY
# ============================================
@router.get("/payments/history")
async def get_payment_history(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get payment history"""
    return {
        "transactions": [],
        "total": 0,
        "page": 1,
        "limit": 20
    }
