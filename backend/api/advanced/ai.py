# Advanced API - AI endpoints

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from backend.database import get_db
from backend.models import User
from backend.models.advanced import AIUsageLog
from backend.crud import advanced as advanced_crud
from backend.services.ai import ai_service
from backend.services.analytics import analytics_service
from backend.api.advanced.deps import get_current_admin, AIGenerateRequest

router = APIRouter()


@router.post("/ai/generate")
async def generate_ai_content(
    request: AIGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Generate AI-powered content suggestions (Real AI Service)"""
    suggestions, usage = await ai_service.generate_content(
        content_type=request.content_type.value,
        context=request.context,
        tone=request.tone,
        count=request.count
    )

    log_entry = AIUsageLog(
        feature=request.content_type.value,
        model="gpt-4-turbo" if ai_service.provider == "openai" else "simulation",
        tokens_used=usage["tokens"],
        cost=usage["cost"],
        user_id=str(current_user.id) if current_user else "admin"
    )
    await advanced_crud.create_ai_usage_log(db, log_entry)
    
    return {
        "status": "success",
        "content_type": request.content_type,
        "suggestions": suggestions,
        "generated_at": datetime.utcnow().isoformat(),
        "model": log_entry.model,
        "tokens_used": usage["tokens"] 
    }


@router.get("/ai/models")
async def get_ai_models(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_admin)
):
    """Get AI usage stats."""
    return await analytics_service.get_ai_models_stats(db)


@router.get("/ai/usage")
async def get_ai_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Real AI Usage history from DB."""
    return await analytics_service.get_ai_usage_history(db)
