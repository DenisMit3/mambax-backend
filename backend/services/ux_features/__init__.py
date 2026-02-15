"""
UX Features Service
====================
Дополнительные функции для улучшения пользовательского опыта.

Пакет реэкспортирует все публичные символы для обратной совместимости:
    from backend.services.ux_features import enable_incognito  # работает
"""

# Push Notifications
from backend.services.ux_features.notifications import (
    NotificationType,
    PushNotification,
    register_fcm_token,
    unregister_fcm_token,
    get_notification_settings,
    update_notification_settings,
    send_push_notification,
    notify_new_match,
    notify_new_message,
    notify_new_like,
    send_match_reminder,
    send_new_profiles_reminder,
)

# Incognito Mode
from backend.services.ux_features.incognito import (
    enable_incognito,
    disable_incognito,
    is_incognito,
    get_incognito_settings,
)

# Swipe & Super Like
from backend.services.ux_features.swipe import (
    record_swipe_for_undo,
    undo_last_swipe,
    get_undo_count,
    process_super_like,
    SUPER_LIKE_EFFECTS,
)

# Account Deletion
from backend.services.ux_features.account import (
    AccountDeletionReason,
    request_account_deletion,
    cancel_account_deletion,
    process_scheduled_deletions,
    permanently_delete_user_data,
    get_deletion_status,
)

# Visibility & Boost
from backend.services.ux_features.visibility import (
    get_visibility_settings,
    update_visibility_settings,
    activate_boost,
    is_boosted,
    get_boost_status,
)

__all__ = [
    # notifications
    "NotificationType", "PushNotification",
    "register_fcm_token", "unregister_fcm_token",
    "get_notification_settings", "update_notification_settings",
    "send_push_notification",
    "notify_new_match", "notify_new_message", "notify_new_like",
    "send_match_reminder", "send_new_profiles_reminder",
    # incognito
    "enable_incognito", "disable_incognito", "is_incognito", "get_incognito_settings",
    # swipe
    "record_swipe_for_undo", "undo_last_swipe", "get_undo_count",
    "process_super_like", "SUPER_LIKE_EFFECTS",
    # account
    "AccountDeletionReason",
    "request_account_deletion", "cancel_account_deletion",
    "process_scheduled_deletions", "permanently_delete_user_data",
    "get_deletion_status",
    # visibility & boost
    "get_visibility_settings", "update_visibility_settings",
    "activate_boost", "is_boosted", "get_boost_status",
]
