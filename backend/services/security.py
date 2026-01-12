"""
Security & Moderation Service
==============================
Комплексная система безопасности и модерации.

Функции:
1. Rate Limiting по IP
2. Anti-spam (ограничение сообщений)
3. Shadowban для нарушителей
4. Система жалоб
5. Device Fingerprinting
6. Двухфакторная аутентификация (2FA)
"""

import os
import time
import uuid
import hashlib
import hmac
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from collections import defaultdict
from enum import Enum
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

logger = logging.getLogger(__name__)

# ============================================================================
# RATE LIMITING
# ============================================================================

class RateLimitResult(BaseModel):
    allowed: bool
    remaining: int
    reset_at: str
    retry_after: Optional[int] = None


class RateLimiter:
    """
    In-memory Rate Limiter по IP/User.
    Для production использовать Redis.
    """
    
    def __init__(self):
        # Структура: {key: [(timestamp, count), ...]}
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._blocked: Dict[str, float] = {}  # Временно заблокированные
    
    def is_allowed(
        self, 
        key: str, 
        max_requests: int = 100, 
        window_seconds: int = 60
    ) -> RateLimitResult:
        """
        Проверить, разрешён ли запрос.
        
        Args:
            key: IP адрес или user_id
            max_requests: Максимум запросов в окне
            window_seconds: Размер окна в секундах
        """
        now = time.time()
        window_start = now - window_seconds
        
        # Проверяем временную блокировку
        if key in self._blocked:
            if now < self._blocked[key]:
                retry_after = int(self._blocked[key] - now)
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_at=datetime.fromtimestamp(self._blocked[key]).isoformat(),
                    retry_after=retry_after
                )
            else:
                del self._blocked[key]
        
        # Удаляем старые записи
        self._requests[key] = [ts for ts in self._requests[key] if ts > window_start]
        
        # Проверяем лимит
        current_count = len(self._requests[key])
        
        if current_count >= max_requests:
            reset_at = min(self._requests[key]) + window_seconds
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_at=datetime.fromtimestamp(reset_at).isoformat(),
                retry_after=int(reset_at - now)
            )
        
        # Записываем запрос
        self._requests[key].append(now)
        
        return RateLimitResult(
            allowed=True,
            remaining=max_requests - current_count - 1,
            reset_at=datetime.fromtimestamp(now + window_seconds).isoformat()
        )
    
    def block_temporarily(self, key: str, seconds: int = 300):
        """Временно заблокировать на N секунд"""
        self._blocked[key] = time.time() + seconds
        logger.warning(f"Rate limit: blocked {key} for {seconds}s")
    
    def cleanup(self, max_age_seconds: int = 3600):
        """Очистка старых записей"""
        now = time.time()
        cutoff = now - max_age_seconds
        
        for key in list(self._requests.keys()):
            self._requests[key] = [ts for ts in self._requests[key] if ts > cutoff]
            if not self._requests[key]:
                del self._requests[key]


# Глобальный rate limiter
rate_limiter = RateLimiter()


# Rate limit конфигурация для разных эндпоинтов
RATE_LIMITS = {
    "default": {"max": 100, "window": 60},  # 100 req/min
    "auth": {"max": 10, "window": 60},  # 10 req/min для авторизации
    "likes": {"max": 50, "window": 60},  # 50 свайпов/мин
    "messages": {"max": 30, "window": 60},  # 30 сообщений/мин
    "upload": {"max": 10, "window": 60},  # 10 загрузок/мин
}


def check_rate_limit(key: str, endpoint_type: str = "default") -> RateLimitResult:
    """Проверить rate limit для ключа и типа эндпоинта"""
    config = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["default"])
    return rate_limiter.is_allowed(key, config["max"], config["window"])


# ============================================================================
# ANTI-SPAM
# ============================================================================

