# Schemas package

from .user import (
    Gender, Location, UserBase, UserCreate, UserUpdate, UserInDB, UserResponse,
    ProfileCreate, ProfileResponse, ProfileUpdate
)
from .interaction import (
    SwipeAction, SwipeBase, SwipeCreate, SwipeInDB, SwipeResponse,
    MatchBase, MatchInDB, MatchResponse, LikeCreate
)
from .auth import (
    Token, TokenData, UserLogin, OTPRequest, OTPResponse, TelegramLogin
)
from .chat import (
    MessageCreate, MessageResponse
)

__all__ = [
    # User / Profile
    "Gender", "Location", "UserBase", "UserCreate", "UserUpdate", "UserInDB", "UserResponse",
    "ProfileCreate", "ProfileResponse", "ProfileUpdate",
    # Interaction
    "SwipeAction", "SwipeBase", "SwipeCreate", "SwipeInDB", "SwipeResponse",
    "MatchBase", "MatchInDB", "MatchResponse", "LikeCreate",
    # Auth
    "Token", "TokenData", "UserLogin", "OTPRequest", "OTPResponse", "TelegramLogin",
    # Chat
    "MessageCreate", "MessageResponse",
]
