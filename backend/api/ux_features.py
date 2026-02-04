"""
UX Features API Router
=======================
API эндпоинты для UX функций.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from pydantic import BaseModel
from typing import Optional, Dict, List
from backend.models.user import User

from backend import database, auth, crud
from backend.config.settings import settings as app_settings
import uuid
from backend.services.ux_features import (
    # Push Notifications
    register_fcm_token,
    unregister_fcm_token,
    get_notification_settings,
    update_notification_settings,
    send_push_notification,
    PushNotification,
    NotificationType,
    # Incognito
    enable_incognito,
    disable_incognito,
    is_incognito,
    get_incognito_settings,
    # Undo Swipe
    undo_last_swipe,
    get_undo_count,
    # Account Deletion
    request_account_deletion,
    cancel_account_deletion,
    get_deletion_status,
    AccountDeletionReason,
    # Visibility
    get_visibility_settings,
    update_visibility_settings,
    # Boost
    activate_boost,
    get_boost_status,
    is_boosted
)
from backend.services.features import feature_service
from backend.services.features import feature_service

router = APIRouter(prefix="/ux", tags=["UX Features"])

# ============================================================================
# SCHEMAS
# ============================================================================

class FCMTokenRequest(BaseModel):
    token: str

class NotificationSettingsRequest(BaseModel):
    new_match: Optional[bool] = None
    new_message: Optional[bool] = None
    new_like: Optional[bool] = None
    super_like: Optional[bool] = None
    profile_view: Optional[bool] = None
    match_reminder: Optional[bool] = None
    promotion: Optional[bool] = None

class DeleteAccountRequest(BaseModel):
    reason: AccountDeletionReason
    feedback: Optional[str] = None

class VisibilitySettingsRequest(BaseModel):
    show_online_status: Optional[bool] = None
    show_last_seen: Optional[bool] = None
    show_distance: Optional[bool] = None
    show_age: Optional[bool] = None
    read_receipts: Optional[bool] = None

# ============================================================================
# PUSH NOTIFICATIONS
# ============================================================================

@router.post("/push/register")
async def register_push_token(
    req: FCMTokenRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    📲 Зарегистрировать FCM токен для push-уведомлений
    """
    if not await feature_service.is_enabled("notifications", current_user, default=True):
        raise HTTPException(status_code=404, detail="Push notifications are currently disabled")

    result = register_fcm_token(current_user, req.token)
    return result