class SpamDetector:
    """
    Детектор спама в сообщениях.
    """
    
    def __init__(self):
        # Счётчик сообщений пользователя
        self._message_counts: Dict[str, List[float]] = defaultdict(list)
        # Последние сообщения для проверки дубликатов
        self._last_messages: Dict[str, List[str]] = defaultdict(list)
    
    def check_message(
        self, 
        user_id: str, 
        message: str,
        max_per_minute: int = 10,
        max_duplicates: int = 3
    ) -> Dict[str, Any]:
        """
        Проверить сообщение на спам.
        
        Returns:
            {"is_spam": bool, "reason": str, "action": str}
        """
        now = time.time()
        
        # 1. Проверяем частоту сообщений
        minute_ago = now - 60
        self._message_counts[user_id] = [
            ts for ts in self._message_counts[user_id] if ts > minute_ago
        ]
        
        if len(self._message_counts[user_id]) >= max_per_minute:
            return {
                "is_spam": True,
                "reason": "too_many_messages",
                "action": "rate_limit",
                "message": "Слишком много сообщений. Подождите минуту."
            }
        
        # 2. Проверяем дубликаты
        message_hash = hashlib.md5(message.lower().strip().encode()).hexdigest()
        if self._last_messages[user_id].count(message_hash) >= max_duplicates:
            return {
                "is_spam": True,
                "reason": "duplicate_message",
                "action": "block",
                "message": "Не отправляйте одинаковые сообщения."
            }
        
        # 3. Проверяем длину
        if len(message) > 5000:
            return {
                "is_spam": True,
                "reason": "message_too_long",
                "action": "reject",
                "message": "Сообщение слишком длинное."
            }
        
        # 4. Проверяем на типичный спам
        spam_patterns = [
            "заработок", "быстрые деньги", "казино", "ставки",
            "инвестиции", "криптовалют", "пассивный доход"
        ]
        message_lower = message.lower()
        for pattern in spam_patterns:
            if pattern in message_lower:
                return {
                    "is_spam": True,
                    "reason": "spam_content",
                    "action": "flag",
                    "message": "Сообщение похоже на спам."
                }
        
        # Записываем сообщение
        self._message_counts[user_id].append(now)
        self._last_messages[user_id].append(message_hash)
        
        # Храним только последние 10 хэшей
        if len(self._last_messages[user_id]) > 10:
            self._last_messages[user_id] = self._last_messages[user_id][-10:]
        
        return {"is_spam": False, "reason": None, "action": None}


# Глобальный детектор спама
spam_detector = SpamDetector()


# ============================================================================
# SHADOWBAN
# ============================================================================

class ShadowbanStatus(str, Enum):
    ACTIVE = "active"
    SHADOWBANNED = "shadowbanned"
    SUSPENDED = "suspended"


# In-memory storage (в продакшене - Redis/БД)
_shadowbanned_users: Dict[str, Dict[str, Any]] = {}


def shadowban_user(
    user_id: str, 
    reason: str, 
    duration_hours: int = 24,
    admin_id: str = "system"
) -> Dict[str, Any]:
    """
    Shadowban пользователя.
    
    Shadowban означает, что пользователь может пользоваться приложением,
    но его профиль не виден другим пользователям, его лайки не засчитываются,
    а сообщения не доставляются.
    """
    expires_at = datetime.utcnow() + timedelta(hours=duration_hours)
    
    _shadowbanned_users[user_id] = {
        "reason": reason,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
        "admin_id": admin_id,
        "duration_hours": duration_hours
    }
    
    logger.warning(f"User {user_id} shadowbanned for {duration_hours}h: {reason}")
    
    return {
        "status": "shadowbanned",
        "user_id": user_id,
        "expires_at": expires_at.isoformat()
    }


def unshadowban_user(user_id: str) -> Dict[str, Any]:
    """Снять shadowban"""
    if user_id in _shadowbanned_users:
        del _shadowbanned_users[user_id]
        logger.info(f"User {user_id} unshadowbanned")
        return {"status": "active", "user_id": user_id}
    return {"status": "not_found", "user_id": user_id}


