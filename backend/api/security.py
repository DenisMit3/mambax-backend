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
    is_blocked
)

router = APIRouter(tags=["Security & Moderation"])

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
    current_user: str = Depends(auth.get_current_user)
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
        result = create_report(
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
    result = block_user(current_user, request.user_id)
    return result


@router.post("/unblock")
async def unblock_user_endpoint(
    request: BlockUserRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    ✅ Разблокировать пользователя
    """
    result = unblock_user(current_user, request.user_id)
    return result


@router.get("/blocked")
async def get_blocked_list(
    current_user: str = Depends(auth.get_current_user)
):
    """
    📋 Список заблокированных пользователей
    """
    blocked_ids = get_blocked_users(current_user)
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

async def require_admin(current_user: str = Depends(auth.get_current_user)):
    """Проверка прав администратора"""
    # TODO: Проверить is_admin в БД
    # Пока разрешаем всем для разработки
    return current_user


@router.get("/admin/reports")
async def admin_get_reports(
    limit: int = 50,
    admin_user: str = Depends(require_admin)
):
    """
    📋 [ADMIN] Список жалоб для модерации
    """
    reports = get_pending_reports(limit)
    return {
        "reports": [r.dict() for r in reports],
        "count": len(reports)
    }


@router.post("/admin/reports/{report_id}/resolve")
async def admin_resolve_report(
    report_id: str,
    request: ResolveReportRequest,
    admin_user: str = Depends(require_admin)
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
        result = resolve_report(
            report_id=report_id,
            admin_id=admin_user,
            resolution=request.resolution,
            action=request.action
        )
        return {"status": "resolved", "report": result.dict()}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/admin/shadowban/{user_id}")
async def admin_shadowban_user(
    user_id: str,
    reason: str = "Admin action",
    duration_hours: int = 24,
    admin_user: str = Depends(require_admin)
):
    """
    👻 [ADMIN] Shadowban пользователя
    """
    result = shadowban_user(user_id, reason, duration_hours, admin_user)
    return result


@router.post("/admin/unshadowban/{user_id}")
async def admin_unshadowban_user(
    user_id: str,
    admin_user: str = Depends(require_admin)
):
    """
    ✅ [ADMIN] Снять shadowban
    """
    result = unshadowban_user(user_id)
    return result


@router.get("/admin/shadowban/{user_id}")
async def admin_check_shadowban(
    user_id: str,
    admin_user: str = Depends(require_admin)
):
    """
    ℹ️ [ADMIN] Проверить статус shadowban
    """
    info = get_shadowban_info(user_id)
    if info:
        return {"is_shadowbanned": True, "info": info}
    return {"is_shadowbanned": False}


@router.post("/admin/ban-device")
async def admin_ban_device(
    fingerprint_hash: str,
    admin_user: str = Depends(require_admin)
):
    """
    📱 [ADMIN] Забанить устройство по fingerprint
    """
    ban_device(fingerprint_hash)
    return {"status": "banned", "fingerprint": fingerprint_hash[:8] + "..."}
