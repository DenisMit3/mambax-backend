from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class UserCreate(BaseModel):
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    username: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str
    otp: str

class TelegramLogin(BaseModel):
    init_data: str

class OTPRequest(BaseModel):
    identifier: str

class ProfileBase(BaseModel):
    name: str
    age: int
    bio: Optional[str] = None
    gender: str
    interests: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    gender: Optional[str] = None
    interests: Optional[List[str]] = None
    photos: Optional[List[str]] = None


class ProfileResponse(ProfileBase):
    id: UUID
    user_id: UUID
    photos: List[str] = []
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    has_profile: bool = False

class LikeCreate(BaseModel):
    liked_user_id: str
    is_super: bool = False

class MessageCreate(BaseModel):
    text: str

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    text: str
    created_at: str
    
    class Config:
        from_attributes = True

class MatchResponse(BaseModel):
    id: str
    user: ProfileResponse # The OTHER user in the match
    last_message: Optional[str] = None
    
    class Config:
        from_attributes = True
