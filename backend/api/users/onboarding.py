# Users API - Онбординг

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.db.session import get_db
from backend.api.users.profile import get_current_user

router = APIRouter()


class OnboardingStepRequest(BaseModel):
    step_name: str
    completed: bool = True


# Ключи шагов онбординга; все должны быть True для завершения
ONBOARDING_REQUIRED_STEP_KEYS = [
    "interactive_tour_completed",
    "first_swipe_done",
    "first_filter_opened",
    "first_superlike_used",
    "first_chat_opened",
    "first_voice_message_sent",
    "first_match_achieved",
    "profile_completion_prompted",
]


@router.post("/me/onboarding/complete-step")
async def complete_onboarding_step(
    data: OnboardingStepRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Отметить шаг онбординга как пройденный.
    Используется для прогрессивного раскрытия функций.
    """
    if not current_user.onboarding_completed_steps:
        current_user.onboarding_completed_steps = {}
    
    current_user.onboarding_completed_steps[data.step_name] = data.completed
    
    # Mark as modified for SQLAlchemy to detect JSON change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(current_user, "onboarding_completed_steps")
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "status": "ok",
        "step": data.step_name,
        "completed": data.completed,
        "all_steps": current_user.onboarding_completed_steps
    }


@router.get("/me/onboarding/status")
async def get_onboarding_status(
    current_user = Depends(get_current_user)
):
    """
    Получить статус прохождения онбординга.
    """
    steps = current_user.onboarding_completed_steps or {}
    is_complete = bool(steps) and all(
        steps.get(key) for key in ONBOARDING_REQUIRED_STEP_KEYS
    )
    return {
        "completed_steps": steps,
        "is_onboarding_complete": is_complete,
    }


@router.post("/me/onboarding/reset")
async def reset_onboarding(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Сбросить прогресс онбординга (для повторного прохождения).
    Доступно из настроек профиля.
    """
    current_user.onboarding_completed_steps = {
        "interactive_tour_completed": False,
        "first_swipe_done": False,
        "first_filter_opened": False,
        "first_superlike_used": False,
        "first_chat_opened": False,
        "first_voice_message_sent": False,
        "first_match_achieved": False,
        "profile_completion_prompted": False
    }
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(current_user, "onboarding_completed_steps")
    
    await db.commit()
    
    return {"status": "ok", "message": "Onboarding reset successfully"}
