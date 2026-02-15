# Auth API - Debug endpoints (dev only)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from backend.db.session import get_db
from backend.models.user import User
from backend.config.settings import settings
from backend.api.auth.schemas import TelegramLoginRequest

router = APIRouter()


@router.get("/last-validation-debug")
async def last_validation_debug():
    """Returns the last validation attempt debug info (GET - easy to open in browser)."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    from backend.auth import _last_validation_debug
    return _last_validation_debug


@router.get("/debug-user/{telegram_id}")
async def debug_user_by_tg(telegram_id: str, db: AsyncSession = Depends(get_db)):
    """Temporary debug: check user record by telegram_id."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    from backend.crud.user import get_user_by_telegram_id
    user = await get_user_by_telegram_id(db, telegram_id)
    
    results = []
    stmt = select(User).where(
        or_(
            User.telegram_id == telegram_id,
            User.username == "RezidentMD",
            User.username == f"user_{telegram_id}",
        )
    ).limit(5)
    res = await db.execute(stmt)
    all_users = res.scalars().all()
    
    for u in all_users:
        results.append({
            "id": str(u.id),
            "telegram_id": u.telegram_id,
            "username": u.username,
            "name": u.name,
            "gender": str(u.gender),
            "is_complete": u.is_complete,
            "photos_count": len(u.photos) if u.photos else 0,
            "age": u.age,
            "is_active": u.is_active,
            "role": u.role,
        })
    
    count_stmt = select(User)
    count_res = await db.execute(count_stmt)
    total = len(count_res.scalars().all())
    
    return {
        "searched_telegram_id": telegram_id,
        "found_by_tg_id": user is not None,
        "total_users_in_db": total,
        "matching_users": results,
    }


@router.post("/telegram-debug")
async def telegram_debug(data: TelegramLoginRequest):
    """Temporary debug endpoint to diagnose Telegram initData validation."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Not found")
    from urllib.parse import parse_qsl
    import hmac as _hmac
    import hashlib as _hashlib
    import json
    from datetime import datetime
    
    init_data = data.init_data
    result = {
        "init_data_length": len(init_data) if init_data else 0,
        "init_data_preview": init_data[:100] if init_data else "",
        "parsed_keys": [],
        "has_hash": False,
        "has_signature": False,
        "hash_match": False,
        "auth_date": None,
        "auth_date_age_seconds": None,
        "user_data": None,
        "error": None,
        "bot_token_length": len(settings.TELEGRAM_BOT_TOKEN) if settings.TELEGRAM_BOT_TOKEN else 0,
    }
    
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        result["parsed_keys"] = sorted(parsed.keys())
        result["has_hash"] = "hash" in parsed
        result["has_signature"] = "signature" in parsed
        
        if "hash" in parsed:
            received_hash = parsed.pop("hash")
            parsed.pop("signature", None)
            
            auth_date = int(parsed.get("auth_date", 0))
            result["auth_date"] = auth_date
            result["auth_date_age_seconds"] = int(datetime.utcnow().timestamp() - auth_date)
            
            data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
            result["data_check_string_preview"] = data_check_string[:200]
            
            secret_key = _hmac.new(b"WebAppData", settings.TELEGRAM_BOT_TOKEN.encode(), _hashlib.sha256).digest()
            calculated_hash = _hmac.new(secret_key, data_check_string.encode(), _hashlib.sha256).hexdigest()
            
            result["hash_match"] = _hmac.compare_digest(calculated_hash, received_hash)
            result["calculated_hash_prefix"] = calculated_hash[:16]
            result["received_hash_prefix"] = received_hash[:16]
            
            if "user" in parsed:
                result["user_data"] = json.loads(parsed["user"])
        else:
            result["error"] = "No 'hash' key in parsed initData"
    except Exception as e:
        result["error"] = str(e)
    
    return result
