# Missing Endpoints - Content: prompts, preferences, boost, spotlight, suggestions,
# events, languages, help, support, subscription, payments

from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import uuid

from backend.db.session import get_db
from backend.api.missing_endpoints.deps import get_current_user_id

# Import real services
from backend.services.social.prompts import (
    get_available_prompts,
    get_user_prompts,
    save_prompt_answer,
    delete_prompt_answer,
    reorder_prompts
)
from backend.services.social.preferences import (
    get_matching_preferences as get_prefs_service,
    update_matching_preferences as update_prefs_service,
    PREFERENCE_SCHEMA
)
from backend.services.social.spotlight import (
    get_spotlight_profiles,
    join_spotlight,
    get_spotlight_stats
)
from backend.services.social.events import (
    get_events as get_events_service,
    get_event_details,
    register_for_event,
    cancel_registration,
    get_my_events
)
from backend.services.ux_features.visibility import (
    is_boosted,
    get_boost_status,
    activate_boost
)
from backend.models.monetization import RevenueTransaction
from sqlalchemy import select, desc

router = APIRouter()


# --- Profile Prompts ---
@router.get("/prompts")
async def get_prompts(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get available profile prompts"""
    prompts = get_available_prompts()
    return {"prompts": prompts}


@router.post("/prompts/answer")
async def answer_prompt(
    prompt_id: str = Body(...),
    answer: str = Body(...),
    answer_type: str = Body("text"),
    media_url: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Answer a profile prompt"""
    uid = uuid.UUID(current_user_id)
    result = await save_prompt_answer(db, uid, prompt_id, answer, answer_type, media_url)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/prompts/my")
async def get_my_prompts(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get my answered prompts"""
    uid = uuid.UUID(current_user_id)
    prompts = await get_user_prompts(db, uid)
    return {"prompts": prompts}


@router.delete("/prompts/{prompt_id}")
async def delete_my_prompt(
    prompt_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete a prompt answer"""
    uid = uuid.UUID(current_user_id)
    pid = uuid.UUID(prompt_id)
    result = await delete_prompt_answer(db, uid, pid)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.put("/prompts/reorder")
async def reorder_my_prompts(
    prompt_ids: List[str] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Reorder prompt answers"""
    uid = uuid.UUID(current_user_id)
    result = await reorder_prompts(db, uid, prompt_ids)
    return result


# --- Matching Preferences ---
@router.get("/preferences/matching")
async def get_matching_preferences(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get matching preferences"""
    uid = uuid.UUID(current_user_id)
    result = await get_prefs_service(db, uid)
    return result


@router.put("/preferences/matching")
async def update_matching_preferences(
    preferences: Dict[str, Any] = Body(...),
    dealbreakers: Optional[List[str]] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Update matching preferences"""
    uid = uuid.UUID(current_user_id)
    result = await update_prefs_service(db, uid, preferences, dealbreakers)
    return result


# --- Boost ---
@router.get("/boost/status")
async def get_boost_status_endpoint(
    current_user_id: str = Depends(get_current_user_id)
):
    """Get boost status"""
    uid = uuid.UUID(current_user_id)
    status = await get_boost_status(str(uid))
    
    return {
        "is_active": status.get("is_boosted", False),
        "remaining_seconds": int(status.get("remaining_seconds", 0)),
        "expires_at": status.get("expires_at"),
        "multiplier": 3 if status.get("is_boosted") else 1
    }


@router.post("/boost/activate")
async def activate_boost_endpoint(
    duration_minutes: int = Body(30, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Activate profile boost"""
    uid = uuid.UUID(current_user_id)
    
    # Activate boost via visibility service
    result = await activate_boost(str(uid), duration_minutes)
    
    return {
        "success": True,
        "expires_at": result.get("expires_at"),
        "duration_minutes": duration_minutes,
        "multiplier": 3
    }


# --- Spotlight ---
@router.get("/spotlight")
async def get_spotlight(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get spotlight profiles"""
    uid = uuid.UUID(current_user_id)
    result = await get_spotlight_profiles(db, uid, limit)
    return result


@router.post("/spotlight/join")
async def join_spotlight_endpoint(
    duration_hours: int = Body(1, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Join spotlight (paid feature)"""
    uid = uuid.UUID(current_user_id)
    result = await join_spotlight(db, uid, duration_hours)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/spotlight/stats")
async def get_spotlight_stats_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get my spotlight statistics"""
    uid = uuid.UUID(current_user_id)
    result = await get_spotlight_stats(db, uid)
    return result


# --- Suggestions ---
@router.get("/suggestions")
async def get_suggestions(
    limit: int = 10,
    current_user_id: str = Depends(get_current_user_id)
):
    """Get profile suggestions - uses recommendation engine"""
    # TODO: Connect to AI recommendations service
    return {
        "suggestions": [],
        "total": 0,
        "message": "Используй Discover для поиска"
    }


# --- Events ---
@router.get("/events")
async def get_events(
    city: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get available events"""
    uid = uuid.UUID(current_user_id)
    result = await get_events_service(db, uid, city, category, limit, offset)
    return result


@router.get("/events/my")
async def get_my_events_endpoint(
    include_past: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get events I'm registered for"""
    uid = uuid.UUID(current_user_id)
    events = await get_my_events(db, uid, include_past)
    return {"events": events}


@router.get("/events/{event_id}")
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get event details"""
    uid = uuid.UUID(current_user_id)
    eid = uuid.UUID(event_id)
    result = await get_event_details(db, eid, uid)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@router.post("/events/{event_id}/register")
async def register_for_event_endpoint(
    event_id: str,
    use_stars: bool = Body(False, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Register for an event"""
    uid = uuid.UUID(current_user_id)
    eid = uuid.UUID(event_id)
    result = await register_for_event(db, eid, uid, use_stars)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/events/{event_id}/cancel")
async def cancel_event_registration(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Cancel event registration"""
    uid = uuid.UUID(current_user_id)
    eid = uuid.UUID(event_id)
    result = await cancel_registration(db, eid, uid)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


# --- Languages ---
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
    # TODO: Save to user settings
    return {"status": "ok", "language": language}


# --- Help / Support ---
@router.get("/help")
async def get_help(
    category: Optional[str] = None,
    q: Optional[str] = None
):
    """Get help articles"""
    articles = [
        {"id": "1", "title": "Как начать?", "category": "getting_started", "content": "Создайте профиль и начните свайпать!"},
        {"id": "2", "title": "Как работают матчи?", "category": "matches", "content": "Когда оба пользователя лайкнули друг друга, создаётся матч."},
        {"id": "3", "title": "Безопасность", "category": "safety", "content": "Мы заботимся о вашей безопасности. Не делитесь личными данными."},
        {"id": "4", "title": "Как получить звёзды?", "category": "payments", "content": "Звёзды можно получить за ежедневные награды или купить."},
        {"id": "5", "title": "Что такое Spotlight?", "category": "features", "content": "Spotlight показывает ваш профиль большему количеству людей."},
        {"id": "6", "title": "Как работает буст?", "category": "features", "content": "Буст увеличивает видимость вашего профиля на 30 минут."},
    ]
    
    if category:
        articles = [a for a in articles if a["category"] == category]
    
    if q:
        q_lower = q.lower()
        articles = [a for a in articles if q_lower in a["title"].lower() or q_lower in a["content"].lower()]
    
    return {
        "articles": articles,
        "categories": ["getting_started", "matches", "safety", "payments", "features", "account"]
    }


@router.post("/support/tickets")
async def create_support_ticket(
    data: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create support ticket"""
    ticket_id = str(uuid.uuid4())[:8]
    
    # TODO: Save ticket to database
    # For now just return ticket ID
    
    return {
        "ticket_id": ticket_id,
        "message": "Тикет создан. Мы ответим в течение 24 часов."
    }


# --- Subscription ---
@router.get("/subscription")
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get current subscription"""
    from backend.models.user import User
    
    uid = uuid.UUID(current_user_id)
    user = await db.get(User, uid)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check VIP status
    is_vip = user.is_vip if hasattr(user, 'is_vip') else False
    vip_until = user.vip_until if hasattr(user, 'vip_until') else None
    
    if is_vip and vip_until:
        return {
            "plan": "vip",
            "status": "active",
            "features": ["unlimited_swipes", "see_who_liked", "read_receipts", "spotlight", "no_ads"],
            "expires_at": vip_until.isoformat() if vip_until else None,
            "can_upgrade": False
        }
    
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
    # TODO: Integrate with payment system
    return {
        "success": True,
        "message": "Для оплаты используй Telegram Stars",
        "subscription": {
            "plan": plan,
            "status": "pending",
            "payment_url": None
        }
    }


@router.post("/subscription/cancel")
async def cancel_subscription(
    current_user_id: str = Depends(get_current_user_id)
):
    """Cancel subscription"""
    return {"success": True, "message": "Подписка будет отменена в конце периода"}


# --- Payments History ---
@router.get("/payments/history")
async def get_payment_history(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get payment history"""
    uid = uuid.UUID(current_user_id)
    offset = (page - 1) * limit
    
    # Get transactions from database
    stmt = (
        select(RevenueTransaction)
        .where(RevenueTransaction.user_id == uid)
        .order_by(desc(RevenueTransaction.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    transactions = result.scalars().all()
    
    return {
        "transactions": [
            {
                "id": str(t.id),
                "type": t.transaction_type,
                "amount": float(t.amount),
                "currency": t.currency,
                "status": t.status,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in transactions
        ],
        "total": len(transactions),
        "page": page,
        "limit": limit
    }
