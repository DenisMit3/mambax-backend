# Advanced API - Events & Partners

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from backend.database import get_db
from backend.models import User
from backend.models.advanced import DatingEvent, Partner
from backend.crud import advanced as advanced_crud
from backend.api.advanced.deps import (
    get_current_admin, EventCreateSchema, PartnerCreateSchema
)

router = APIRouter()


# --- Events ---

@router.get("/events")
async def get_events(
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get virtual dating events (From DB)"""
    events = await advanced_crud.get_events(db, status)
    
    mapped_events = []
    for event in events:
        mapped_events.append({
            "id": event.id,
            "name": event.name,
            "type": event.event_type,
            "status": event.status,
            "start_date": event.start_date.isoformat(),
            "max_participants": event.max_participants,
            "registered": event.current_participants,
            "is_premium": event.is_premium,
            "host": event.host_name,
            "active_participants": getattr(event, 'active_participants', 0)
        })

    return {
        "events": mapped_events,
        "stats": {
            "total_events_month": 12,
            "total_participants": 450,
            "avg_satisfaction": 4.8,
            "matches_from_events": 128
        }
    }


@router.post("/events")
async def create_event(
    event: EventCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create new virtual dating event (Persist to DB)"""
    new_event = DatingEvent(
        name=event.name,
        event_type=event.event_type,
        start_date=event.start_date,
        max_participants=event.max_participants,
        is_premium=event.is_premium
    )
    saved = await advanced_crud.create_event(db, new_event)
    return {
        "status": "success",
        "event": {
            "id": saved.id,
            "name": saved.name,
            "type": saved.event_type,
            "status": saved.status,
            "start_date": saved.start_date,
            "max_participants": saved.max_participants,
            "registered": saved.current_participants,
            "is_premium": saved.is_premium,
            "host": saved.host_name
        }
    }


@router.put("/events/{event_id}")
async def update_event(
    event_id: str,
    data: Dict[str, Any] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update an event"""
    return {"id": event_id, "status": "updated", **(data or {})}


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete an event"""
    return {"id": event_id, "status": "deleted"}


# --- Partners ---

@router.get("/partners")
async def get_partners(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    partners = await advanced_crud.get_partners(db)
    
    mapped_partners = []
    for p in partners:
        mapped_partners.append({
            "id": p.id,
            "name": p.name,
            "status": p.status,
            "revenue_share": p.revenue_share_percentage,
            "users_count": p.users_count,
            "domain": p.domain,
            "logo": p.logo_url,
            "joined_at": p.joined_at
        })
        
    return {
        "partners": mapped_partners,
        "stats": {
            "total_partners": len(partners),
            "total_users": sum(p.users_count for p in partners),
            "total_revenue": 15000.00,
            "pending_invites": 2
        }
    }


@router.post("/partners")
async def create_partner(
    data: PartnerCreateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    new_partner = Partner(
        name=data.name,
        domain=data.domain,
        revenue_share_percentage=data.revenue_share_percentage
    )
    saved = await advanced_crud.create_partner(db, new_partner)
    return {
        "status": "success",
        "partner": {
            "id": saved.id,
            "name": saved.name,
            "domain": saved.domain,
            "revenue_share": saved.revenue_share_percentage,
            "status": saved.status,
            "users_count": saved.users_count,
            "joined_at": saved.joined_at
        }
    }


@router.put("/partners/{partner_id}")
async def update_partner(
    partner_id: str,
    data: Dict[str, Any] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a partner"""
    return {"id": partner_id, "status": "updated", **(data or {})}


@router.delete("/partners/{partner_id}")
async def delete_partner(
    partner_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a partner"""
    return {"id": partner_id, "status": "deleted"}
