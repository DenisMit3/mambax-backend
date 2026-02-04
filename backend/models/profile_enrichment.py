
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, Uuid, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base

class UserPrompt(Base):
    """
    User profile prompts (Hinge-style Q&A).
    Replaces generic bio with specific conversation starters.
    """
    __tablename__ = "user_prompts"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    question: Mapped[str] = mapped_column(String(255), nullable=False, comment="The prompt question text")
    answer: Mapped[str] = mapped_column(Text, nullable=False, comment="User's text answer")
    
    type: Mapped[str] = mapped_column(String(20), default="text", comment="text, audio, image")
    media_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship
    user_rel = relationship("User", backref="prompts", lazy="selectin")

    def __repr__(self):
        return f"<UserPrompt {self.user_id} - {self.question[:20]}...>"


class UserPreference(Base):
    """
    Advanced user discovery preferences with Dealbreakers.
    Allows deeper filtering (e.g., 'Looking for non-smoker').
    """
    __tablename__ = "user_preferences"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Category of preference: basic, appearance, lifestyle, values
    category: Mapped[str] = mapped_column(String(50), default="basic")
    
    # Specific preference key: height, age, smoking_habits, religion, etc.
    key: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # The value(s) they are looking for. 
    # Can be a range {"min": 170, "max": 190} or list ["socially", "never"]
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Hinge Killer Feature: Is this a strict filter?
    is_dealbreaker: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user_rel = relationship("User", backref="preferences", lazy="selectin")

    def __repr__(self):
        return f"<UserPreference {self.user_id} - {self.key} (Dealbreaker: {self.is_dealbreaker})>"
