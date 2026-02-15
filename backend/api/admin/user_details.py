"""
Admin User Details endpoints: timeline, notes, GDPR, payments, chats, matches,
reports, photos, login-history, impersonate, warn, reset-password, notify,
subscription, edit.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, or_, select
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import uuid as uuid_module

from backend.database import get_db
from backend.models.user import User, UserPhoto
from backend.models.interaction import Report, Match
from backend.models.monetization import UserSubscription, RevenueTransaction
from backend.models.chat import Message
from backend.models.social import Conversation
from backend.models.system import AuditLog
from backend.models.user_management import UserNote
from .deps import get_current_admin

router = APIRouter()


class UserEditRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    status: Optional[str] = None
    subscription_tier: Optional[str] = None


class UserNoteCreate(BaseModel):
    text: str
    type: str = "general"


class UserNotifyRequest(BaseModel):
    title: str
    message: str
    channel: str = "push"


class SubscriptionUpdateRequest(BaseModel):
    plan: str
    duration_days: int = 30


# ============================================
# TIMELINE & NOTES
# ============================================

@router.get("/users/{user_id}/timeline")
async def get_user_timeline(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user activity timeline"""
    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")

    events = []

    # Audit logs related to this user
    result = await db.execute(
        select(AuditLog).where(
            AuditLog.target_resource.like(f"%{user_id}%")
        ).order_by(desc(AuditLog.created_at)).limit(limit)
    )
    for log in result.scalars().all():
        events.append({
            "type": "admin_action",
            "action": log.action,
            "details": log.changes,
            "timestamp": log.created_at.isoformat()
        })

    # Recent messages
    result = await db.execute(
        select(Message).where(Message.sender_id == uid).order_by(desc(Message.created_at)).limit(20)
    )
    for msg in result.scalars().all():
        events.append({
            "type": "message",
            "action": "sent_message",
            "details": {"chat_id": str(msg.chat_room_id)},
            "timestamp": msg.created_at.isoformat()
        })

    # Reports
    result = await db.execute(
        select(Report).where(
            or_(Report.reporter_id == uid, Report.reported_id == uid)
        ).order_by(desc(Report.created_at)).limit(20)
    )
    for report in result.scalars().all():
        is_reporter = str(report.reporter_id) == user_id
        events.append({
            "type": "report",
            "action": "filed_report" if is_reporter else "was_reported",
            "details": {"reason": report.reason, "status": report.status},
            "timestamp": report.created_at.isoformat()
        })

    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"events": events[:limit]}


