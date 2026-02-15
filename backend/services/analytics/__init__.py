"""
Analytics Service Package
=========================
Реэкспорт всех публичных символов для обратной совместимости.
"""

from backend.services.analytics.dashboard import (
    get_dashboard_summary,
    get_performance_budget,
    get_localization_stats,
    log_web_vital,
)
from backend.services.analytics.advanced import (
    get_ai_models_stats,
    get_algorithm_performance,
    get_call_analytics,
    get_accessibility_audit,
    get_recommendation_metrics,
    get_ai_usage_history,
    get_web3_stats,
    get_pwa_analytics,
)


class AnalyticsService:
    """Wrapper class preserving backward compatibility with analytics_service singleton."""
    
    # Dashboard
    async def get_dashboard_summary(self, db):
        return await get_dashboard_summary(db)
    
    async def get_performance_budget(self, db):
        return await get_performance_budget(db)
    
    async def get_localization_stats(self, db):
        return await get_localization_stats(db)
    
    async def log_web_vital(self, db, data):
        return await log_web_vital(db, data)
    
    # Advanced
    async def get_ai_models_stats(self, db):
        return await get_ai_models_stats(db)
    
    async def get_algorithm_performance(self, db):
        return await get_algorithm_performance(db)
    
    async def get_call_analytics(self, db):
        return await get_call_analytics(db)
    
    async def get_accessibility_audit(self, db):
        return await get_accessibility_audit(db)
    
    async def get_recommendation_metrics(self, db):
        return await get_recommendation_metrics(db)
    
    async def get_ai_usage_history(self, db, days=7):
        return await get_ai_usage_history(db, days)
    
    async def get_web3_stats(self, db):
        return await get_web3_stats(db)
    
    async def get_pwa_analytics(self, db):
        return await get_pwa_analytics(db)


# Singleton
analytics_service = AnalyticsService()

__all__ = [
    "AnalyticsService",
    "analytics_service",
    "get_dashboard_summary",
    "get_performance_budget",
    "get_localization_stats",
    "log_web_vital",
    "get_ai_models_stats",
    "get_algorithm_performance",
    "get_call_analytics",
    "get_accessibility_audit",
    "get_recommendation_metrics",
    "get_ai_usage_history",
    "get_web3_stats",
    "get_pwa_analytics",
]
