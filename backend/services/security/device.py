"""
Device Fingerprinting
=====================
Отпечатки устройств - регистрация, бан, обнаружение мультиаккаунтов.
Данные хранятся в Redis для масштабируемости.
"""

import uuid
import json
import hashlib
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Redis key prefixes
DEVICE_KEY = "device:user:"  # device:user:{user_id} -> list of JSON fingerprints
DEVICE_FP_KEY = "device:fp:"  # device:fp:{fingerprint_hash} -> set of user_ids
BANNED_FP_KEY = "device:banned"  # set of banned fingerprint hashes


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


async def _get_redis():
    """Get Redis client."""
    from backend.core.redis import redis_manager
    return await redis_manager.get_redis()


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
    """Зарегистрировать устройство пользователя (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_register_device_async(
                user_id, user_agent, screen_resolution, timezone, language, platform
            ))
            fp_hash = generate_fingerprint_hash(user_agent, screen_resolution, timezone, language, platform)
            return {"allowed": True, "fingerprint_id": fp_hash[:8], "is_suspicious": False}
        else:
            return loop.run_until_complete(_register_device_async(
                user_id, user_agent, screen_resolution, timezone, language, platform
            ))
    except RuntimeError:
        return asyncio.run(_register_device_async(
            user_id, user_agent, screen_resolution, timezone, language, platform
        ))


async def _register_device_async(
    user_id: str,
    user_agent: str,
    screen_resolution: str = None,
    timezone: str = None,
    language: str = None,
    platform: str = None
) -> Dict[str, Any]:
    """Зарегистрировать устройство пользователя в Redis."""
    redis = await _get_redis()
    
    fp_hash = generate_fingerprint_hash(
        user_agent, screen_resolution, timezone, language, platform
    )
    
    if not redis:
        return {"allowed": True, "fingerprint_id": fp_hash[:8], "is_suspicious": False}
    
    # Проверяем, не забанен ли fingerprint
    is_banned = await redis.sismember(BANNED_FP_KEY, fp_hash)
    if is_banned:
        logger.warning(f"Banned device fingerprint detected for user {user_id}")
        return {
            "allowed": False,
            "reason": "device_banned",
            "message": "Это устройство заблокировано"
        }
    
    # Проверяем, сколько аккаунтов с этого устройства
    fp_users_key = f"{DEVICE_FP_KEY}{fp_hash}"
    other_users = await redis.smembers(fp_users_key)
    other_users_count = len([u for u in other_users if u != user_id])
    
    is_suspicious = other_users_count >= 3
    
    # Добавляем user_id к fingerprint
    await redis.sadd(fp_users_key, user_id)
    await redis.expire(fp_users_key, 60 * 60 * 24 * 90)  # 90 days TTL
    
    # Создаём или обновляем fingerprint для пользователя
    now = datetime.utcnow().isoformat()
    user_devices_key = f"{DEVICE_KEY}{user_id}"
    
    # Get existing devices
    existing_devices_json = await redis.lrange(user_devices_key, 0, -1)
    existing_devices = []
    found = False
    
    for dev_json in existing_devices_json:
        try:
            dev = json.loads(dev_json)
            if dev.get("fingerprint_hash") == fp_hash:
                dev["last_seen"] = now
                found = True
            existing_devices.append(dev)
        except json.JSONDecodeError:
            continue
    
    if not found:
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
        existing_devices.append(fp.model_dump())
    
    # Save back to Redis
    await redis.delete(user_devices_key)
    for dev in existing_devices[-10:]:  # Keep last 10 devices
        await redis.rpush(user_devices_key, json.dumps(dev))
    await redis.expire(user_devices_key, 60 * 60 * 24 * 90)  # 90 days TTL
    
    if is_suspicious:
        logger.warning(f"Suspicious device for user {user_id}: {other_users_count} other accounts")
    
    return {
        "allowed": True,
        "fingerprint_id": fp_hash[:8],
        "is_suspicious": is_suspicious,
        "other_accounts": other_users_count if is_suspicious else 0
    }


def ban_device(fingerprint_hash: str):
    """Забанить устройство по fingerprint (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(_ban_device_async(fingerprint_hash))
        else:
            loop.run_until_complete(_ban_device_async(fingerprint_hash))
    except RuntimeError:
        asyncio.run(_ban_device_async(fingerprint_hash))


async def _ban_device_async(fingerprint_hash: str):
    """Забанить устройство по fingerprint в Redis."""
    redis = await _get_redis()
    if redis:
        await redis.sadd(BANNED_FP_KEY, fingerprint_hash)
        logger.info(f"Device fingerprint banned: {fingerprint_hash[:8]}")


def get_user_devices(user_id: str) -> List[Dict[str, Any]]:
    """Получить список устройств пользователя (sync wrapper)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return []  # Default for sync context
        else:
            return loop.run_until_complete(_get_user_devices_async(user_id))
    except RuntimeError:
        return asyncio.run(_get_user_devices_async(user_id))


async def _get_user_devices_async(user_id: str) -> List[Dict[str, Any]]:
    """Получить список устройств пользователя из Redis."""
    redis = await _get_redis()
    if not redis:
        return []
    
    user_devices_key = f"{DEVICE_KEY}{user_id}"
    devices_json = await redis.lrange(user_devices_key, 0, -1)
    
    devices = []
    for dev_json in devices_json:
        try:
            dev = json.loads(dev_json)
            devices.append({
                "id": dev.get("id"),
                "fingerprint": dev.get("fingerprint_hash", "")[:8] + "...",
                "platform": dev.get("platform"),
                "last_seen": dev.get("last_seen"),
                "is_suspicious": dev.get("is_suspicious", False)
            })
        except json.JSONDecodeError:
            continue
    
    return devices


async def get_users_by_fingerprint(fingerprint_hash: str) -> List[str]:
    """Get all user IDs associated with a fingerprint."""
    redis = await _get_redis()
    if not redis:
        return []
    
    fp_users_key = f"{DEVICE_FP_KEY}{fingerprint_hash}"
    return list(await redis.smembers(fp_users_key))
