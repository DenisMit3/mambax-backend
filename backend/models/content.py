# Content & Media models for dating platform

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import String, Integer, Boolean, Float, Text, DateTime, JSON, Uuid, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class MediaUpload(Base):
    """Central media storage registry for all uploaded files."""
    __tablename__ = "media_uploads"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(30), nullable=False)  # image, video, voice, document
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_nsfw: Mapped[bool] = mapped_column(Boolean, default=False)
    nsfw_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    storage_provider: Mapped[str] = mapped_column(String(30), default="s3")  # s3, cloudflare, local
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PhotoModerationQueue(Base):
    """Queue for photo moderation (AI + manual review)."""
    __tablename__ = "photo_moderation_queue"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    media_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("media_uploads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ai_verdict: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # approved, rejected, needs_review
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_flags: Mapped[List[str]] = mapped_column(JSON, default=list)  # ["nudity", "violence", "spam"]
    human_verdict: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, auto_approved, manual_review, approved, rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class ContentFilter(Base):
    """Content filtering rules for messages and bios."""
    __tablename__ = "content_filters"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    pattern: Mapped[str] = mapped_column(String(500), nullable=False)
    filter_type: Mapped[str] = mapped_column(String(30), nullable=False)  # regex, keyword, phrase
    action: Mapped[str] = mapped_column(String(20), default="block")  # block, warn, flag, replace
    replacement: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="profanity")  # profanity, spam, contact_info, hate_speech
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    hits_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserMediaAlbum(Base):
    """Private photo albums (visible only to matches or premium)."""
    __tablename__ = "user_media_albums"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), default="Private")
    visibility: Mapped[str] = mapped_column(String(20), default="matches_only")  # public, matches_only, premium_only, private
    photo_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AlbumPhoto(Base):
    """Photos within user albums."""
    __tablename__ = "album_photos"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    album_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user_media_albums.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("media_uploads.id", ondelete="CASCADE"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    caption: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AlbumAccessGrant(Base):
    """Grants access to private albums for specific users."""
    __tablename__ = "album_access_grants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    album_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("user_media_albums.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_to_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
