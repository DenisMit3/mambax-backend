"""
Security & Moderation API Router
==================================
API эндпоинты для системы безопасности и модерации.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from backend import database, auth
import logging
import uuid
from sqlalchemy import update
from backend.db.session import get_db
from backend.models.user import User, UserStatus

logger = logging.getLogger(__name__)
from backend.services.security import (
    # Rate limiting
    check_rate_limit,
    rate_limiter,
    # Anti-spam
    spam_detector,
    # Shadowban
    shadowban_user,
    unshadowban_user,
    is_shadowbanned,
    get_shadowban_info,
    # Reports
    create_report,
    get_pending_reports,
    resolve_report,
    ReportReason,
    ReportStatus,
    # Device fingerprinting
    register_device,
    ban_device,
    get_user_devices,
    # 2FA
    enable_2fa,
    disable_2fa,
    is_2fa_enabled,
    create_2fa_challenge,
    verify_2fa,
    TwoFactorMethod,
    # Blocking
    block_user,
    unblock_user,
    get_blocked_users,
    is_blocked,
    ban_ip
)

router = APIRouter(tags=["Security & Moderation"])

@router.get("/trap", include_in_schema=False)
async def honeypot_trap(request: Request):
    """
    🍯 HONEYPOT TRAP
    Any IP accessing this endpoint will be permanently banned.
    Hidden from API docs.
    """
    client_ip = request.client.host
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
        
    await ban_ip(client_ip, reason="HoneyPot Trap Triggered")
    
    # Return a fake error to confuse the bot further or just hang
    return {"status": "system_failure", "code": 0xDEADBEEF}


# ============================================================================
# SCHEMAS
# ============================================================================

class ReportRequest(BaseModel):
    reported_user_id: str
    reason: ReportReason
    description: Optional[str] = None
    evidence_urls: Optional[List[str]] = None

class ResolveReportRequest(BaseModel):
    resolution: str
    action: Optional[str] = None  # warn, shadowban, suspend, dismiss

class BlockUserRequest(BaseModel):
    user_id: str

class DeviceInfoRequest(BaseModel):
    user_agent: str
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None

class Verify2FARequest(BaseModel):
    session_id: str
    code: str

# ============================================================================
# USER ENDPOINTS
# ============================================================================

@router.post("/report")
async def report_user(
    report: ReportRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    🚨 Пожаловаться на пользователя
    
    Причины:
    - fake_profile: Фейковый профиль
    - inappropriate_photos: Неприемлемые фото
    - harassment: Домогательства
    - spam: Спам
    - scam: Мошенничество
    - underage: Несовершеннолетний
    - other: Другое
    """
    try:
        result = await create_report(
            db=db,
            reporter_id=current_user,
            reported_user_id=report.reported_user_id,
            reason=report.reason,
            description=report.description,
            evidence_urls=report.evidence_urls
        )
        return {
            "status": "created",
            "report_id": result.id,
            "message": "Жалоба отправлена. Мы рассмотрим её в ближайшее время."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/block")
async def block_user_endpoint(
    request: BlockUserRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    🚫 Заблокировать пользователя
    
    Заблокированный пользователь:
    - Не сможет писать вам
    - Не увидит ваш профиль
    - Вы не увидите его профиль
    """
    result = await block_user(current_user, request.user_id)
    return result


@router.post("/unblock")
async def unblock_user_endpoint(
    request: BlockUserRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    ✅ Разблокировать пользователя
    """
    result = await unblock_user(current_user, request.user_id)
    return result


@router.get("/blocked")
async def get_blocked_list(
    current_user: str = Depends(auth.get_current_user)
):
    """
    📋 Список заблокированных пользователей
    """
    blocked_ids = await get_blocked_users(current_user)
    return {"blocked_users": blocked_ids, "count": len(blocked_ids)}


@router.get("/devices")
async def get_my_devices(
    current_user: str = Depends(auth.get_current_user)
):
    """
    📱 Мои устройства
    """
    devices = get_user_devices(current_user)
    return {"devices": devices, "count": len(devices)}


@router.post("/register-device")
async def register_device_endpoint(
    device_info: DeviceInfoRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    📲 Зарегистрировать устройство
    
    Вызывается при входе в приложение для device fingerprinting.
    """
    result = register_device(
        user_id=current_user,
        user_agent=device_info.user_agent,
        screen_resolution=device_info.screen_resolution,
        timezone=device_info.timezone,
        language=device_info.language,
        platform=device_info.platform
    )
    
    if not result["allowed"]:
        raise HTTPException(status_code=403, detail=result["message"])
    
    return result


# ============================================================================
# 2FA ENDPOINTS
# ============================================================================

@router.post("/2fa/enable")
async def enable_2fa_endpoint(
    method: TwoFactorMethod = TwoFactorMethod.TELEGRAM,
    current_user: str = Depends(auth.get_current_user)
):
    """
    🔐 Включить двухфакторную аутентификацию
    
    Методы:
    - telegram: Код через Telegram бота
    - email: Код на email (если есть)
    """
    return enable_2fa(current_user, method)


@router.post("/2fa/disable")
async def disable_2fa_endpoint(
    current_user: str = Depends(auth.get_current_user)
):
    """
    🔓 Отключить 2FA
    """
    return disable_2fa(current_user)


@router.get("/2fa/status")
async def get_2fa_status(
    current_user: str = Depends(auth.get_current_user)
):
    """
    ℹ️ Статус 2FA
    """
    enabled = is_2fa_enabled(current_user)
    return {"enabled": enabled}


@router.post("/2fa/verify")
async def verify_2fa_endpoint(
    request: Verify2FARequest
):
    """
    ✅ Подтвердить 2FA код
    """
    result = verify_2fa(request.session_id, request.code)
    
    if not result["verified"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============================================================================
# ADMIN ENDPOINTS (требуется проверка прав)
# ============================================================================

# Admin dependency is imported from auth
# require_admin removed - usage replaced by auth.get_current_admin

@router.get("/admin/reports")
async def admin_get_reports(
    limit: int = 50,
    admin_user: auth.User = Depends(auth.get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    📋 [ADMIN] Список жалоб для модерации
    """
    reports = await get_pending_reports(db, limit)
    return {
        "reports": [
            {
                "id": str(r.id),
                "reporter_id": str(r.reporter_id),
                "reported_user_id": str(r.reported_id),
                "reason": r.reason,
                "description": r.description,
                "status": r.status,
                "created_at": r.created_at.isoformat()
            } for r in reports
        ],
        "count": len(reports)
    }


@router.post("/admin/reports/{report_id}/resolve")
async def admin_resolve_report(
    report_id: str,
    request: ResolveReportRequest,
    admin_user: auth.User = Depends(auth.get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    ✅ [ADMIN] Разрешить жалобу
    
    Действия:
    - warn: Предупреждение
    - shadowban: Shadowban на 72 часа
    - suspend: Полная блокировка
    - dismiss: Отклонить жалобу
    """
    try:
        result = await resolve_report(
            db=db,
            report_id=report_id,
            admin_id=str(admin_user.id),
            resolution=request.resolution,
            action=request.action
        )
        
        # Handle persistent actions that require DB access
        if request.action == "suspend":
            try:
                user_uuid = uuid.UUID(result.reported_user_id)
                await db.execute(
                    update(User)
                    .where(User.id == user_uuid)
                    .values(
                        status=UserStatus.SUSPENDED,
                        is_active=False
                    )
                )
                await db.commit()
                logger.info(f"User {result.reported_user_id} suspended in DB by {admin_user.id}")
            except Exception as e:
                logger.error(f"Failed to suspend user in DB: {e}")
                # Log error but don't fail response as report is resolved in memory
                
        return {
            "status": "resolved", 
            "report": {
                "id": str(result.id),
                "status": result.status,
                "resolution": result.resolution
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/admin/shadowban/{user_id}")
async def admin_shadowban_user(
    user_id: str,
    reason: str = "Admin action",
    duration_hours: int = 24,
    admin_user: auth.User = Depends(auth.get_current_admin)
):
    """
    👻 [ADMIN] Shadowban пользователя
    """
    result = await shadowban_user(user_id, reason, duration_hours)
    return result


@router.post("/admin/unshadowban/{user_id}")
async def admin_unshadowban_user(
    user_id: str,
    admin_user: auth.User = Depends(auth.get_current_admin)
):
    """
    ✅ [ADMIN] Снять shadowban
    """
    result = await unshadowban_user(user_id)
    return result


@router.get("/admin/shadowban/{user_id}")
async def admin_check_shadowban(
    user_id: str,
    admin_user: auth.User = Depends(auth.get_current_admin)
):
    """
    ℹ️ [ADMIN] Проверить статус shadowban
    """
    info = await get_shadowban_info(user_id)
    if info:
        return {"is_shadowbanned": True, "info": info}
    return {"is_shadowbanned": False}


@router.post("/admin/ban-device")
async def admin_ban_device(
    fingerprint_hash: str,
    admin_user: auth.User = Depends(auth.get_current_admin)
):
    """
    📱 [ADMIN] Забанить устройство по fingerprint
    """
    ban_device(fingerprint_hash)
    return {"status": "banned", "fingerprint": fingerprint_hash[:8] + "..."}