@router.post("/push/unregister")
async def unregister_push_token(
    req: FCMTokenRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    🚫 Удалить FCM токен
    """
    result = unregister_fcm_token(current_user, req.token)
    return result


@router.get("/notifications/settings")
async def get_notifications_settings(
    current_user: str = Depends(auth.get_current_user)
):
    """
    ⚙️ Получить настройки уведомлений
    """
    return get_notification_settings(current_user)


@router.put("/notifications/settings")
async def update_notifications_settings(
    req: NotificationSettingsRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    ⚙️ Обновить настройки уведомлений
    """
    # FIX: Pydantic v2 uses model_dump
    settings_data = req.model_dump(exclude_unset=True)
    return update_notification_settings(current_user, settings_data)


# ============================================================================
# INCOGNITO MODE (VIP)
# ============================================================================

@router.post("/incognito/enable")
async def enable_incognito_mode(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    👻 Включить режим Инкогнито (VIP)
    
    В режиме Инкогнито:
    - Ваш профиль скрыт от общего поиска
    - Виден только тем, кого вы лайкнули
    - Ваши лайки анонимны
    """
    if not await feature_service.is_enabled("incognito_mode", current_user, default=True):
        raise HTTPException(status_code=404, detail="Incognito mode is temporarily disabled")

    # Проверяем VIP статус
    user = await crud.get_user_profile(db, current_user)
    if not user or not user.is_vip:
        raise HTTPException(
            status_code=403, 
            detail="Режим Инкогнито доступен только для VIP пользователей"
        )
    
    return enable_incognito(current_user)


@router.post("/incognito/disable")
async def disable_incognito_mode(
    current_user: str = Depends(auth.get_current_user)
):
    """
    👁️ Выключить режим Инкогнито
    """
    return disable_incognito(current_user)


@router.get("/incognito/status")
async def get_incognito_status(
    current_user: str = Depends(auth.get_current_user)
):
    """
    ℹ️ Статус режима Инкогнито
    """
    return get_incognito_settings(current_user)


# ============================================================================
# UNDO SWIPE (VIP)
# ============================================================================

@router.post("/undo")
async def undo_last_swipe_endpoint(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    ↩️ Отменить последний свайп (VIP)
    
    Возвращает профиль для повторного просмотра.
    """
    if not await feature_service.is_enabled("undo_swipe", current_user, default=True):
        raise HTTPException(status_code=404, detail="Undo feature is temporarily disabled")

    # Проверяем VIP статус
    user = await crud.get_user_profile(db, current_user)
    is_vip = user.is_vip if user else False
    
    result = await undo_last_swipe(db, current_user, is_vip)
    
    if not result["success"] and result.get("error") == "vip_required":
        raise HTTPException(status_code=403, detail=result["message"])
    
    return result


@router.get("/undo/count")
async def get_undo_count_endpoint(
    current_user: str = Depends(auth.get_current_user)
):
    """
    🔢 Количество доступных отмен
    """
    return {"count": get_undo_count(current_user)}


# ============================================================================
# ACCOUNT DELETION
# ============================================================================

@router.post("/account/delete")
async def request_delete_account(
    req: DeleteAccountRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🗑️ Запросить удаление аккаунта
    
    Аккаунт будет деактивирован сразу, но данные удалятся через 30 дней.
    Можно отменить в течение этого периода.
    """
    result = await request_account_deletion(
        db=db,
        user_id=current_user,
        reason=req.reason,
        feedback=req.feedback
    )
    return result


@router.post("/account/delete/cancel")
async def cancel_delete_account(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    ✅ Отменить удаление аккаунта
    """
    result = await cancel_account_deletion(db, current_user)
    return result


@router.get("/account/delete/status")
async def get_delete_account_status(
    current_user: str = Depends(auth.get_current_user)
):
    """
    ℹ️ Статус запроса на удаление
    """
    return get_deletion_status(current_user)


# ============================================================================
# VISIBILITY SETTINGS
# ============================================================================

@router.get("/visibility")
async def get_visibility(
    current_user: str = Depends(auth.get_current_user)
):
    """
    👁️ Настройки видимости профиля
    """
    return get_visibility_settings(current_user)


@router.put("/visibility")
async def update_visibility(
    req: VisibilitySettingsRequest,
    current_user: str = Depends(auth.get_current_user)
):
    """
    ⚙️ Обновить настройки видимости
    
    - show_online_status: Показывать онлайн статус
    - show_last_seen: Показывать "был в сети"
    - show_distance: Показывать расстояние
    - show_age: Показывать возраст
    - read_receipts: Показывать статус "прочитано"
    """
    settings_data = req.model_dump(exclude_unset=True)
    return update_visibility_settings(current_user, settings_data)


# ============================================================================
# BOOST
# ============================================================================

@router.post("/boost/activate")
async def activate_profile_boost(
    duration_minutes: int = 30,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🚀 Активировать буст профиля
    
    Ваш профиль будет показываться первым в ленте!
    """
    if not await feature_service.is_enabled("boost_profile", current_user, default=True):
        raise HTTPException(status_code=404, detail="Boost feature is temporarily disabled")

    # FIX: Use configured price
    BOOST_PRICE = 50 
    
    # 1. Check Balance
    user = await crud.get_user_profile(db, current_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_balance = user.stars_balance or 0
    if current_balance < BOOST_PRICE:
        raise HTTPException(
            status_code=402, 
            detail=f"Insufficient stars. Need {BOOST_PRICE}, have {current_balance}"
        )
        
    # 2. Atomic Deduction
    # FIX: Ensure UUID cast for where clause
    try:
        u_uuid = uuid.UUID(current_user)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid User ID")

    await db.execute(
        update(User)
        .where(User.id == u_uuid)
        .values(stars_balance=User.stars_balance - BOOST_PRICE)
    )
    
    # 3. Record Transaction
    from backend.models.monetization import RevenueTransaction
    import uuid
    
    transaction = RevenueTransaction(
        user_id=current_user,
        transaction_type="boost_purchase",
        amount=BOOST_PRICE,
        currency="XTR",
        status="completed",
        payment_gateway="internal_stars",
        custom_metadata={"duration": duration_minutes}
    )
    db.add(transaction)
    await db.commit()
    
    result = activate_boost(current_user, duration_minutes)
    return result


@router.get("/boost/status")
async def get_boost_status_endpoint(
    current_user: str = Depends(auth.get_current_user)
):
    """
    📊 Статус буста
    """
    return get_boost_status(current_user)


# ============================================================================
# ONLINE STATUS
# ============================================================================

@router.get("/online/{user_id}")
async def check_user_online(
    user_id: str,
    current_user: str = Depends(auth.get_current_user)
):
    """
    🟢 Проверить онлайн статус пользователя
    """
    from backend.services.chat import get_online_status, format_last_seen
    
    # Проверяем настройки видимости пользователя
    visibility = get_visibility_settings(user_id)
    
    status = get_online_status(user_id)
    
    # Скрываем если пользователь отключил
    if not visibility.get("show_online_status", True):
        status["is_online"] = None
    
    if not visibility.get("show_last_seen", True):
        status["last_seen"] = None
        status["last_seen_formatted"] = None
    elif status.get("last_seen"):
        status["last_seen_formatted"] = format_last_seen(status["last_seen"])
    
    return status


# ============================================================================
# DELETION REASONS (for UI)
# ============================================================================

@router.get("/account/delete/reasons")
async def get_deletion_reasons():
    """
    📋 Причины удаления аккаунта
    """
    return {
        "reasons": [
            {"value": "found_partner", "label": "Нашёл(ла) пару", "emoji": "💕"},
            {"value": "not_using", "label": "Не пользуюсь приложением", "emoji": "📱"},
            {"value": "privacy_concerns", "label": "Беспокоит приватность", "emoji": "🔒"},
            {"value": "bad_experience", "label": "Плохой опыт", "emoji": "😔"},
            {"value": "too_many_notifications", "label": "Слишком много уведомлений", "emoji": "🔔"},
            {"value": "other", "label": "Другое", "emoji": "💭"}
        ]
    }
