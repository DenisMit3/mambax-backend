# Missing Endpoints - Social: likes, notifications, referral, rewards, views, compatibility

from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func, desc, update
from typing import Optional
from datetime import datetime, timedelta
import logging
import uuid as _uuid

from backend.db.session import get_db
from backend.api.missing_endpoints.deps import get_current_user_id

# Import real services
from backend.services.gamification.daily_rewards import (
    get_daily_reward_status,
    claim_daily_reward
)
from backend.services.social.profile_views import (
    record_profile_view,
    get_who_viewed_me,
    get_view_stats
)
from backend.services.social.compatibility import calculate_compatibility
from backend.services.social.stories import (
    create_story,
    get_stories_feed,
    view_story,
    react_to_story,
    get_story_viewers,
    delete_story,
    get_my_stories
)
from backend.services.swipe_limits import get_swipe_status

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
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get swipe status - remaining swipes, limits etc."""
    uid = _uuid.UUID(current_user_id)
    
    # Get real status from swipe_limits service
    status = await get_swipe_status(db, uid)
    
    return {
        "remaining_swipes": status.get("remaining", 50),
        "max_swipes": status.get("max", 50),
        "reset_at": status.get("reset_at"),
        "is_unlimited": status.get("is_unlimited", False),
        "superlikes_remaining": status.get("superlikes_remaining", 1),
        "boosts_remaining": status.get("boosts_remaining", 0)
    }


@router.post("/swipes/buy-pack")
async def buy_swipe_pack(
    current_user_id: str = Depends(get_current_user_id)
):
    """Buy additional swipe pack"""
    # TODO: Integrate with payment system
    return {
        "success": False,
        "message": "Используй Telegram Stars для покупки"
    }


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

    user = await db.get(User, _uuid.UUID(current_user_id))
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

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
    uid = _uuid.UUID(current_user_id)

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
    uid = _uuid.UUID(current_user_id)

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
    from decimal import Decimal

    code = code.strip().upper()
    uid = _uuid.UUID(current_user_id)

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
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get daily rewards status"""
    uid = _uuid.UUID(current_user_id)
    result = await get_daily_reward_status(db, uid)
    return result


@router.post("/rewards/daily/claim")
async def claim_daily_reward_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Claim daily reward"""
    uid = _uuid.UUID(current_user_id)
    result = await claim_daily_reward(db, uid)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


# --- Who Viewed Me ---
@router.get("/views/who-viewed-me")
async def who_viewed_me(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get list of users who viewed my profile"""
    from backend.models.user import User
    
    uid = _uuid.UUID(current_user_id)
    
    # Check if user is VIP
    user = await db.get(User, uid)
    is_vip = user.is_vip if user and hasattr(user, 'is_vip') else False
    
    result = await get_who_viewed_me(db, uid, limit, offset, is_vip)
    return result


@router.get("/views/stats")
async def get_views_stats(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get profile view statistics"""
    uid = _uuid.UUID(current_user_id)
    result = await get_view_stats(db, uid)
    return result


@router.post("/views/record")
async def record_view(
    viewed_user_id: str = Body(..., embed=True),
    source: str = Body("discover"),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Record a profile view"""
    viewer_id = _uuid.UUID(current_user_id)
    viewed_id = _uuid.UUID(viewed_user_id)
    
    result = await record_profile_view(db, viewer_id, viewed_id, source)
    return result


# --- Compatibility ---
@router.get("/compatibility/{user_id}")
async def get_compatibility(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get compatibility score with another user"""
    uid1 = _uuid.UUID(current_user_id)
    uid2 = _uuid.UUID(user_id)
    
    result = await calculate_compatibility(db, uid1, uid2)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


# --- Stories ---
@router.get("/stories")
async def get_stories(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get stories feed from matches"""
    uid = _uuid.UUID(current_user_id)
    feed = await get_stories_feed(db, uid, limit)
    return {"stories": feed}


@router.get("/stories/my")
async def get_my_stories_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get my active stories"""
    uid = _uuid.UUID(current_user_id)
    stories = await get_my_stories(db, uid)
    return {"stories": stories}


@router.post("/stories")
async def create_story_endpoint(
    media_url: str = Body(...),
    media_type: str = Body("image"),
    caption: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create a new story"""
    uid = _uuid.UUID(current_user_id)
    result = await create_story(db, uid, media_url, media_type, caption)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.post("/stories/{story_id}/view")
async def view_story_endpoint(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Mark story as viewed"""
    uid = _uuid.UUID(current_user_id)
    sid = _uuid.UUID(story_id)
    
    result = await view_story(db, sid, uid)
    return result


@router.post("/stories/{story_id}/react")
async def react_to_story_endpoint(
    story_id: str,
    emoji: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """React to a story"""
    uid = _uuid.UUID(current_user_id)
    sid = _uuid.UUID(story_id)
    
    result = await react_to_story(db, sid, uid, emoji)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/stories/{story_id}/viewers")
async def get_story_viewers_endpoint(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get story viewers (only for story owner)"""
    uid = _uuid.UUID(current_user_id)
    sid = _uuid.UUID(story_id)
    
    result = await get_story_viewers(db, sid, uid)
    
    if "error" in result:
        raise HTTPException(status_code=403, detail=result["error"])
    
    return result


@router.delete("/stories/{story_id}")
async def delete_story_endpoint(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Delete a story"""
    uid = _uuid.UUID(current_user_id)
    sid = _uuid.UUID(story_id)
    
    result = await delete_story(db, sid, uid)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


# --- Superlike Info ---
@router.get("/superlike/info")
async def get_superlike_info(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """Get superlike info"""
    uid = _uuid.UUID(current_user_id)
    
    # Get from swipe status
    status = await get_swipe_status(db, uid)
    
    return {
        "remaining": status.get("superlikes_remaining", 1),
        "max_daily": 1,
        "reset_at": status.get("reset_at"),
        "price_stars": 50
    }
