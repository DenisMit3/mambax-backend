from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.models.interaction import Block, Report, Match
from backend.services.moderation import ModerationService

async def block_user(db: AsyncSession, blocker_id: UUID, blocked_id: UUID, reason: str = None) -> bool:
    # Check if already blocked
    stmt = select(Block).where(
        and_(
            Block.blocker_id == blocker_id,
            Block.blocked_id == blocked_id
        )
    )
    result = await db.execute(stmt)
    if result.scalars().first():
        return True # Already blocked
        
    block = Block(blocker_id=blocker_id, blocked_id=blocked_id, reason=reason)
    db.add(block)
    
    # Also invalidate any matches
    match_stmt = select(Match).where(
        and_(
            Match.is_active == True,
            ((Match.user1_id == blocker_id) & (Match.user2_id == blocked_id)) |
            ((Match.user1_id == blocked_id) & (Match.user2_id == blocker_id))
        )
    )
    matches = (await db.execute(match_stmt)).scalars().all()
    for m in matches:
        m.is_active = False
        
    await db.commit()
    return True

async def create_report(db: AsyncSession, reporter_id: UUID, reported_id: UUID, reason: str, description: str = None):
    report = Report(
        reporter_id=reporter_id,
        reported_id=reported_id,
        reason=reason,
        description=ModerationService.sanitize_text(description) if description else None
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report

async def is_blocked(db: AsyncSession, user1_id: UUID, user2_id: UUID) -> bool:
    """Check if there is a block between two users in any direction"""
    stmt = select(Block).where(
        ((Block.blocker_id == user1_id) & (Block.blocked_id == user2_id)) |
        ((Block.blocker_id == user2_id) & (Block.blocked_id == user1_id))
    )
    result = await db.execute(stmt)
    return result.scalars().first() is not None
