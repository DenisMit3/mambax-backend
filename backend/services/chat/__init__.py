"""
Chat Service Package
====================
Реэкспорт всех публичных символов для обратной совместимости.
"""

# Models & Enums
from backend.services.chat.models import (
    MessageType,
    MessageStatus,
    ChatEvent,
    CallInfo,
    EphemeralMessage,
    AVAILABLE_REACTIONS,
)

# State
from backend.services.chat.state import (
    ChatStateManager,
    state_manager,
)

# Connections
from backend.services.chat.connections import (
    ConnectionManager,
    manager,
)

# Messages
from backend.services.chat.messages import (
    set_typing,
    get_typing_users,
    mark_as_read,
    add_reaction,
    remove_reaction,
    search_gifs,
    get_trending_gifs,
    create_text_message,
    create_photo_message,
    create_voice_message,
)

# Calls
from backend.services.chat.calls import (
    initiate_call,
    answer_call,
    end_call,
    send_webrtc_signal,
)

# Ephemeral
from backend.services.chat.ephemeral import (
    create_ephemeral_message,
    mark_ephemeral_viewed,
)

# Status
from backend.services.chat.status import (
    get_unread_count,
    increment_unread,
    clear_unread,
    get_online_status,
    format_last_seen,
)

__all__ = [
    # Models
    "MessageType", "MessageStatus", "ChatEvent",
    "CallInfo", "EphemeralMessage", "AVAILABLE_REACTIONS",
    # State
    "ChatStateManager", "state_manager",
    # Connections
    "ConnectionManager", "manager",
    # Messages
    "set_typing", "get_typing_users", "mark_as_read",
    "add_reaction", "remove_reaction",
    "search_gifs", "get_trending_gifs",
    "create_text_message", "create_photo_message", "create_voice_message",
    # Calls
    "initiate_call", "answer_call", "end_call", "send_webrtc_signal",
    # Ephemeral
    "create_ephemeral_message", "mark_ephemeral_viewed",
    # Status
    "get_unread_count", "increment_unread", "clear_unread",
    "get_online_status", "format_last_seen",
]