def is_shadowbanned(user_id: str) -> bool:
    """Проверить, находится ли пользователь в shadowban"""
    if user_id not in _shadowbanned_users:
        return False
    
    # Проверяем срок действия
    ban_info = _shadowbanned_users[user_id]
    expires_at = datetime.fromisoformat(ban_info["expires_at"])
    
    if datetime.utcnow() > expires_at:
        del _shadowbanned_users[user_id]
        return False
    
    return True


def get_shadowban_info(user_id: str) -> Optional[Dict[str, Any]]:
    """Получить информацию о shadowban"""
    if is_shadowbanned(user_id):
        return _shadowbanned_users[user_id]
    return None


# ============================================================================
# REPORTS (ЖАЛОБЫ)
# ============================================================================

class ReportReason(str, Enum):
    FAKE_PROFILE = "fake_profile"
    INAPPROPRIATE_PHOTOS = "inappropriate_photos"
    HARASSMENT = "harassment"
    SPAM = "spam"
    SCAM = "scam"
    UNDERAGE = "underage"
    OTHER = "other"


class ReportStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Report(BaseModel):
    id: str
    reporter_id: str
    reported_user_id: str
    reason: ReportReason
    description: Optional[str] = None
    evidence_urls: List[str] = []
    status: ReportStatus = ReportStatus.PENDING
    created_at: str
    resolved_at: Optional[str] = None
    resolution: Optional[str] = None
    admin_id: Optional[str] = None


# In-memory storage для жалоб
_reports: Dict[str, Report] = {}


def create_report(
    reporter_id: str,
    reported_user_id: str,
    reason: ReportReason,
    description: Optional[str] = None,
    evidence_urls: List[str] = None
) -> Report:
    """Создать жалобу на пользователя"""
    
    # Проверяем, не жаловался ли уже на этого пользователя
    for report in _reports.values():
        if (report.reporter_id == reporter_id and 
            report.reported_user_id == reported_user_id and
            report.status == ReportStatus.PENDING):
            raise ValueError("Вы уже отправили жалобу на этого пользователя")
    
    report = Report(
        id=str(uuid.uuid4()),
        reporter_id=reporter_id,
        reported_user_id=reported_user_id,
        reason=reason,
        description=description,
        evidence_urls=evidence_urls or [],
        status=ReportStatus.PENDING,
        created_at=datetime.utcnow().isoformat()
    )
    
    _reports[report.id] = report
    
    logger.info(f"Report created: {reporter_id} -> {reported_user_id} ({reason})")
    
    # Автоматический shadowban при 3+ жалобах
    pending_reports = [
        r for r in _reports.values() 
        if r.reported_user_id == reported_user_id and r.status == ReportStatus.PENDING
    ]
    if len(pending_reports) >= 3:
        shadowban_user(reported_user_id, "Multiple reports pending", duration_hours=24)
    
    return report


def get_pending_reports(limit: int = 50) -> List[Report]:
    """Получить список жалоб для модерации"""
    pending = [r for r in _reports.values() if r.status == ReportStatus.PENDING]
    pending.sort(key=lambda x: x.created_at, reverse=True)
    return pending[:limit]


def resolve_report(
    report_id: str,
    admin_id: str,
    resolution: str,
    action: str = None  # "warn", "shadowban", "suspend", "dismiss"
) -> Report:
    """Разрешить жалобу"""
    if report_id not in _reports:
        raise ValueError("Report not found")
    
    report = _reports[report_id]
    report.status = ReportStatus.RESOLVED
    report.resolved_at = datetime.utcnow().isoformat()
    report.resolution = resolution
    report.admin_id = admin_id
    
    # Применяем действие
    if action == "shadowban":
        shadowban_user(report.reported_user_id, f"Report resolved: {resolution}", 72)
    elif action == "suspend":
        # TODO: Полная блокировка аккаунта
        pass
    
    logger.info(f"Report {report_id} resolved by {admin_id}: {action}")
    
    return report


# ============================================================================
# DEVICE FINGERPRINTING
# ============================================================================

class DeviceFingerprint(BaseModel):
    id: str
    user_id: str
    fingerprint_hash: str
    user_agent: str
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    created_at: str
    last_seen: str
    is_suspicious: bool = False


