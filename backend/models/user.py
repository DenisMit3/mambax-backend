# User ORM Model - SQLAlchemy таблица users для PostgreSQL

import uuid
import enum
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, JSON, Uuid, Numeric, ForeignKey, Enum as SQLAlchemyEnum, Index, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"
    PENDING = "pending"
    SHADOWBAN = "shadowban"


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    VIP = "vip"
    GOLD = "gold"
    PLATINUM = "platinum"


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"


class UserPhoto(Base):
    __tablename__ = "user_photos"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<UserPhoto {self.id} for {self.user_id}>"


class PhotoBlob(Base):
    """Binary photo storage in PostgreSQL (Neon).
    
    Stores processed/optimized images as bytea.
    Referenced by UserPhoto.url as /api/photos/{id}
    """
    __tablename__ = "photo_blobs"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, default="image/webp")
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<PhotoBlob {self.id} ({self.size_bytes} bytes)>"


class UserInterest(Base):
    __tablename__ = "user_interests"
    
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tag: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<UserInterest {self.tag} for {self.user_id}>"


class User(Base):
    """
    ORM модель пользователя дейтинг-платформы.
    """
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_gender_age", "gender", "age"),
        Index("idx_users_active_created", "is_active", "created_at"),
        Index("idx_users_lat_lon", "latitude", "longitude"),
        # PERF: Additional indexes for discover queries optimization
        Index("idx_users_complete_active", "is_complete", "is_active", "created_at"),
        Index("idx_users_vip_verified", "is_vip", "is_verified"),
        Index("idx_users_gender_age_active", "gender", "age", "is_active"),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    age: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    gender: Mapped[Gender] = mapped_column(
        SQLAlchemyEnum(Gender, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        nullable=False,
    )
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Relationships
    photos_rel: Mapped[List["UserPhoto"]] = relationship(
        "UserPhoto", 
        backref="user", 
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    interests_rel: Mapped[List["UserInterest"]] = relationship(
        "UserInterest",
        backref="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    @property
    def photos(self) -> List[str]:
        """Backward compatibility for reading photos as list of strings"""
        return [p.url for p in self.photos_rel]

    @property
    def interests(self) -> List[str]:
        """Backward compatibility for reading interests as list of strings"""
        return [i.tag for i in self.interests_rel]
    
    # Extended profile fields for filtering
    height: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Height in cm (150-220)"
    )
    smoking: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="never, sometimes, regularly"
    )
    drinking: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="never, socially, regularly"
    )
    education: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="high_school, bachelor, master, phd"
    )
    looking_for: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="relationship, friendship, casual, not_sure"
    )
    children: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="have, want, dont_want, maybe"
    )
    latitude: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    longitude: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    is_vip: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Added fields for CRUD compatibility
    phone: Mapped[Optional[str]] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=True,
    )
    telegram_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=True,
    )
    username: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    is_complete: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    # Verification fields
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    verification_selfie: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Admin & Status fields
    status: Mapped[UserStatus] = mapped_column(
        SQLAlchemyEnum(UserStatus, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        default=UserStatus.ACTIVE,
        nullable=False,
    )
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        SQLAlchemyEnum(SubscriptionTier, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        default=SubscriptionTier.FREE,
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        SQLAlchemyEnum(UserRole, values_callable=lambda x: [e.value for e in x], native_enum=False, length=20),
        default=UserRole.USER,
        nullable=False,
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="User's city for display"
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="User's full location string"
    )
    job: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="User's job/occupation"
    )
    zodiac: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="Zodiac sign"
    )
    personality_type: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        comment="Introvert, extrovert, ambivert"
    )
    love_language: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Love language(s), comma-separated"
    )
    pets: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Pets info, comma-separated"
    )
    ideal_date: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="Ideal date description, comma-separated"
    )
    intent: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="What user is looking for, comma-separated"
    )

    # Referral system
    referral_code: Mapped[Optional[str]] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=True,
        comment="Unique referral code for sharing"
    )
    referred_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="ID of user who referred this user"
    )

    # Telegram Stars balance for in-app purchases (gifts, boosts, etc.)
    stars_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        nullable=False,
        comment="User's Telegram Stars balance"
    )

    # Last seen timestamp for "was online X minutes ago"
    last_seen: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="When the user was last online"
    )

    # UX Preferences (JSON field)
    ux_preferences: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=lambda: {
            "sounds_enabled": True,
            "haptic_enabled": True,
            "reduced_motion": False
        },
        comment="User UX preferences for sounds, haptics, animations"
    )

    # Onboarding Progress Tracking
    onboarding_completed_steps: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=lambda: {
            "interactive_tour_completed": False,
            "first_swipe_done": False,
            "first_filter_opened": False,
            "first_superlike_used": False,
            "first_chat_opened": False,
            "first_voice_message_sent": False,
            "first_match_achieved": False,
            "profile_completion_prompted": False
        },
        comment="Tracks which onboarding steps user has completed"
    )

    # Gamification: badges earned
    achievements: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
        comment='[{"badge": "conversationalist", "earned_at": "2026-02-05T12:00:00Z", "level": 1}]'
    )

    @property
    def user_id(self):
        return self.id
    
    def __repr__(self) -> str:
        return f"<User {self.name} ({self.email})>"
