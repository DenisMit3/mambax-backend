# CRUD package - Слой доступа к данным (Data Access Layer)

from .user import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_profile,
    add_user_photo,
    update_profile,
)
from .interaction import (
    get_user_feed,
    create_swipe,
    get_user_matches,
    check_existing_swipe,
    get_received_likes,
    get_likes_count,
)
from .chat import (
    create_message,
    get_messages,
)

__all__ = [
    # User CRUD
    "create_user",
    "get_user_by_email",
    "get_user_by_id",
    "get_user_profile",
    "add_user_photo",
    "update_profile",
    # Interaction CRUD
    "get_user_feed",
    "create_swipe",
    "get_user_matches",
    "check_existing_swipe",
    "get_received_likes",
    "get_likes_count",
    # Chat CRUD
    "create_message",
    "get_messages",
]