@router.get("/users/{user_id}/notes")
async def get_user_notes(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get admin notes for a user"""
    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")

    result = await db.execute(
        select(UserNote, User.name).outerjoin(
            User, UserNote.admin_id == User.id
        ).where(UserNote.user_id == uid).order_by(desc(UserNote.created_at))
    )
    rows = result.all()

    return {
        "notes": [
            {
                "id": str(note.id),
                "text": note.text,
                "type": note.type,
                "admin_name": name or "Система",
                "created_at": note.created_at.isoformat()
            }
            for note, name in rows
        ]
    }


@router.post("/users/{user_id}/notes")
async def add_user_note(
    user_id: str,
    data: UserNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Add admin note to a user"""
    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")

    note = UserNote(
        user_id=uid,
        admin_id=current_user.id,
        text=data.text,
        type=data.type
    )
    db.add(note)
    await db.commit()

    return {"status": "success", "message": "Заметка добавлена", "id": str(note.id)}


# ============================================
# GDPR
# ============================================

@router.get("/users/{user_id}/gdpr-export")
async def gdpr_export_user_data(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Export all user data for GDPR compliance"""
    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    result = await db.execute(
        select(Message).where(Message.sender_id == uid).order_by(Message.created_at)
    )
    messages = result.scalars().all()

    result = await db.execute(
        select(Match).where(or_(Match.user1_id == uid, Match.user2_id == uid))
    )
    matches = result.scalars().all()

    result = await db.execute(
        select(RevenueTransaction).where(RevenueTransaction.user_id == uid)
    )
    transactions = result.scalars().all()

    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "age": user.age,
            "gender": str(user.gender) if user.gender else None,
            "bio": user.bio,
            "city": user.city,
            "photos": user.photos or [],
            "created_at": user.created_at.isoformat(),
        },
        "messages": [
            {"id": str(m.id), "content": m.content, "created_at": m.created_at.isoformat()}
            for m in messages
        ],
        "matches": [
            {"id": str(m.id), "created_at": m.created_at.isoformat()}
            for m in matches
        ],
        "transactions": [
            {"id": str(t.id), "amount": float(t.amount), "created_at": t.created_at.isoformat()}
            for t in transactions
        ],
        "exported_at": datetime.utcnow().isoformat()
    }


# ============================================
# PAYMENTS, CHATS, MATCHES, REPORTS, PHOTOS
# ============================================

@router.get("/users/{user_id}/payments")
async def get_user_payments(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user payment history"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(
        select(RevenueTransaction).where(
            RevenueTransaction.user_id == uid
        ).order_by(desc(RevenueTransaction.created_at))
    )
    txs = result.scalars().all()

    return {
        "payments": [
            {
                "id": str(t.id),
                "amount": float(t.amount),
                "currency": t.currency,
                "type": t.type,
                "status": t.status,
                "created_at": t.created_at.isoformat()
            }
            for t in txs
        ]
    }


@router.get("/users/{user_id}/chats")
async def get_user_chats(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user chat rooms"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(
        select(Conversation).where(
            or_(Conversation.user1_id == uid, Conversation.user2_id == uid)
        ).order_by(desc(Conversation.last_message_at))
    )
    rooms = result.scalars().all()

    chats = []
    for room in rooms:
        other_id = room.user2_id if room.user1_id == uid else room.user1_id
        other_result = await db.execute(select(User.name).where(User.id == other_id))
        other_name = other_result.scalar() or "Удалённый"

        msg_count = await db.execute(
            select(func.count(Message.id)).where(Message.match_id == room.match_id)
        )

        chats.append({
            "id": str(room.id),
            "other_user_id": str(other_id),
            "other_user_name": other_name,
            "messages_count": msg_count.scalar() or 0,
            "updated_at": room.last_message_at.isoformat() if room.last_message_at else None
        })

    return {"chats": chats}


@router.get("/users/{user_id}/matches")
async def get_user_matches(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user matches"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(
        select(Match).where(
            or_(Match.user1_id == uid, Match.user2_id == uid)
        ).order_by(desc(Match.created_at))
    )
    matches = result.scalars().all()

    items = []
    for m in matches:
        other_id = m.user2_id if m.user1_id == uid else m.user1_id
        other_result = await db.execute(select(User.name).where(User.id == other_id))
        other_name = other_result.scalar() or "Удалённый"

        items.append({
            "id": str(m.id),
            "other_user_id": str(other_id),
            "other_user_name": other_name,
            "created_at": m.created_at.isoformat()
        })

    return {"matches": items}


@router.get("/users/{user_id}/reports")
async def get_user_reports(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get reports involving user"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(
        select(Report).where(
            or_(Report.reporter_id == uid, Report.reported_id == uid)
        ).order_by(desc(Report.created_at))
    )
    reports = result.scalars().all()

    return {
        "reports": [
            {
                "id": str(r.id),
                "reporter_id": str(r.reporter_id),
                "reported_id": str(r.reported_id),
                "reason": r.reason,
                "status": r.status,
                "is_reporter": str(r.reporter_id) == user_id,
                "created_at": r.created_at.isoformat()
            }
            for r in reports
        ]
    }


@router.get("/users/{user_id}/photos")
async def get_user_photos(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get user photos"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(
        select(UserPhoto).where(UserPhoto.user_id == uid).order_by(UserPhoto.created_at)
    )
    photos = result.scalars().all()

    return {
        "photos": [
            {
                "id": str(p.id),
                "url": p.url,
                "is_primary": p.is_primary,
                "is_verified": p.is_verified,
                "created_at": p.created_at.isoformat()
            }
            for p in photos
        ]
    }


# ============================================
# ACTIONS: warn, reset-password, notify, subscription, edit, impersonate
# ============================================

@router.post("/users/{user_id}/warn")
async def warn_user(
    user_id: str,
    message: str = "Нарушение правил сообщества",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Send warning to user"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    db.add(AuditLog(
        admin_id=current_user.id,
        action="warn_user",
        target_resource=f"user:{user_id}",
        changes={"message": message}
    ))
    await db.commit()

    return {"status": "success", "message": "Предупреждение отправлено"}


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Reset user password (generates temporary)"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    from backend.core.security import hash_password
    import secrets
    temp_password = secrets.token_urlsafe(12)
    user.hashed_password = hash_password(temp_password)

    db.add(AuditLog(
        admin_id=current_user.id,
        action="reset_password",
        target_resource=f"user:{user_id}",
        changes={}
    ))
    await db.commit()

    return {"status": "success", "temp_password": temp_password}


@router.post("/users/{user_id}/notify")
async def notify_user(
    user_id: str,
    data: UserNotifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Send notification to specific user"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    db.add(AuditLog(
        admin_id=current_user.id,
        action="notify_user",
        target_resource=f"user:{user_id}",
        changes={"title": data.title, "message": data.message, "channel": data.channel}
    ))
    await db.commit()

    return {"status": "success", "message": "Уведомление отправлено"}


@router.put("/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    data: SubscriptionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update user subscription"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    from backend.models.user import SubscriptionTier
    tier_map = {
        "free": SubscriptionTier.FREE,
        "gold": SubscriptionTier.GOLD,
        "platinum": SubscriptionTier.PLATINUM,
        "vip": SubscriptionTier.VIP,
    }
    tier = tier_map.get(data.plan)
    if not tier:
        raise HTTPException(status_code=400, detail="Неизвестный план подписки")

    old_tier = str(user.subscription_tier)
    user.subscription_tier = tier

    db.add(AuditLog(
        admin_id=current_user.id,
        action="update_subscription",
        target_resource=f"user:{user_id}",
        changes={"old": old_tier, "new": data.plan, "duration_days": data.duration_days}
    ))
    await db.commit()

    return {"status": "success", "message": f"Подписка обновлена на {data.plan}"}


@router.put("/users/{user_id}/edit")
async def edit_user_profile(
    user_id: str,
    data: UserEditRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Edit user profile fields"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    changes = {}
    if data.name is not None:
        changes["name"] = {"old": user.name, "new": data.name}
        user.name = data.name
    if data.email is not None:
        changes["email"] = {"old": user.email, "new": data.email}
        user.email = data.email
    if data.phone is not None:
        changes["phone"] = {"old": user.phone, "new": data.phone}
        user.phone = data.phone
    if data.age is not None:
        changes["age"] = {"old": user.age, "new": data.age}
        user.age = data.age
    if data.bio is not None:
        changes["bio"] = {"old": user.bio, "new": data.bio}
        user.bio = data.bio
    if data.city is not None:
        changes["city"] = {"old": user.city, "new": data.city}
        user.city = data.city

    if changes:
        db.add(AuditLog(
            admin_id=current_user.id,
            action="edit_user",
            target_resource=f"user:{user_id}",
            changes=changes
        ))
        await db.commit()

    return {"status": "success", "message": "Профиль обновлён", "changes": list(changes.keys())}


@router.post("/users/{user_id}/impersonate")
async def impersonate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Generate impersonation token for user"""
    uid = uuid_module.UUID(user_id)

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    from backend.auth import create_access_token
    token = create_access_token(data={"sub": str(user.id), "impersonated_by": str(current_user.id)})

    db.add(AuditLog(
        admin_id=current_user.id,
        action="impersonate",
        target_resource=f"user:{user_id}",
        changes={"target_user": user.name}
    ))
    await db.commit()

    return {"status": "success", "token": token, "user_name": user.name}
