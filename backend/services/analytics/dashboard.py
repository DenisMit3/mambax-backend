"""
Analytics - Dashboard metrics
=============================
Summary, performance budget, localization stats.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Dict, Any

from backend.models.advanced import (
    WebVitalLog, TranslationKey, TranslationValue, AIUsageLog
)
from backend.models import User


async def get_dashboard_summary(db: AsyncSession) -> Dict[str, Any]:
    """Get high-level counters for dashboard badges."""
    users_count = await db.scalar(select(func.count(User.id)))
    
    today = datetime.utcnow().date()
    ai_cost = await db.scalar(
        select(func.sum(AIUsageLog.cost)).where(func.date(AIUsageLog.timestamp) == today)
    ) or 0.0
    
    return {
         "total_users": users_count,
         "ai_cost_today": ai_cost,
    }


async def get_performance_budget(db: AsyncSession) -> Dict[str, Any]:
    """Aggregate Web Vitals."""
    metrics = ["LCP", "FID", "CLS"]
    results = {}
    
    for m in metrics:
        avg_val = await db.scalar(
            select(func.avg(WebVitalLog.value))
            .where(WebVitalLog.metric_name == m)
        ) or 0.0
        
        status = "pass"
        if m == "LCP" and avg_val > 2.5: status = "needs-improvement"
        if m == "CLS" and avg_val > 0.1: status = "needs-improvement"
        
        results[m.lower()] = {
            "value": round(avg_val, 3),
            "budget": 2.5 if m=="LCP" else (0.1 if m=="CLS" else 100),
            "status": status
        }
        
    score = 100
    metrics_count = 0
    
    for m in metrics:
        val = results.get(m.lower(), {}).get("value", 0)
        if m == "LCP" and val > 2.5: score -= 20
        if m == "CLS" and val > 0.1: score -= 20
        if m == "FID" and val > 100: score -= 20
        metrics_count += 1
        
    return {
        "overall_score": score if metrics_count > 0 else 100,
        "metrics": results,
        "bundle_size": {
            "js_total_kb": 250, "js_budget_kb": 300,
            "css_total_kb": 45, "css_budget_kb": 50,
            "images_avg_kb": 120, "images_budget_kb": 200
        },
        "trend": []
    }


async def get_localization_stats(db: AsyncSession) -> Dict[str, Any]:
    """Stats on translation coverage."""
    total_keys = await db.scalar(select(func.count(TranslationKey.id))) or 0
    
    result = await db.execute(
        select(TranslationValue.language_code, func.count(TranslationValue.id))
        .group_by(TranslationValue.language_code)
    )
    
    languages_data = []
    for lang, count in result.all():
        percentage = int((count / max(1, total_keys)) * 100)
        languages_data.append({
            "code": lang,
            "name": lang.upper(),
            "completion": percentage,
            "missing": total_keys - count
        })
        
    return {
        "languages": languages_data,
        "total_keys": total_keys
    }


async def log_web_vital(db: AsyncSession, data: Dict[str, Any]):
    """Log a web vital metric."""
    log = WebVitalLog(
        metric_name=data.get("name"),
        value=data.get("value"),
        path=data.get("path", "/"),
        rating=data.get("rating"),
        user_agent=data.get("user_agent")
    )
    db.add(log)
    await db.commit()
