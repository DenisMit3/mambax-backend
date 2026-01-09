# Interaction schemas - Pydantic схемы (DTO) для свайпов и матчей

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class SwipeAction(str, Enum):
    """Типы действий при свайпе"""
    LIKE = "like"
    DISLIKE = "dislike"
    SUPERLIKE = "superlike"


class SwipeBase(BaseModel):
    """Базовая схема свайпа"""
    to_user_id: UUID
    action: SwipeAction


class SwipeCreate(SwipeBase):
    """Схема для создания свайпа"""
    pass


class SwipeInDB(SwipeBase):
    """Полная модель свайпа в БД (Pydantic представление)"""
    id: UUID = Field(default_factory=uuid4)
    from_user_id: UUID
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True


class SwipeResponse(SwipeInDB):
    """Схема ответа API для свайпа"""
    is_match: bool = False  # True если взаимный лайк
    
    class Config:
        from_attributes = True


class MatchBase(BaseModel):
    """Базовая схема матча (взаимный лайк)"""
    user1_id: UUID
    user2_id: UUID


class MatchInDB(MatchBase):
    """Полная модель матча в БД (Pydantic представление)"""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True  # False если один из пользователей отменил матч
    
    class Config:
        from_attributes = True


class MatchResponse(MatchInDB):
    """Схема ответа API для матча"""
    pass


class LikeCreate(BaseModel):
    """Схема лайка (для совместимости с Frontend/api.ts)"""
    liked_user_id: UUID
    is_super: bool = False
