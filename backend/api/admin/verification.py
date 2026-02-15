"""
Admin Verification & Segmentation endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, select
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import uuid as uuid_module

from backend.database import get_db
from backend.models.user import User
from backend.models.user_management import VerificationRequest
from .deps import get_current_admin

router = APIRouter()


class VerificationReviewRequest(BaseModel):
    action: str
    reason: Optional[str] = None


@router.get("/users/verification/queue", response_model=Dict[str, Any])
async def get_verification_requests(
    status: str = "pending",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get identity verification queue"""
    
    query = select(VerificationRequest, User).join(User, VerificationRequest.user_id == User.id)
    
    if status and status != 'all':
        query = query.where(VerificationRequest.status == status)
        
    count_query = select(func.count(VerificationRequest.id))
    if status and status != 'all':
        count_query = count_query.where(VerificationRequest.status == status)
    result = await db.execute(count_query)
    total = result.scalar() or 0
    
    query = query.order_by(desc(VerificationRequest.priority), desc(VerificationRequest.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    rows = result.all()
    
    items = []
    for req, user in rows:
        items.append({
            "id": str(req.id),
            "user_id": str(req.user_id),
            "user_name": user.name,
            "user_photos": user.photos or [],
            "status": req.status,
            "priority": req.priority,
            "submitted_photos": req.submitted_photos,
            "ai_confidence": req.ai_confidence,
            "created_at": req.created_at.isoformat()
        })
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.post("/users/verification/{request_id}/review")
async def review_verification_request(
    request_id: str,
    review_data: VerificationReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Review a verification request"""
    
    try:
        rid = uuid_module.UUID(request_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID")
        
    result = await db.execute(select(VerificationRequest).where(VerificationRequest.id == rid))
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Запрос не найден")
        
    if review_data.action == "approve":
        req.status = "approved"
        result = await db.execute(select(User).where(User.id == req.user_id))
        user = result.scalar_one_or_none()
        if user:
            user.is_verified = True
            user.verified_at = datetime.utcnow()
    elif review_data.action == "reject":
        req.status = "rejected"
        req.rejection_reason = review_data.reason
        result = await db.execute(select(User).where(User.id == req.user_id))
        user = result.scalar_one_or_none()
        if user and user.is_verified:
            user.is_verified = False
            user.verified_at = None
    else:
        raise HTTPException(status_code=400, detail="Недопустимое действие")
        
    req.reviewed_by = current_user.id
    req.reviewed_at = datetime.utcnow()
    
    await db.commit()
    
    return {"status": "success", "message": f"Верификация {review_data.action} выполнена"}
