"""
Device Fingerprinting
=====================
Отпечатки устройств — регистрация, бан, обнаружение мультиаккаунтов.
"""

import uuid
import hashlib
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from collections import defaultdict
from pydantic import BaseModel

logger = logging.getLogger(__name__)


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
    
    is_suspicious = len(set(all_fps)) >= 3
    
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