# In-memory storage
_device_fingerprints: Dict[str, List[DeviceFingerprint]] = defaultdict(list)
_banned_fingerprints: set = set()


def generate_fingerprint_hash(
    user_agent: str,
    screen_resolution: str = None,
    timezone: str = None,
    language: str = None,
    platform: str = None
) -> str:
    """Генерация хэша отпечатка устройства"""
    data = f"{user_agent}|{screen_resolution}|{timezone}|{language}|{platform}"
    return hashlib.sha256(data.encode()).hexdigest()[:32]


def register_device(
    user_id: str,
    user_agent: str,
    screen_resolution: str = None,
    timezone: str = None,
    language: str = None,
    platform: str = None
) -> Dict[str, Any]:
    """Зарегистрировать устройство пользователя"""
    
    fp_hash = generate_fingerprint_hash(
        user_agent, screen_resolution, timezone, language, platform
    )
    
    # Проверяем, не забанен ли fingerprint
    if fp_hash in _banned_fingerprints:
        logger.warning(f"Banned device fingerprint detected for user {user_id}")
        return {
            "allowed": False,
            "reason": "device_banned",
            "message": "Это устройство заблокировано"
        }
    
    # Проверяем, сколько аккаунтов с этого устройства
    all_fps = []
    for uid, fps in _device_fingerprints.items():
        for fp in fps:
            if fp.fingerprint_hash == fp_hash and uid != user_id:
                all_fps.append(uid)
    
    is_suspicious = len(set(all_fps)) >= 3  # 3+ аккаунта с одного устройства
    
    # Создаём или обновляем fingerprint
    now = datetime.utcnow().isoformat()
    existing = None
    for fp in _device_fingerprints[user_id]:
        if fp.fingerprint_hash == fp_hash:
            existing = fp
            break
    
    if existing:
        existing.last_seen = now
    else:
        fp = DeviceFingerprint(
            id=str(uuid.uuid4()),
            user_id=user_id,
            fingerprint_hash=fp_hash,
            user_agent=user_agent,
            screen_resolution=screen_resolution,
            timezone=timezone,
            language=language,
            platform=platform,
            created_at=now,
            last_seen=now,
            is_suspicious=is_suspicious
        )
        _device_fingerprints[user_id].append(fp)
    
    if is_suspicious:
        logger.warning(f"Suspicious device for user {user_id}: {len(all_fps)} other accounts")
    
    return {
        "allowed": True,
        "fingerprint_id": fp_hash[:8],
        "is_suspicious": is_suspicious,
        "other_accounts": len(set(all_fps)) if is_suspicious else 0
    }


def ban_device(fingerprint_hash: str):
    """Забанить устройство по fingerprint"""
    _banned_fingerprints.add(fingerprint_hash)
    logger.info(f"Device fingerprint banned: {fingerprint_hash[:8]}")


def get_user_devices(user_id: str) -> List[Dict[str, Any]]:
    """Получить список устройств пользователя"""
    return [
        {
            "id": fp.id,
            "fingerprint": fp.fingerprint_hash[:8] + "...",
            "platform": fp.platform,
            "last_seen": fp.last_seen,
            "is_suspicious": fp.is_suspicious
        }
        for fp in _device_fingerprints.get(user_id, [])
    ]


# ============================================================================
# TWO-FACTOR AUTHENTICATION (2FA)
# ============================================================================

class TwoFactorMethod(str, Enum):
    TELEGRAM = "telegram"
    EMAIL = "email"
    TOTP = "totp"  # Google Authenticator и т.д.


class TwoFactorSession(BaseModel):
    session_id: str
    user_id: str
    method: TwoFactorMethod
    code: str
    created_at: str
    expires_at: str
    verified: bool = False


# In-memory storage
_2fa_sessions: Dict[str, TwoFactorSession] = {}
_2fa_enabled_users: Dict[str, Dict[str, Any]] = {}


