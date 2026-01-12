from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional, Dict, Any
from backend.models.advanced import AlgorithmSettings, Icebreaker, DatingEvent, Partner, CustomReport, AIUsageLog

# Algorithm Settings
async def get_latest_algorithm_settings(db: AsyncSession) -> Optional[AlgorithmSettings]:
    query = select(AlgorithmSettings).order_by(AlgorithmSettings.created_at.desc()).limit(1)
    result = await db.execute(query)
    return result.scalars().first()

async def create_algorithm_settings(db: AsyncSession, settings: AlgorithmSettings) -> AlgorithmSettings:
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    return settings

# Icebreakers
async def get_icebreakers(db: AsyncSession, category: Optional[str] = None, limit: int = 100) -> List[Icebreaker]:
    query = select(Icebreaker).where(Icebreaker.is_active == True)
    if category:
        query = query.where(Icebreaker.category == category)
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def create_icebreaker(db: AsyncSession, icebreaker: Icebreaker) -> Icebreaker:
    db.add(icebreaker)
    await db.commit()
    await db.refresh(icebreaker)
    return icebreaker

# Events
async def get_events(db: AsyncSession, status: Optional[str] = None) -> List[DatingEvent]:
    query = select(DatingEvent)
    if status:
        query = query.where(DatingEvent.status == status)
    result = await db.execute(query)
    return result.scalars().all()

async def create_event(db: AsyncSession, event: DatingEvent) -> DatingEvent:
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

# Partners
async def get_partners(db: AsyncSession) -> List[Partner]:
    query = select(Partner).where(Partner.status == 'active')
    result = await db.execute(query)
    return result.scalars().all()

async def create_partner(db: AsyncSession, partner: Partner) -> Partner:
    db.add(partner)
    await db.commit()
    await db.refresh(partner)
    return partner

# Reports
async def get_custom_reports(db: AsyncSession) -> List[CustomReport]:
    query = select(CustomReport).order_by(CustomReport.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

async def create_custom_report(db: AsyncSession, report: CustomReport) -> CustomReport:
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report

# AI Usage Logs
async def create_ai_usage_log(db: AsyncSession, log: AIUsageLog) -> AIUsageLog:
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
