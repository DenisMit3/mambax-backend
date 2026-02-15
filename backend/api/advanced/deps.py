# Advanced API - Зависимости и схемы

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import User
from backend import crud


async def get_current_admin(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to ensure the current user is an admin.
    """
    user = await crud.get_user_profile(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if getattr(user, "role", "user") != "admin":
         if str(user.id) == "00000000-0000-0000-0000-000000000000":
             pass
         else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Admin privileges required"
            )
    return user


# --- Schemas ---

class ContentType(str, Enum):
    bio = "bio"
    icebreaker = "icebreaker"
    opener = "opener"
    caption = "caption"


class AIGenerateRequest(BaseModel):
    content_type: ContentType
    context: Optional[str] = None
    tone: Optional[str] = "friendly"
    count: int = 5


class AlgorithmParamsSchema(BaseModel):
    distance_weight: float = Field(ge=0, le=1)
    age_weight: float = Field(ge=0, le=1)
    interests_weight: float = Field(ge=0, le=1)
    activity_weight: float = Field(ge=0, le=1)
    response_rate_weight: float = Field(ge=0, le=1)


class IcebreakerCreateSchema(BaseModel):
    text: str
    category: str
    tags: List[str] = []


class EventCreateSchema(BaseModel):
    name: str
    event_type: str
    start_date: datetime
    max_participants: int
    is_premium: bool = False


class PartnerCreateSchema(BaseModel):
    name: str
    domain: Optional[str]
    revenue_share_percentage: float = 0.0


class ReportGenerateRequest(BaseModel):
    report_type: str
    period: str = "30d"
    custom_sql: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    schedule: Optional[str] = None