def enable_2fa(user_id: str, method: TwoFactorMethod = TwoFactorMethod.TELEGRAM) -> Dict[str, Any]:
    """Включить 2FA для пользователя"""
    _2fa_enabled_users[user_id] = {
        "method": method,
        "enabled_at": datetime.utcnow().isoformat()
    }
    
    logger.info(f"2FA enabled for user {user_id} via {method}")
    
    return {
        "status": "enabled",
        "method": method,
        "message": "Двухфакторная аутентификация включена"
    }


def disable_2fa(user_id: str) -> Dict[str, Any]:
    """Отключить 2FA"""
    if user_id in _2fa_enabled_users:
        del _2fa_enabled_users[user_id]
    
    return {"status": "disabled", "message": "2FA отключена"}


def is_2fa_enabled(user_id: str) -> bool:
    """Проверить, включена ли 2FA"""
    return user_id in _2fa_enabled_users


def create_2fa_challenge(user_id: str) -> Dict[str, Any]:
    """Создать challenge для 2FA"""
    if not is_2fa_enabled(user_id):
        return {"required": False}
    
    method = _2fa_enabled_users[user_id]["method"]
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    session = TwoFactorSession(
        session_id=str(uuid.uuid4()),
        user_id=user_id,
        method=method,
        code=code,
        created_at=datetime.utcnow().isoformat(),
        expires_at=(datetime.utcnow() + timedelta(minutes=5)).isoformat()
    )
    
    _2fa_sessions[session.session_id] = session
    
    # Здесь нужно отправить код через выбранный канал
    # Для Telegram - через бота
    # Для email - через email сервис
    
    logger.info(f"2FA challenge created for {user_id}: {session.session_id}")
    
    return {
        "required": True,
        "session_id": session.session_id,
        "method": method,
        "expires_in": 300  # 5 минут
    }


def verify_2fa(session_id: str, code: str) -> Dict[str, Any]:
    """Проверить 2FA код"""
    if session_id not in _2fa_sessions:
        return {"verified": False, "error": "Session not found"}
    
    session = _2fa_sessions[session_id]
    
    # Проверяем срок действия
    if datetime.utcnow() > datetime.fromisoformat(session.expires_at):
        del _2fa_sessions[session_id]
        return {"verified": False, "error": "Session expired"}
    
    # Проверяем код
    if session.code != code:
        return {"verified": False, "error": "Invalid code"}
    
    session.verified = True
    del _2fa_sessions[session_id]
    
    logger.info(f"2FA verified for user {session.user_id}")
    
    return {"verified": True, "user_id": session.user_id}


# ============================================================================
# BLOCKING USERS
# ============================================================================

# In-memory storage
_blocked_users: Dict[str, set] = defaultdict(set)  # {blocker_id: {blocked_id, ...}}


def block_user(blocker_id: str, blocked_id: str) -> Dict[str, Any]:
    """Заблокировать пользователя"""
    if blocked_id in _blocked_users[blocker_id]:
        return {"status": "already_blocked"}
    
    _blocked_users[blocker_id].add(blocked_id)
    logger.info(f"User {blocker_id} blocked {blocked_id}")
    
    return {
        "status": "blocked",
        "blocked_user_id": blocked_id,
        "message": "Пользователь заблокирован"
    }


def unblock_user(blocker_id: str, blocked_id: str) -> Dict[str, Any]:
    """Разблокировать пользователя"""
    if blocked_id in _blocked_users[blocker_id]:
        _blocked_users[blocker_id].remove(blocked_id)
    
    return {"status": "unblocked", "unblocked_user_id": blocked_id}


def is_blocked(blocker_id: str, user_id: str) -> bool:
    """Проверить, заблокирован ли пользователь"""
    return user_id in _blocked_users.get(blocker_id, set())


def is_blocked_by(user_id: str, other_id: str) -> bool:
    """Проверить, заблокирован ли я этим пользователем"""
    return user_id in _blocked_users.get(other_id, set())


def get_blocked_users(user_id: str) -> List[str]:
    """Получить список заблокированных пользователей"""
    return list(_blocked_users.get(user_id, set()))
