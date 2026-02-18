"""Client-side log collection endpoint for Telegram WebApp debugging."""
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import logging
from datetime import datetime

router = APIRouter(tags=["Debug"])
logger = logging.getLogger("client_logs")

# In-memory ring buffer (last 500 logs)
_logs: List[dict] = []
MAX_LOGS = 500


class ClientLogEntry(BaseModel):
    level: str = "log"  # log, warn, error, info
    message: str
    timestamp: Optional[str] = None
    url: Optional[str] = None
    userAgent: Optional[str] = None


class ClientLogBatch(BaseModel):
    logs: List[ClientLogEntry]


@router.post("/api/client-logs")
async def receive_client_logs(batch: ClientLogBatch, request: Request):
    """Receive console logs from frontend (Telegram WebApp)."""
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    
    for entry in batch.logs:
        log_record = {
            "time": entry.timestamp or datetime.utcnow().isoformat(),
            "level": entry.level.upper(),
            "message": entry.message[:2000],  # limit size
            "url": entry.url,
            "ip": client_ip.split(",")[0].strip(),
        }
        _logs.append(log_record)
        
        # Log to server console too (goes to Vercel Function Logs)
        level = entry.level.lower()
        prefix = f"[CLIENT:{client_ip.split(',')[0].strip()}]"
        if level == "error":
            logger.error(f"{prefix} {entry.message[:500]}")
        elif level == "warn":
            logger.warning(f"{prefix} {entry.message[:500]}")
        else:
            logger.info(f"{prefix} {entry.message[:500]}")
    
    # Trim buffer
    while len(_logs) > MAX_LOGS:
        _logs.pop(0)
    
    return {"ok": True, "count": len(batch.logs)}


@router.get("/api/client-logs")
async def get_client_logs(limit: int = 50, level: Optional[str] = None):
    """Read collected client logs. Use ?limit=100&level=ERROR to filter."""
    logs = _logs
    if level:
        logs = [l for l in logs if l["level"] == level.upper()]
    return {"logs": logs[-limit:], "total": len(logs)}


@router.delete("/api/client-logs")
async def clear_client_logs():
    """Clear all collected client logs."""
    _logs.clear()
    return {"ok": True, "cleared": True}


@router.get("/api/debug/users-status")
async def debug_users_status(limit: int = 5):
    """Debug: show recent users with is_complete status and photo count."""
    from backend.db.session import get_db
    from backend.models.user import User, UserPhoto
    from sqlalchemy import func
    
    async for db in get_db():
        # Get recent users
        users = (await db.execute(
            select(User).order_by(desc(User.created_at)).limit(limit)
        )).scalars().all()
        
        result = []
        for u in users:
            photo_count = (await db.execute(
                select(func.count()).select_from(UserPhoto).where(UserPhoto.user_id == u.id)
            )).scalar() or 0
            
            result.append({
                "id": str(u.id),
                "name": u.name,
                "age": u.age,
                "gender": str(u.gender) if u.gender else None,
                "is_complete": u.is_complete,
                "is_active": u.is_active,
                "photo_count": photo_count,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "telegram_id": u.telegram_id,
            })
        
        return {"users": result}
