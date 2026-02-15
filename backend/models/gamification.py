# Gamification & Engagement models for dating platform

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, JSON, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class Badge(Base):
    """Badge definitions for gamification system."""
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon_url: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general")  # general, social, premium, seasonal
    max_level: Mapped[int] = mapped_column(Integer, default=1)
    criteria: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)  # {"type": "swipes_count", "threshold": 100}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserBadge(Base):
    """Badges earned by users."""
    __tablename__ = "user_badges"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1)
    progress: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyReward(Base):
    """Daily login reward definitions."""
    __tablename__ = "daily_rewards"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)  # 1-7 cycle
    reward_type: Mapped[str] = mapped_column(String(30), nullable=False)  # stars, boost, superlike, badge
    reward_value: Mapped[int] = mapped_column(Integer, default=1)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class UserDailyRewardClaim(Base):
    """Tracks daily reward claims by users."""
    __tablename__ = "user_daily_reward_claims"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reward_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("daily_rewards.id"), nullable=False)
    streak_day: Mapped[int] = mapped_column(Integer, default=1)
    claimed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Quest(Base):
    """Weekly/special quests for user engagement."""
    __tablename__ = "quests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quest_type: Mapped[str] = mapped_column(String(30), default="weekly")  # daily, weekly, special, seasonal
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)  # send_messages, get_matches, complete_profile
    target_count: Mapped[int] = mapped_column(Integer, default=1)
    reward_type: Mapped[str] = mapped_column(String(30), default="stars")
    reward_value: Mapped[int] = mapped_column(Integer, default=10)
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserQuestProgress(Base):
    """Tracks user progress on quests."""
    __tablename__ = "user_quest_progress"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    quest_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("quests.id", ondelete="CASCADE"), nullable=False)
    current_count: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_reward_claimed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Leaderboard(Base):
    """Leaderboard snapshots for competitive engagement."""
    __tablename__ = "leaderboards"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    board_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # most_liked, top_gifter, streak_king
    period: Mapped[str] = mapped_column(String(20), default="weekly")  # daily, weekly, monthly, all_time
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    snapshot_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
