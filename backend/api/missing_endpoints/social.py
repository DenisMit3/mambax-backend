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
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get user notifications list from in_app_notifications table."""
    from backend.models.notifications import InAppNotification
    from sqlalchemy import select, func, desc
    import uuid as _uuid

    uid = _uuid.UUID(current_user_id) if isinstance(current_user_id, str) else current_user_id
    offset = (page - 1) * limit

    # Total unread
    unread_stmt = select(func.count(InAppNotification.id)).where(
        InAppNotification.user_id == uid,
        InAppNotification.is_read == False,
    )
    unread_count = (await db.execute(unread_stmt)).scalar() or 0

    # Paginated list
    stmt = (
        select(InAppNotification)
        .where(InAppNotification.user_id == uid)
        .order_by(desc(InAppNotification.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    notifications = [
        {
            "id": str(n.id),
            "type": n.notification_type,
            "title": n.title,
            "body": n.body,
            "image_url": n.icon_url,
            "action_url": n.action_url,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]

    return {
        "notifications": notifications,
        "total": len(notifications),
        "page": page,
        "limit": limit,
        "unread_count": unread_count,
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark notification as read"""
    from backend.models.notifications import InAppNotification
    import uuid as _uuid
    from datetime import datetime

    uid = _uuid.UUID(current_user_id) if isinstance(current_user_id, str) else current_user_id
    nid = _uuid.UUID(notification_id)

    notif = await db.get(InAppNotification, nid)
    if notif and notif.user_id == uid and not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.utcnow()
        await db.commit()

    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark all notifications as read"""
    from backend.models.notifications import InAppNotification
    from sqlalchemy import update
    from datetime import datetime
    import uuid as _uuid

    uid = _uuid.UUID(current_user_id) if isinstance(current_user_id, str) else current_user_id

    stmt = (
        update(InAppNotification)
        .where(InAppNotification.user_id == uid, InAppNotification.is_read == False)
        .values(is_read=True, read_at=datetime.utcnow())
    )
    result = await db.execute(stmt)
    await db.commit()

    return {"success": True, "updated_count": result.rowcount}


# --- Referral ---

REFERRAL_REWARD_STARS = 50  # Stars for both referrer and referee

def _generate_referral_code() -> str:
    """Generate unique 8-char referral code"""
    import secrets
    return f"REF-{secrets.token_hex(4).upper()}"


@router.get("/referral/code")
async def get_referral_code(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get or create user's referral code from DB"""
    from backend.models.user import User
    from uuid import UUID

    user = await db.get(User, UUID(current_user_id))
    if not user:
        return {"error": "Пользователь не найден"}, 404

    # Generate code if missing
    if not user.referral_code:
        for _ in range(5):  # retry on collision
            code = _generate_referral_code()
            existing = await db.execute(
                text("SELECT id FROM users WHERE referral_code = :code"),
                {"code": code}
            )
            if not existing.fetchone():
                user.referral_code = code
                await db.commit()
                break
        else:
            user.referral_code = f"REF-{current_user_id[:8].upper()}"
            await db.commit()

    bot_username = "YouMeMeet_bot"
    return {
        "code": user.referral_code,
        "link": f"https://t.me/{bot_username}?start={user.referral_code}",
        "reward": f"{REFERRAL_REWARD_STARS} звёзд за приглашение"
    }


