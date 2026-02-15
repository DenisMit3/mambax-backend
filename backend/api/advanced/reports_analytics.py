# Advanced API - Reports & Analytics

from fastapi import APIRouter, Depends, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from backend.database import get_db
from backend.models import User
from backend.models.advanced import CustomReport
from backend.crud import advanced as advanced_crud
from backend.services.analytics import analytics_service
from backend.api.advanced.deps import get_current_admin, ReportGenerateRequest

router = APIRouter()


@router.get("/reports")
async def get_saved_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    reports = await advanced_crud.get_custom_reports(db)
    
    mapped_reports = []
    for r in reports:
        mapped_reports.append({
            "id": r.id,
            "name": r.name,
            "type": r.report_type,
            "schedule": r.schedule or "On Demand",
            "last_run": r.last_run_at,
            "created_by": r.created_by,
            "configuration": r.configuration
        })
        
    return {
        "reports": mapped_reports,
        "templates": [
            {"id": "t1", "name": "User Growth", "type": "analytics"},
            {"id": "t2", "name": "Revenue", "type": "financial"},
            {"id": "t3", "name": "Engagement", "type": "analytics"},
            {"id": "t4", "name": "System Health", "type": "technical"},
            {"id": "t5", "name": "Marketing ROI", "type": "marketing"}
        ]
    }


@router.post("/reports/generate")
async def generate_report(
    req: ReportGenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    new_report = CustomReport(
        name=f"{req.report_type} Report - {datetime.utcnow().date()}",
        report_type=req.report_type,
        created_by="admin",
        schedule=req.schedule,
        configuration={
            "period": req.period,
            "custom_sql": req.custom_sql,
            "parameters": req.parameters
        }
    )
    saved = await advanced_crud.create_custom_report(db, new_report)
    
    try:
        from backend.services.reporting import generate_report_task as _generate_report_task
        background_tasks.add_task(_generate_report_task, saved.id)
    except ImportError:
        pass

    return {
        "status": "pending",
        "report": {
            "id": saved.id,
            "name": saved.name,
            "type": saved.report_type,
            "schedule": saved.schedule,
            "configuration": saved.configuration,
            "created_at": saved.created_at
        },
        "report_id": saved.id,
        "type": req.report_type,
        "period": req.period,
        "estimated_time_sec": 30,
        "download_url": None
    }


# --- Analytics stubs ---

@router.get("/localization/stats")
async def get_localization_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    return await analytics_service.get_localization_stats(db)


@router.get("/performance/budget")
async def get_performance_budget(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Real performance budget from collected Web Vitals."""
    return await analytics_service.get_performance_budget(db)


@router.post("/performance/vitals")
async def log_performance_vitals(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Receive analytics beacon."""
    data = await request.json()
    await analytics_service.log_web_vital(db, data)
    return {"status": "ok"}


@router.get("/performance/pwa")
async def get_pwa_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Real PWA stats from System Metrics."""
    return await analytics_service.get_pwa_analytics(db)


@router.get("/accessibility/audit")
async def get_accessibility_audit(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    return await analytics_service.get_accessibility_audit(db)


@router.get("/recommendations/dashboard")
async def get_recommendations_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    return await analytics_service.get_recommendation_metrics(db)


@router.get("/calls/analytics")
async def get_call_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    return await analytics_service.get_call_analytics(db)


@router.get("/web3/stats")
async def get_web3_stats(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_admin)
):
    """Stats for NFT, Metaverse, and Web3 integration."""
    return await analytics_service.get_web3_stats(db)
