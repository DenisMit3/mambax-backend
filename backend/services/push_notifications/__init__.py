"""
Push Notifications Package
==========================
Реэкспорт всех публичных символов для обратной совместимости.
"""

from backend.services.push_notifications.service import (
    PushProvider,
    NotificationPriority,
    PushNotificationResult,
    PushNotificationService,
)
from backend.services.push_notifications.helpers import (
    send_push_to_users,
    send_push_to_segment,
)

# Singleton
push_service = PushNotificationService()

__all__ = [
    "PushProvider",
    "NotificationPriority",
    "PushNotificationResult",
    "PushNotificationService",
    "push_service",
    "send_push_to_users",
    "send_push_to_segment",
]
