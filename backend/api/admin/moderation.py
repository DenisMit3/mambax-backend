"""
Admin Moderation endpoints: queue, review, stats.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, cast, Date, select, delete
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
import uuid as uuid_module

from backend.database import get_db
from backend.models.user import User, UserPhoto, UserStatus
from backend.models.moderation import ModerationQueueItem as ModerationQueueItemModel, BannedUser
from backend.models.system import AuditLog
from .deps import get_current_admin

router = APIRouter()


@router.get("/moderation/queue")
async def get_moderation_queue(
    content_type: Optional[str] = None,
    priority: Optional[str] = None,
    status: str = "pending",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get moderation queue items"""
    
    query = select(ModerationQueueItemModel, User.name).outerjoin(
        User, ModerationQueueItemModel.user_id == User.id
    )
    
    conditions = []
    if status:
        conditions.append(ModerationQueueItemModel.status == status)
    if content_type and content_type != 'all':
        conditions.append(ModerationQueueItemModel.content_type == content_type)
    
    if conditions:
        query = query.where(and_(*conditions))
        
    if priority and priority != 'all':
        if priority == 'high':
            query = query.where(ModerationQueueItemModel.priority > 7)
        elif priority == 'medium':
            query = query.where(and_(ModerationQueueItemModel.priority <= 7, ModerationQueueItemModel.priority > 4))
        elif priority == 'low':
            query = query.where(ModerationQueueItemModel.priority <= 4)
    
    count_query = select(func.count(ModerationQueueItemModel.id))
    count_conditions = list(conditions) if conditions else []
    
    if priority and priority != 'all':
        if priority == 'high':
            count_conditions.append(ModerationQueueItemModel.priority > 7)
        elif priority == 'medium':
            count_conditions.append(and_(ModerationQueueItemModel.priority <= 7, ModerationQueueItemModel.priority > 4))
        elif priority == 'low':
            count_conditions.append(ModerationQueueItemModel.priority <= 4)
            
    if count_conditions:
        count_query = count_query.where(and_(*count_conditions))
        
    result = await db.execute(count_query)
    total = result.scalar() or 0
    
    query = query.order_by(
        desc(ModerationQueueItemModel.priority), 
        desc(ModerationQueueItemModel.created_at)
    ).offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    items = result.all()
    
    return {
        "items": [
            {
                "id": str(item[0].id),
                "type": item[0].content_type,
                "content_type": item[0].content_type,
                "content": item[0].content_snapshot,
                "user_id": str(item[0].user_id),
                "user_name": item[1] if item[1] else "Неизвестный пользователь",
                "ai_score": item[0].ai_score,
                "ai_flags": [],
                "priority": "high" if item[0].priority > 7 else ("medium" if item[0].priority > 4 else "low"),
                "status": item[0].status,
                "created_at": item[0].created_at.isoformat()
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }


class ReviewRequest(BaseModel):
    action: str
    notes: Optional[str] = None


@router.post("/moderation/{item_id}/review")
async def review_moderation_item(
    item_id: str,
    data: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Review and action a moderation queue item"""
    
    try:
        uid = uuid_module.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный формат ID элемента")
    
    result = await db.execute(
        select(ModerationQueueItemModel).where(ModerationQueueItemModel.id == uid)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Элемент не найден")
    
    action = data.action
    notes = data.notes
    
    if action == "approve":
        item.status = "approved"
    elif action == "reject":
        item.status = "rejected"
        if item.content_type == "photo" and item.content_id:
            try:
                photo_uuid = uuid_module.UUID(item.content_id)
                await db.execute(
                    delete(UserPhoto).where(UserPhoto.id == photo_uuid)
                )
            except (ValueError, TypeError):
                pass
    elif action == "ban":
        item.status = "banned"
        user_result = await db.execute(select(User).where(User.id == item.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.status = UserStatus.BANNED
            ban = BannedUser(
                user_id=item.user_id,
                reason=notes or "Действие модерации",
                banned_by=current_user.id
            )
            db.add(ban)
    else:
        raise HTTPException(status_code=400, detail=f"Неизвестное действие: {action}")
    
    item.locked_by = current_user.id
    
    audit_log = AuditLog(
        admin_id=current_user.id,
        action=f"moderation_{action}",
        target_resource=f"moderation:{item_id}",
        changes={"action": action, "notes": notes}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Элемент {action} выполнено"
    }


@router.get("/moderation/stats")
async def get_moderation_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get moderation statistics"""
    
    result = await db.execute(
        select(func.count(ModerationQueueItemModel.id)).where(
            ModerationQueueItemModel.status == "pending"
        )
    )
    pending = result.scalar() or 0
    
    today = datetime.utcnow().date()
    
    result = await db.execute(
        select(func.count(ModerationQueueItemModel.id)).where(
            and_(
                ModerationQueueItemModel.status != "pending",
                cast(ModerationQueueItemModel.created_at, Date) == today
            )
        )
    )
    today_reviewed = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(ModerationQueueItemModel.id)).where(
            ModerationQueueItemModel.status == "approved"
        )
    )
    approved = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(ModerationQueueItemModel.id)).where(
            ModerationQueueItemModel.status == "rejected"
        )
    )
    rejected = result.scalar() or 0

    # today_received: items created today
    result = await db.execute(
        select(func.count(ModerationQueueItemModel.id)).where(
            cast(ModerationQueueItemModel.created_at, Date) == today
        )
    )
    today_received = result.scalar() or 0

    # accuracy: approved / (approved + rejected) * 100
    total_decided = approved + rejected
    accuracy = round(approved / total_decided * 100, 1) if total_decided > 0 else None

    return {
        "pending": pending,
        "today_reviewed": today_reviewed,
        "today_received": today_received,
        "approved": approved,
        "rejected": rejected,
        "ai_processed": None,
        "accuracy": accuracy
    }
