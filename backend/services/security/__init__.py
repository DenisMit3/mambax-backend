"""
Security & Moderation Service
==============================
Комплексная система безопасности и модерации.

Пакет реэкспортирует все публичные символы для обратной совместимости:
    from backend.services.security import check_rate_limit  # работает
"""

# Rate Limiting
from backend.services.security.rate_limiting import (
    RateLimitResult,
    RateLimiter,
    rate_limiter,
    RATE_LIMITS,
    check_rate_limit,
)

# Anti-Spam
from backend.services.security.spam import (
    SpamDetector,
    spam_detector,
)

# Shadowban
from backend.services.security.shadowban import (
    ShadowbanStatus,
    shadowban_user,
    unshadowban_user,
    is_shadowbanned,
    get_shadowbanned_ids_batch,
    get_shadowban_info,
)

# Reports
from backend.services.security.reports import (
    ReportReason,
    ReportStatus,
    Report,
    create_report,
    get_pending_reports,
    resolve_report,
)

# Device Fingerprinting
from backend.services.security.device import (
    DeviceFingerprint,
    generate_fingerprint_hash,
    register_device,
    ban_device,
    get_user_devices,
)

# Two-Factor Authentication
from backend.services.security.two_factor import (
    TwoFactorMethod,
    TwoFactorSession,
    enable_2fa,
    disable_2fa,
    is_2fa_enabled,
    create_2fa_challenge,
    verify_2fa,
)

# Blocking & IP Ban
from backend.services.security.blocking import (
    block_user,
    unblock_user,
    is_blocked,
    is_blocked_by,
    get_blocked_users,
    ban_ip,
    is_ip_banned,
)

__all__ = [
    # rate_limiting
    "RateLimitResult", "RateLimiter", "rate_limiter", "RATE_LIMITS", "check_rate_limit",
    # spam
    "SpamDetector", "spam_detector",
    # shadowban
    "ShadowbanStatus", "shadowban_user", "unshadowban_user",
    "is_shadowbanned", "get_shadowbanned_ids_batch", "get_shadowban_info",
    # reports
    "ReportReason", "ReportStatus", "Report",
    "create_report", "get_pending_reports", "resolve_report",
    # device
    "DeviceFingerprint", "generate_fingerprint_hash",
    "register_device", "ban_device", "get_user_devices",
    # two_factor
    "TwoFactorMethod", "TwoFactorSession",
    "enable_2fa", "disable_2fa", "is_2fa_enabled",
    "create_2fa_challenge", "verify_2fa",
    # blocking
    "block_user", "unblock_user", "is_blocked", "is_blocked_by",
    "get_blocked_users", "ban_ip", "is_ip_banned",
]
