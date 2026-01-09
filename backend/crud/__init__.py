# CRUD package - Слой доступа к данным (Data Access Layer)

from .user import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    add_user_photo,
)
from .interaction import (
    get_user_feed,
    create_swipe,
    get_user_matches,
    check_existing_swipe,
)

__all__ = [
    # User CRUD
    "create_user",
    "get_user_by_email",
    "get_user_by_id",
    "add_user_photo",
    # Interaction CRUD
    "get_user_feed",
    "create_swipe",
    "get_user_matches",
    "check_existing_swipe",
]
