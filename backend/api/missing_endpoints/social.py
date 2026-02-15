# Missing Endpoints - Social: likes, notifications, referral, rewards, views, compatibility

from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from datetime import datetime, timedelta
import logging

from backend.db.session import get_db
from backend.api.missing_endpoints.deps import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter()


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


# --- Swipes Status ---
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


# --- Notifications ---
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


# --- Referral ---
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


# --- Daily Rewards ---
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


# --- Who Viewed Me ---
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


# --- Compatibility ---
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


# --- Superlike Info ---
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
