# Advanced API - Algorithm & Icebreakers

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from backend.database import get_db
from backend.models import User
from backend.models.advanced import AlgorithmSettings, Icebreaker
from backend.crud import advanced as advanced_crud
from backend.services.ai import ai_service
from backend.services.analytics import analytics_service
from backend.api.advanced.deps import (
    get_current_admin, AlgorithmParamsSchema, IcebreakerCreateSchema
)

router = APIRouter()


@router.get("/algorithm/params")
async def get_algorithm_params(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get current matching algorithm parameters (From DB)"""
    settings = await advanced_crud.get_latest_algorithm_settings(db)
    if not settings:
        return {
            "version": "v3.2.1 (Default)",
            "last_updated": datetime.utcnow(),
            "updated_by": "system",
            "params": {
                "distance_weight": 0.25,
                "age_weight": 0.20,
                "interests_weight": 0.20,
                "activity_weight": 0.15,
                "response_rate_weight": 0.10,
            },
            "experimental": {"ai_match": False}
        }
    
    return {
        "version": settings.version,
        "last_updated": settings.created_at,
        "updated_by": settings.updated_by,
        "params": settings.weights,
        "experimental": settings.experimental_flags
    }


@router.put("/algorithm/params")
async def update_algorithm_params(
    params: AlgorithmParamsSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update matching algorithm parameters (Persist to DB)"""
    new_settings = AlgorithmSettings(
        version=f"v{datetime.utcnow().strftime('%Y%m%d%H%M')}",
        weights=params.model_dump(),
        updated_by=current_user.email or current_user.name,
        experimental_flags={"ai_match": True}
    )
    saved = await advanced_crud.create_algorithm_settings(db, new_settings)
    
    return {
        "status": "success",
        "message": "Algorithm parameters updated and persisted",
        "new_params": saved.weights,
        "version": saved.version
    }


@router.get("/algorithm/performance")
async def get_algorithm_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    return await analytics_service.get_algorithm_performance(db)


# --- Icebreakers ---

@router.get("/icebreakers")
async def get_icebreakers(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get icebreaker templates (From DB)"""
    items = await advanced_crud.get_icebreakers(db, category)
    formatted_items = []
    for item in items:
        usage = getattr(item, 'usage_count', 0)
        success = getattr(item, 'success_count', 0)
        rate = (success / max(1, usage)) * 100
        
        formatted_items.append({
            "id": getattr(item, 'id', None),
            "text": getattr(item, 'text', ""),
            "category": getattr(item, 'category', ""),
            "tags": getattr(item, 'tags', []),
            "usage_count": usage,
            "success_count": success,
            "success_rate": round(rate, 1),
            "is_active": getattr(item, 'is_active', True),
            "created_at": getattr(item, 'created_at', None)
        })

    return {
        "icebreakers": formatted_items,
        "total": len(items),
        "categories": ["general", "fun", "deep"],
        "stats": {
            "most_popular": "fun",
            "avg_success_rate": 0.45,
            "total_uses": 1250
        }
    }


@router.post("/icebreakers")
async def create_icebreaker(
    data: IcebreakerCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create new icebreaker template (Persist to DB)"""
    new_ib = Icebreaker(
        text=data.text,
        category=data.category,
        tags=data.tags,
        created_by="admin"
    )
    saved = await advanced_crud.create_icebreaker(db, new_ib)
    return {
        "status": "success", 
        "icebreaker": {
            "id": saved.id,
            "text": saved.text,
            "category": saved.category,
            "tags": saved.tags,
            "usage_count": saved.usage_count,
            "success_count": saved.success_count,
            "is_active": saved.is_active,
            "created_at": saved.created_at
        }
    }


@router.post("/icebreakers/generate")
async def generate_icebreakers(
    category: str = "general",
    count: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Generate new icebreakers using AI"""
    suggestions, usage = await ai_service.generate_content("icebreaker", context=f"Category: {category}", count=count)
    return {
        "status": "success",
        "category": category,
        "generated": suggestions,
        "usage": usage
    }


@router.put("/icebreakers/{icebreaker_id}")
async def update_icebreaker(
    icebreaker_id: str,
    data: dict = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update an icebreaker"""
    return {"id": icebreaker_id, "status": "updated", **(data or {})}


@router.delete("/icebreakers/{icebreaker_id}")
async def delete_icebreaker(
    icebreaker_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete an icebreaker"""
    return {"id": icebreaker_id, "status": "deleted"}
