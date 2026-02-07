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

from backend.core.redis import redis_manager
from backend.models.interaction import Report as ReportModel

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
    Redis-backed distributed Rate Limiter.
    """
    
    async def is_allowed(
        self, 
        key: str, 
        max_requests: int = 100, 
        window_seconds: int = 60
    ) -> RateLimitResult:
        """
        Check if request is allowed using Redis.
        """
        allowed = await redis_manager.rate_limit(key, limit=max_requests, period=window_seconds)
        
        # Note: We don't have 'remaining' and 'reset_at' from the current simple rate_limit implementation
        # but for compatibility we return placeholder/best effort values.
        # In a real prod environment, we'd use a more advanced Lua script to get these.
        return RateLimitResult(
            allowed=allowed,
            remaining=0, # Simplified
            reset_at=(datetime.utcnow() + timedelta(seconds=window_seconds)).isoformat(),
            retry_after=window_seconds if not allowed else None
        )
    
    async def block_temporarily(self, key: str, seconds: int = 300):
        """Temporarily block by setting a dedicated block key in Redis"""
        r = await redis_manager.get_redis()
        if r:
            await r.set(f"blocked:{key}", "1", ex=seconds)
            logger.warning(f"Rate limit: blocked {key} for {seconds}s")

    async def is_blocked(self, key: str) -> bool:
        r = await redis_manager.get_redis()
        if not r:
            return False
        return await r.exists(f"blocked:{key}")

# Global rate limiter
rate_limiter = RateLimiter()


# Rate limit конфигурация для разных эндпоинтов
RATE_LIMITS = {
    "default": {"max": 100, "window": 60},  # 100 req/min
    "auth": {"max": 10, "window": 60},  # 10 req/min для авторизации
    "likes": {"max": 50, "window": 60},  # 50 свайпов/мин
    "messages": {"max": 30, "window": 60},  # 30 сообщений/мин
    "upload": {"max": 10, "window": 60},  # 10 загрузок/мин
}


async def check_rate_limit(key: str, endpoint_type: str = "default") -> RateLimitResult:
    """Проверить rate limit для ключа и типа эндпоинта"""
    config = RATE_LIMITS.get(endpoint_type, RATE_LIMITS["default"])
    if await rate_limiter.is_blocked(key):
        return RateLimitResult(allowed=False, remaining=0, reset_at="blocked", retry_after=300)
    return await rate_limiter.is_allowed(key, config["max"], config["window"])


# ============================================================================
# ANTI-SPAM
# ============================================================================

class SpamDetector:
    """
    Redis-backed Spam Detector.
    """
    
    async def check_message(
        self, 
        user_id: str, 
        message: str,
        max_per_minute: int = 10,
        max_duplicates: int = 3
    ) -> Dict[str, Any]:
        """
        Check message for spam using Redis.
        """
        # 1. Check Frequency (using reuse of our rate_limit logic)
        is_allowed = await redis_manager.rate_limit(f"spam_freq:{user_id}", limit=max_per_minute, period=60)
        
        if not is_allowed:
            return {
                "is_spam": True,
                "reason": "too_many_messages",
                "action": "rate_limit",
                "message": "Слишком много сообщений. Подождите минуту."
            }
        
        # 2. Check Duplicates in Redis
        message_hash = hashlib.md5(message.lower().strip().encode()).hexdigest()
        dup_key = f"spam_hash:{user_id}:{message_hash}"
        
        # Increment hash count in Redis with 1 hour TTL
        count = await redis_manager.client.incr(dup_key)
        if count == 1:
            await redis_manager.client.expire(dup_key, 3600)
            
        if count > max_duplicates:
            return {
                "is_spam": True,
                "reason": "duplicate_message",
                "action": "block",
                "message": "Не отправляйте одинаковые сообщения."
            }
        
        # 3. Content Checks (Static)
        if len(message) > 5000:
            return {
                "is_spam": True,
                "reason": "message_too_long",
                "action": "reject",
                "message": "Сообщение слишком длинное."
            }
        
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
        
        return {"is_spam": False, "reason": None, "action": None}

# Global spam detector
spam_detector = SpamDetector()


# ============================================================================
# SHADOWBAN
# ============================================================================

class ShadowbanStatus(str, Enum):
    ACTIVE = "active"
    SHADOWBANNED = "shadowbanned"
    SUSPENDED = "suspended"


# Redis keys: shadowban:USER_ID -> reason string
async def shadowban_user(
    user_id: str, 
    reason: str, 
    duration_hours: int = 24
) -> Dict[str, Any]:
    """
    Shadowban пользователя в Redis.
    """
    key = f"shadowban:{user_id}"
    await redis_manager.client.set(key, reason, ex=duration_hours * 3600)
    logger.warning(f"User {user_id} shadowbanned for {duration_hours}h: {reason}")
    
    return {
        "status": "shadowbanned",
        "user_id": user_id,
        "expires_at": (datetime.utcnow() + timedelta(hours=duration_hours)).isoformat()
    }


async def unshadowban_user(user_id: str) -> Dict[str, Any]:
    """Снять shadowban"""
    await redis_manager.client.delete(f"shadowban:{user_id}")
    return {"status": "active", "user_id": user_id}


async def is_shadowbanned(user_id: str) -> bool:
    """Проверить, находится ли пользователь в shadowban"""
    return await redis_manager.client.exists(f"shadowban:{user_id}")


async def get_shadowbanned_ids_batch(user_ids: list[str]) -> set[str]:
    """
    PERF-006: Batch проверка shadowban - O(1) вместо O(N)
    Проверяет список пользователей за один запрос к Redis
    """
    if not user_ids:
        return set()
    
    try:
        client = redis_manager.client
        if not client:
            return set()
        
        # Используем pipeline для batch запроса
        pipe = client.pipeline()
        for uid in user_ids:
            pipe.exists(f"shadowban:{uid}")
        
        results = await pipe.execute()
        return {uid for uid, is_banned in zip(user_ids, results) if is_banned}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Batch shadowban check failed: {e}")
        return set()


async def get_shadowban_info(user_id: str) -> Optional[str]:
    """Получить информацию о shadowban"""
    reason = await redis_manager.client.get(f"shadowban:{user_id}")
    return reason.decode() if reason else None


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


# In-memory storage для жалоб (LEGACY, теперь в БД)
# _reports: Dict[str, Report] = {}


async def create_report(
    db: AsyncSession,
    reporter_id: str,
    reported_user_id: str,
    reason: ReportReason,
    description: Optional[str] = None,
    evidence_urls: List[str] = None
) -> ReportModel:
    """Создать жалобу на пользователя в БД"""
    
    # Check for dups in Redis (24h)
    dup_key = f"report_dup:{reporter_id}:{reported_user_id}"
    if await redis_manager.client.exists(dup_key):
        raise ValueError("Вы уже недавно отправляли жалобу на этого пользователя")
    
    report = ReportModel(
        reporter_id=uuid.UUID(reporter_id) if isinstance(reporter_id, str) else reporter_id,
        reported_id=uuid.UUID(reported_user_id) if isinstance(reported_user_id, str) else reported_user_id,
        reason=reason,
        description=description,
        evidence_urls=evidence_urls or [],
        status="pending",
        created_at=datetime.utcnow()
    )
    
    db.add(report)
    await db.flush()
    await redis_manager.client.set(dup_key, "1", ex=86400)
    
    logger.info(f"Report created in DB: {reporter_id} -> {reported_user_id} ({reason})")
    
    # Автоматический shadowban при 3+ жалобах (Redis counter)
    count_key = f"reports_count:{reported_user_id}"
    count = await redis_manager.client.incr(count_key)
    if count == 1:
        await redis_manager.client.expire(count_key, 604800) # 1 week window
        
    if count >= 3:
        await shadowban_user(reported_user_id, "Multiple reports pending (auto-flag)", duration_hours=24)
    
    return report


async def get_pending_reports(db: AsyncSession, limit: int = 50) -> List[ReportModel]:
    """Получить список жалоб из БД для модерации"""
    result = await db.execute(
        select(ReportModel)
        .where(ReportModel.status == "pending")
        .order_by(ReportModel.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def resolve_report(
    db: AsyncSession,
    report_id: str,
    admin_id: str,
    resolution: str,
    action: str = None  # "warn", "shadowban", "suspend", "dismiss"
) -> Optional[ReportModel]:
    """Разрешить жалобу в БД"""
    report_uuid = uuid.UUID(report_id) if isinstance(report_id, str) else report_id
    result = await db.execute(select(ReportModel).where(ReportModel.id == report_uuid))
    report = result.scalar_one_or_none()
    
    if not report:
        raise ValueError("Report not found")
    
    report.status = "resolved" if action != "dismiss" else "dismissed"
    report.resolved_at = datetime.utcnow()
    report.resolution = resolution
    report.admin_id = uuid.UUID(admin_id) if isinstance(admin_id, str) else admin_id
    
    # Применяем действие
    if action == "shadowban":
        await shadowban_user(str(report.reported_id), f"Report resolved: {resolution}", 72)
    elif action == "suspend":
        logger.info(f"User {report.reported_id} flagged for suspension in DB")
    
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


async def block_user(blocker_id: str, blocked_id: str) -> Dict[str, Any]:
    """Заблокировать пользователя в Redis"""
    key = f"blocked:{blocker_id}"
    await redis_manager.client.sadd(key, blocked_id)
    logger.info(f"User {blocker_id} blocked {blocked_id}")
    
    return {
        "status": "blocked",
        "blocked_user_id": blocked_id,
        "message": "Пользователь заблокирован"
    }


async def unblock_user(blocker_id: str, blocked_id: str) -> Dict[str, Any]:
    """Разблокировать пользователя в Redis"""
    key = f"blocked:{blocker_id}"
    await redis_manager.client.srem(key, blocked_id)
    return {"status": "unblocked", "unblocked_user_id": blocked_id}


async def is_blocked(blocker_id: str, user_id: str) -> bool:
    """Проверить, заблокирован ли пользователь"""
    key = f"blocked:{blocker_id}"
    return await redis_manager.client.sismember(key, user_id)


async def is_blocked_by(user_id: str, other_id: str) -> bool:
    """Проверить, заблокирован ли я этим пользователем"""
    key = f"blocked:{other_id}"
    return await redis_manager.client.sismember(key, user_id)


async def get_blocked_users(user_id: str) -> List[str]:
    """Получить список заблокированных пользователей"""
    key = f"blocked:{user_id}"
    members = await redis_manager.client.smembers(key)
    return [m.decode() for m in members]


# ============================================================================
# IP BLOCKING (HONEYPOT)
# ============================================================================

async def ban_ip(ip: str, reason: str = "honeypot", duration_seconds: int = 604800):
    """
    Permanently block an IP address (default 7 days).
    Used for Honeypot traps.
    """
    key = f"banned_ip:{ip}"
    await redis_manager.client.set(key, reason, ex=duration_seconds)
    logger.critical(f"🛑 IP BANNED: {ip} Reason: {reason}")

async def is_ip_banned(ip: str) -> bool:
    """Check if IP is in the ban list"""
    return await redis_manager.client.exists(f"banned_ip:{ip}")