@router.get("/referral/stats")
async def get_referral_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get real referral statistics from DB"""
    from uuid import UUID
    uid = UUID(current_user_id)

    # Total referrals (where I am the referrer)
    total_q = await db.execute(
        text("SELECT COUNT(*) FROM referrals WHERE referrer_id = :uid"),
        {"uid": uid}
    )
    total_referrals = total_q.scalar() or 0

    # Earned stars (converted + paid)
    earned_q = await db.execute(
        text("SELECT COALESCE(SUM(reward_stars), 0) FROM referrals WHERE referrer_id = :uid AND status = 'converted' AND reward_paid = true"),
        {"uid": uid}
    )
    earned_stars = float(earned_q.scalar() or 0)

    # Pending rewards (converted but not paid + pending)
    pending_q = await db.execute(
        text("SELECT COUNT(*) FROM referrals WHERE referrer_id = :uid AND (status = 'pending' OR (status = 'converted' AND reward_paid = false))"),
        {"uid": uid}
    )
    pending_rewards = pending_q.scalar() or 0

    return {
        "total_referrals": total_referrals,
        "earned_stars": int(earned_stars),
        "pending_rewards": pending_rewards
    }


@router.get("/referral/invited")
async def get_referral_invited(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get list of invited users"""
    from uuid import UUID
    uid = UUID(current_user_id)

    rows = await db.execute(
        text("""
            SELECT u.name, u.username, r.status, r.reward_stars, r.reward_paid, r.created_at
            FROM referrals r
            JOIN users u ON u.id = r.referred_id
            WHERE r.referrer_id = :uid
            ORDER BY r.created_at DESC
            LIMIT 50
        """),
        {"uid": uid}
    )
    invited = []
    for row in rows.fetchall():
        invited.append({
            "name": row[0] or "Аноним",
            "username": row[1],
            "status": row[2],
            "reward_stars": int(row[3] or 0),
            "reward_paid": row[4],
            "joined_at": row[5].isoformat() if row[5] else None,
        })

    return {"invited": invited}


@router.post("/referral/apply")
async def apply_referral_code(
    code: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Apply a referral code with full validation"""
    from backend.models.user import User
    from backend.models.marketing import Referral, ReferralStatus
    from uuid import UUID
    from decimal import Decimal

    code = code.strip().upper()
    uid = UUID(current_user_id)

    # 1. Validate code format
    if not code or len(code) < 5:
        return {"success": False, "bonus": 0, "message": "Неверный формат кода"}

    # 2. Check if user already used a referral code
    current_user = await db.get(User, uid)
    if not current_user:
        return {"success": False, "bonus": 0, "message": "Пользователь не найден"}

    if current_user.referred_by is not None:
        return {"success": False, "bonus": 0, "message": "Ты уже использовал реферальный код"}

    # 3. Find referrer by code
    referrer_q = await db.execute(
        text("SELECT id FROM users WHERE referral_code = :code"),
        {"code": code}
    )
    referrer_row = referrer_q.fetchone()
    if not referrer_row:
        return {"success": False, "bonus": 0, "message": "Код не найден. Проверь и попробуй снова"}

    referrer_id = referrer_row[0]

    # 4. Self-referral check
    if str(referrer_id) == current_user_id:
        return {"success": False, "bonus": 0, "message": "Нельзя использовать свой собственный код"}

    # 5. Check duplicate referral record
    dup_q = await db.execute(
        text("SELECT id FROM referrals WHERE referrer_id = :ref_id AND referred_id = :uid"),
        {"ref_id": referrer_id, "uid": uid}
    )
    if dup_q.fetchone():
        return {"success": False, "bonus": 0, "message": "Этот код уже был применён"}

    # 6. Set referred_by on current user
    current_user.referred_by = referrer_id

    # 7. Create referral record
    referral = Referral(
        referrer_id=referrer_id,
        referred_id=uid,
        status=ReferralStatus.CONVERTED,
        reward_stars=REFERRAL_REWARD_STARS,
        reward_paid=True,
        converted_at=datetime.utcnow(),
    )
    db.add(referral)

    # 8. Credit stars to both users
    reward = Decimal(REFERRAL_REWARD_STARS)
    await db.execute(
        text("UPDATE users SET stars_balance = stars_balance + :reward WHERE id = :uid"),
        {"reward": reward, "uid": uid}
    )
    await db.execute(
        text("UPDATE users SET stars_balance = stars_balance + :reward WHERE id = :ref_id"),
        {"reward": reward, "ref_id": referrer_id}
    )

    await db.commit()

    logger.info(f"Referral applied: {current_user_id} used code {code} from {referrer_id}")

    return {
        "success": True,
        "bonus": REFERRAL_REWARD_STARS,
        "message": f"Код применён! Ты получил {REFERRAL_REWARD_STARS} ⭐"
    }


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
