from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.api.interaction import get_current_user_id
from backend.schemas.safety import BlockCreate, ReportCreate, BlockResponse, ReportResponse
from backend.crud_pkg import safety as crud_safety
from uuid import UUID

router = APIRouter(prefix="/safety", tags=["Safety"])

@router.post("/block", response_model=BlockResponse)
async def block_user(
    block_data: BlockCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    if block_data.user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
        
    await crud_safety.block_user(db, current_user_id, block_data.user_id, block_data.reason)
    return BlockResponse(success=True, message="User blocked")

@router.post("/report", response_model=ReportResponse)
async def report_user(
    report_data: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    if report_data.user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
        
    report = await crud_safety.create_report(
        db, 
        current_user_id, 
        report_data.user_id, 
        report_data.reason, 
        report_data.description
    )
    return ReportResponse(success=True, report_id=report.id, message="Report submitted")

# --- Admin Endpoints ---

@router.get("/admin/queue")
async def get_moderation_queue(
    status: str = "pending",
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    # current_admin: User = Depends(get_current_admin) # TODO: Add admin dependency check
):
    """
    Get items requiring moderation. 
    Combines User Reports and Automated Content Flags.
    """
    from sqlalchemy import select, desc
    from backend.models.moderation import ModerationLog
    from backend.models.interaction import Report

    # 1. Get User Reports
    reports_stmt = select(Report).where(Report.status == status).limit(limit)
    reports = await db.execute(reports_stmt)
    
    # 2. Get Auto-Flagged Content that hasn't been reviewed
    # In a real system, we'd have a 'review_status' on ModerationLog or a separate queue table
    # For now, let's just fetch logs flagged as 'flagged' for demo
    logs_stmt = select(ModerationLog).where(
        ModerationLog.result == "flagged"
    ).order_by(desc(ModerationLog.created_at)).limit(limit)
    logs = await db.execute(logs_stmt)

    items = []
    
    for r in reports.scalars().all():
        items.append({
            "id": r.id,
            "type": "report",
            "reason": r.reason,
            "created_at": r.created_at,
            "priority": "high",
            "details": r.description
        })
        
    for l in logs.scalars().all():
        items.append({
            "id": l.id,
            "type": "auto_flag",
            "reason": l.details,
            "created_at": l.created_at,
            "priority": "medium",
            "content_type": l.content_type
        })
        
    return {"queue": items, "total": len(items)}

@router.post("/admin/resolve/{item_id}")
async def resolve_moderation_item(
    item_id: UUID,
    action: str, # dismiss, ban_user, delete_content
    notes: str = None,
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from backend.models.interaction import Report
    from backend.crud_pkg import safety as crud_safety
    
    # Check if it's a report
    report = await db.get(Report, item_id)
    if report:
        report.status = "resolved"
        # If action is ban, call block logic
        if action == "ban_user":
             # Logic to ban user (add to BannedUser table)
             pass
        await db.commit()
        return {"status": "success", "message": f"Report resolved with action {action}"}
        
    # Check if it's a moderation log (not fully implemented 'resolution' for logs yet without a status column)
    return {"status": "success", "message": "Item processed"}

