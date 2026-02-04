from fastapi import APIRouter, HTTPException, Request, Depends, status
import logging
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.config.traycer import TRAYCER_API_TOKEN
from backend.database import get_db
from backend.models.system import AuditLog, SecurityAlert
from backend.models.user import User
# Assuming UserStatus is an Enum or string, usually cleaner to use string if import difficult, 
# but models.user usually has it.
from backend.models.user import UserStatus 

router = APIRouter(prefix="/api/traycer", tags=["Traycer"])

logger = logging.getLogger(__name__)

async def verify_traycer_token(request: Request):
    """
    Verifies that the request comes from Traycer using the configured API Token.
    Expects the token in the 'X-Traycer-Token' header or 'Authorization' header.
    """
    token = request.headers.get("X-Traycer-Token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if token != TRAYCER_API_TOKEN:
        logger.warning(f"Unauthorized access attempt to Traycer webhook from {request.client.host}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Traycer API Token",
        )

@router.post("/webhook")
async def traycer_webhook(
    request: Request, 
    db: AsyncSession = Depends(get_db),
    _ = Depends(verify_traycer_token)
):
    """
    Receives tasks or updates from Traycer (Real Implementation).
    Supports events: 'test_ping', 'user.update_status', 'system.alert'.
    """
    try:
        payload = await request.json()
        logger.info(f"Received Traycer payload: {payload}")
        
        event_type = payload.get("event")
        data = payload.get("data", {})
        
        if not event_type:
            raise HTTPException(status_code=400, detail="Missing 'event' field")

        # 1. Handle Test Ping
        if event_type == "test_ping":
            return {"status": "success", "message": "pong", "timestamp": datetime.utcnow().isoformat()}

        # 2. Handle User Status Update (e.g. external moderation)
        elif event_type == "user.update_status":
            user_id = data.get("user_id")
            new_status = data.get("status")
            
            if not user_id or not new_status:
                raise HTTPException(status_code=400, detail="Missing user_id or status")
                
            user = await db.get(User, uuid.UUID(user_id))
            if user:
                # Basic validation or mapping could go here
                user.status = new_status
                # Explicitly deactivate if banned/suspended
                if new_status in ["banned", "suspended"]:
                    user.is_active = False
                elif new_status == "active":
                    user.is_active = True
                
                await db.commit()
                logger.info(f"Traycer updated user {user_id} status to {new_status}")
            else:
                logger.warning(f"Traycer tried to update non-existent user {user_id}")
                return {"status": "warning", "message": "User not found"}

        # 3. Handle System Alert (e.g. external monitoring)
        elif event_type == "system.alert":
            alert = SecurityAlert(
                severity=data.get("severity", "medium"),
                type=data.get("type", "external_monitor"),
                description=data.get("description", "Alert received from Traycer"),
                details=data.get("details", {}),
                created_at=datetime.utcnow()
            )
            db.add(alert)
            await db.commit()
            logger.info(f"Traycer created security alert: {alert.type}")

        # 4. Fallback / Audit logging
        # Find a system user or admin to attribute this action to
        # to avoid ForeignKeyViolation unique_violation
        system_user = await db.scalar(
            select(User).where(User.role == "admin").limit(1)
        )
        
        # If no admin exists, we can't safely log to AuditLog if admin_id is non-nullable FK.
        # But we tried.
        admin_id_to_use = system_user.id if system_user else uuid.UUID("00000000-0000-0000-0000-000000000000")
        
        audit = AuditLog(
            admin_id=admin_id_to_use, 
            action=f"traycer_webhook:{event_type}",
            target_resource="system",
            changes=payload,
            ip_address=request.client.host,
            user_agent="Traycer-Webhook/1.0"
        )
        db.add(audit)
        await db.commit()
        
        return {"status": "success", "processed_event": event_type}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Traycer webhook: {e}")
        # Rollback in case of DB error
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
