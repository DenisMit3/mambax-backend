"""Marketing schemas (Pydantic models & enums)."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from enum import Enum


class CampaignType(str, Enum):
    push = "push"
    email = "email"
    sms = "sms"
    in_app = "in_app"


class CampaignStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    active = "active"
    paused = "paused"
    completed = "completed"


class CampaignCreate(BaseModel):
    name: str
    type: CampaignType
    target_segment: str = "all"
    content: dict
    scheduled_at: Optional[datetime] = None


class PushNotificationCreate(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None
    deep_link: Optional[str] = None
    target_segment: str = "all"
    scheduled_at: Optional[datetime] = None


class EmailCampaignCreate(BaseModel):
    subject: str
    from_name: str
    html_content: str
    target_segment: str = "all"
    scheduled_at: Optional[datetime] = None
