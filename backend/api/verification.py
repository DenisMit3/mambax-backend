"""
Verification API Router
========================
API эндпоинты для верификации профиля через селфи.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from backend import database, auth
from backend.services.verification import (
    start_verification,
    submit_verification,
    get_verification_status,
    cancel_verification,
    GESTURE_DESCRIPTIONS
)

router = APIRouter(prefix="/verification", tags=["Verification"])

# ============================================================================
# SCHEMAS
# ============================================================================

class StartVerificationResponse(BaseModel):
    session_id: str
    gesture: str
    gesture_name: str
    gesture_emoji: str
    instruction: str
    expires_at: str

class SubmitVerificationRequest(BaseModel):
    session_id: str
    selfie_url: str

class VerificationStatusResponse(BaseModel):
    is_verified: bool
    verification_selfie: Optional[str] = None
    active_session: Optional[dict] = None
    can_start_verification: bool

class VerificationResultResponse(BaseModel):
    status: str
    is_verified: bool
    message: str
    badge_awarded: bool = False

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/start", response_model=StartVerificationResponse)
async def api_start_verification(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    🎯 Начать верификацию профиля.
    
    Возвращает случайный жест, который нужно показать на селфи.
    Сессия активна 10 минут.
    """
    result = await start_verification(db, current_user)
    
    if "error" in result:
        if result["error"] == "already_verified":
            raise HTTPException(status_code=400, detail=result["message"])
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/submit", response_model=VerificationResultResponse)
async def api_submit_verification(
    data: SubmitVerificationRequest,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    📸 Отправить селфи для верификации.
    
    Загрузите селфи с жестом, полученным при старте верификации.
    """
    result = await submit_verification(
        db=db,
        user_id=current_user,
        session_id=data.session_id,
        selfie_url=data.selfie_url
    )
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/status", response_model=VerificationStatusResponse)
async def api_verification_status(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    """
    ℹ️ Получить статус верификации.
    
    Показывает:
    - Верифицирован ли профиль
    - Активная сессия верификации (если есть)
    - Можно ли начать новую верификацию
    """
    result = await get_verification_status(db, current_user)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/cancel")
async def api_cancel_verification(
    session_id: str,
    current_user: str = Depends(auth.get_current_user)
):
    """
    ❌ Отменить текущую верификацию.
    """
    result = await cancel_verification(current_user, session_id)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/gestures")
async def api_list_gestures():
    """
    📋 Список всех возможных жестов для верификации.
    
    Информационный эндпоинт для отображения в UI.
    """
    return {
        "gestures": [
            {
                "id": gesture_id,
                "name": info["name"],
                "emoji": info["emoji"],
                "instruction": info["instruction"]
            }
            for gesture_id, info in GESTURE_DESCRIPTIONS.items()
        ]
    }
