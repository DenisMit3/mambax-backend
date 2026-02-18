"""Client-side log collection endpoint for Telegram WebApp debugging."""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List, Optional
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
        
        # Log to server console too
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
