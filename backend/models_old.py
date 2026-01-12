from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String, unique=True, index=True, nullable=True)
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="free") # free, gold, vip

    profile = relationship("Profile", back_populates="user", uselist=False)

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    
    name = Column(String)
    age = Column(Integer)
    bio = Column(String, nullable=True)
    gender = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Store photos as list of URLs
    photos = Column(JSON, default=[]) 
    
    # Store interests as list of strings
    interests = Column(JSON, default=[]) 
    
    # Store tags/interests
    interests = Column(JSON, default=[])
    
    # User preferences for matching
    preferences = Column(JSON, default={})

    user = relationship("User", back_populates="profile")

class Like(Base):
    __tablename__ = "likes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    liker_id = Column(String, ForeignKey("users.id"))
    liked_id = Column(String, ForeignKey("users.id"))
    is_super = Column(Boolean, default=False)
    created_at = Column(String) # Storing as ISO string to avoid datetime issues with SQLite/Pydantic for now

class Match(Base):
    __tablename__ = "matches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user1_id = Column(String, ForeignKey("users.id"))
    user2_id = Column(String, ForeignKey("users.id"))
    created_at = Column(String)

    # Relationships (optional for now, but good to have)

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    match_id = Column(String, ForeignKey("matches.id"))
    sender_id = Column(String, ForeignKey("users.id"))
    text = Column(String)
    type = Column(String, default="text") # text, voice, photo
    audio_url = Column(String, nullable=True)
    duration = Column(String, nullable=True) # e.g. "0:05"
    created_at = Column(String)

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    endpoint = Column(String, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
