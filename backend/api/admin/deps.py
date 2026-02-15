"""
Admin shared dependencies, schemas and auth.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, or_, select, delete, cast, case, Date, text
from sqlalchemy.orm import aliased
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum
import uuid as uuid_module

from backend.database import get_db
from backend.auth import get_current_user_from_token, decode_jwt
from backend.models.user import User, UserRole, UserStatus, SubscriptionTier, UserPhoto
from backend.models.interaction import Report, Block, Match
from backend.models.moderation import ModerationQueueItem as ModerationQueueItemModel, BannedUser
from backend.models.monetization import UserSubscription, RevenueTransaction
from backend.models.chat import Message
from backend.models.analytics import RetentionCohort, DailyMetric
from backend.models.system import FeatureFlag, AuditLog, AutoBanRule
from backend.models.user_management import FraudScore, VerificationRequest, UserSegment, UserNote
from backend.services.fraud_detection import fraud_service


# ============================================
# ADMIN AUTHORIZATION DEPENDENCY
# ============================================

async def get_current_admin(
    current_user: User = Depends(get_current_user_from_token),
) -> User:
    """
    Dependency to ensure the current user is an admin.
    Returns 403 Forbidden for non-admin users.
    """
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MODERATOR)
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора"
        )
        
    return current_user


# ============================================
# SCHEMAS
# ============================================

class ContentType(str, Enum):
    photo = "photo"
    chat = "chat"
    report = "report"


class ModerationAction(str, Enum):
    approve = "approve"
    reject = "reject"
    ban = "ban"


class DashboardMetrics(BaseModel):
    total_users: int
    active_today: int
    new_matches: int
    messages_sent: int
    revenue_today: float
    premium_users: int
    pending_moderation: int
    reports_today: int
    traffic_history: List[int]


class UserListItem(BaseModel):
    id: str
    name: str
    email: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    location: Optional[str]
    status: str
    subscription: str
    verified: bool
    fraud_score: int
    registered_at: datetime
    last_active: Optional[datetime]
    matches: int
    messages: int

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ModerationQueueItem(BaseModel):
    id: str
    type: str
    user_id: str
    user_name: str
    ai_score: float
    ai_flags: List[str]
    priority: str
    status: str
    created_at: datetime
    report_reason: Optional[str] = None


class AnalyticsData(BaseModel):
    date: str
    dau: int
    mau: int
    revenue: float
    new_users: int
    matches: int
    messages: int


class RevenueMetrics(BaseModel):
    today: float
    week: float
    month: float
    year: float
    arpu: float
    arppu: float
    subscription_breakdown: dict


class SystemHealthStatus(BaseModel):
    response_time: str


class FeatureFlagUpdate(BaseModel):
    enabled: bool
    rollout: Optional[int] = None


class VerificationRequestItem(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_photos: List[str]
    status: str
    priority: int
    submitted_photos: List[str]
    ai_confidence: Optional[float]
    created_at: datetime


class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    criteria: Dict[str, Any]
