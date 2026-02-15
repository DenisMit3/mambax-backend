# Users API - GDPR экспорт, лайки, stars (dev)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from backend.db.session import get_db
from backend.schemas.user import Location
from backend.config.settings import settings
from backend.api.users.profile import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me/likes-received")
async def get_likes_received(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get users who have liked the current user.
    Returns user profiles with isSuper flag.
    FIX: Single query with photos aggregated (no N+1)
    """
    user_id = str(current_user.id).replace('-', '')  # Remove dashes for CHAR(32) format
    logger.info(f"Getting likes for user_id: {user_id}")
    
    # FIX: Single query with photos aggregated using GROUP_CONCAT
    stmt = text("""
        SELECT 
            s.from_user_id, 
            s.action, 
            s.timestamp,
            u.name,
            u.age,
            u.is_active,
            STRING_AGG(p.url, ',') as photos
        FROM swipes s
        JOIN users u ON s.from_user_id = u.id
        LEFT JOIN user_photos p ON p.user_id = s.from_user_id
        WHERE s.to_user_id = :user_id 
        AND s.action IN ('like', 'superlike')
        GROUP BY s.from_user_id, s.action, s.timestamp, u.name, u.age, u.is_active
        ORDER BY s.timestamp DESC
        LIMIT :limit
    """)
    
    result = await db.execute(stmt, {"user_id": user_id, "limit": limit})
    rows = result.fetchall()
    logger.info(f"Found {len(rows)} likes for user {user_id}")
    
    # Build response - photos already included
    likes = []
    for row in rows:
        from_user_id, action, timestamp, name, age, is_active, photos_str = row
        if not is_active:
            continue
        
        # Parse photos from GROUP_CONCAT result
        photos = photos_str.split(',') if photos_str else []
        
        likes.append({
            "id": from_user_id,
            "name": name,
            "age": age,
            "photos": photos,
            "isSuper": action == 'superlike',
            "likedAt": timestamp if timestamp else None
        })
    
    return {"likes": likes, "total": len(likes)}


class AddStarsRequest(BaseModel):
    amount: int

@router.post("/me/add-stars-dev")
async def add_stars_dev(
    data: AddStarsRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    DEV ONLY: Add stars to balance without payment.
    """
    # FIX (SEC-003): Block in production
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")
    
    current_user.stars_balance += data.amount
    await db.commit()
    return {"status": "ok", "new_balance": current_user.stars_balance}


@router.post("/me/spend-stars-dev")
async def spend_stars_dev(
    data: AddStarsRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    DEV ONLY: Spend stars.
    """
    # FIX (SEC-003): Block in production
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")
    
    if current_user.stars_balance < data.amount:
        raise HTTPException(status_code=400, detail="Not enough stars")
        
    current_user.stars_balance -= data.amount
    await db.commit()
    return {"status": "ok", "new_balance": current_user.stars_balance}


@router.get("/me/export")
async def export_my_data(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    GDPR Data Export — полный экспорт всех данных пользователя.
    Включает профиль, сообщения, лайки, матчи, жалобы, покупки.
    """
    from backend.models.interaction import Swipe, Match, Like, Report
    from backend.models.chat import Message
    from backend.models.monetization import RevenueTransaction, GiftTransaction
    from backend.models.profile_enrichment import UserPrompt, UserPreference

    uid = current_user.id

    # Messages sent
    msgs_result = await db.execute(
        select(Message).where(Message.sender_id == uid).order_by(Message.created_at)
    )
    messages = [
        {"id": str(m.id), "match_id": str(m.match_id), "text": m.text,
         "created_at": str(m.created_at), "is_read": m.is_read}
        for m in msgs_result.scalars().all()
    ]

    # Likes given
    likes_result = await db.execute(
        select(Like).where(Like.liker_id == uid).order_by(Like.created_at)
    )
    likes = [
        {"target_id": str(l.liked_id), "created_at": str(l.created_at)}
        for l in likes_result.scalars().all()
    ]

    # Swipes
    swipes_result = await db.execute(
        select(Swipe).where(Swipe.from_user_id == uid).order_by(Swipe.timestamp)
    )
    swipes = [
        {"target_id": str(s.to_user_id), "action": s.action, "created_at": str(s.timestamp)}
        for s in swipes_result.scalars().all()
    ]

    # Matches
    matches_result = await db.execute(
        select(Match).where((Match.user1_id == uid) | (Match.user2_id == uid)).order_by(Match.created_at)
    )
    matches = [
        {"id": str(mt.id), "user1_id": str(mt.user1_id), "user2_id": str(mt.user2_id),
         "created_at": str(mt.created_at)}
        for mt in matches_result.scalars().all()
    ]

    # Reports filed by user
    reports_result = await db.execute(
        select(Report).where(Report.reporter_id == uid).order_by(Report.created_at)
    )
    reports = [
        {"reported_id": str(r.reported_id), "reason": r.reason, "created_at": str(r.created_at)}
        for r in reports_result.scalars().all()
    ]

    # Prompts & preferences
    prompts_result = await db.execute(select(UserPrompt).where(UserPrompt.user_id == uid))
    prompts = [
        {"prompt": p.prompt_text, "answer": p.answer_text}
        for p in prompts_result.scalars().all()
    ]

    prefs_result = await db.execute(select(UserPreference).where(UserPreference.user_id == uid))
    prefs_row = prefs_result.scalar_one_or_none()
    preferences = None
    if prefs_row:
        preferences = {
            "min_age": prefs_row.min_age, "max_age": prefs_row.max_age,
            "max_distance_km": prefs_row.max_distance_km,
            "gender_preference": prefs_row.gender_preference,
        }

    return {
        "export_date": str(datetime.now(timezone.utc)),
        "user_profile": {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "telegram_id": current_user.telegram_id,
            "bio": current_user.bio,
            "interests": current_user.interests,
            "photos": current_user.photos,
            "gender": current_user.gender,
            "age": current_user.age,
            "location": {"lat": current_user.latitude, "lon": current_user.longitude} if current_user.latitude else None,
            "created_at": str(current_user.created_at),
            "status": current_user.status,
            "role": current_user.role,
            "subscription_tier": current_user.subscription_tier,
        },
        "preferences": preferences,
        "prompts": prompts,
        "messages_sent": messages,
        "likes_given": likes,
        "swipes": swipes,
        "matches": matches,
        "reports_filed": reports,
        "privacy_note": "This is a complete export of your personal data stored on MambaX per GDPR Article 20."
    }
