
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
from typing import Dict, Any, List

from backend.models.advanced import (
    WebVitalLog, TranslationKey, TranslationValue, 
    WalletConnection, SystemStat, AIUsageLog,
    CallSession, AccessibilityReport, RecommendationMetric
)
from backend.models import User
from backend.models.interaction import Match, Swipe
from backend.models.chat import Message

class AnalyticsService:
    async def get_dashboard_summary(self, db: AsyncSession) -> Dict[str, Any]:
        """Get high-level counters for dashboard badges."""
        # This can be optimized by caching
        
        # Active Users (last 24h) - simplified to total for now or query field
        users_count = await db.scalar(select(func.count(User.id)))
        
        # AI cost today
        today = datetime.utcnow().date()
        ai_cost = await db.scalar(
            select(func.sum(AIUsageLog.cost)).where(func.date(AIUsageLog.timestamp) == today)
        ) or 0.0
        
        return {
             "total_users": users_count,
             "ai_cost_today": ai_cost,
        }

    async def get_performance_budget(self, db: AsyncSession) -> Dict[str, Any]:
        """Aggregate Web Vitals."""
        # Calculate averages for LCP, CLS, FID
        metrics = ["LCP", "FID", "CLS"]
        results = {}
        
        for m in metrics:
            avg_val = await db.scalar(
                select(func.avg(WebVitalLog.value))
                .where(WebVitalLog.metric_name == m)
            ) or 0.0
            
            # Determine status based on Google standards
            status = "pass"
            if m == "LCP" and avg_val > 2.5: status = "needs-improvement"
            if m == "CLS" and avg_val > 0.1: status = "needs-improvement"
            
            results[m.lower()] = {
                "value": round(avg_val, 3),
                "budget": 2.5 if m=="LCP" else (0.1 if m=="CLS" else 100),
                "status": status
            }
            
        # Calculate overall score based on Core Web Vitals (LCP, FID, CLS)
        # Simple scoring: 100 start, deduct for failing metrics
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
                 # These would typically come from CI/CD pipeline logs, not runtime DB
                 # keeping mocks or storing in SystemStat
                "js_total_kb": 250, "js_budget_kb": 300,
                "css_total_kb": 45, "css_budget_kb": 50,
                "images_avg_kb": 120, "images_budget_kb": 200
            },
            "trend": [] # Pending implementation of time-series
        }

    async def get_localization_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Stats on translation coverage."""
        total_keys = await db.scalar(select(func.count(TranslationKey.id))) or 0
        
        # Group by language
        # select language_code, count(*) from translation_values group by language_code
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

    async def get_web3_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Real web3 stats."""
        total_wallets = await db.scalar(select(func.count(WalletConnection.id)))
        
    async def get_web3_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Real web3 stats."""
        from backend.services.web3_client import web3_client
        
        total_wallets = await db.scalar(select(func.count(WalletConnection.id)))
        
        # Group by provider
        providers = await db.execute(
            select(WalletConnection.provider, func.count(WalletConnection.id))
            .group_by(WalletConnection.provider)
        )
        provider_stats = {row[0]: row[1] for row in providers.all()}
        
        # Check Blockchain Node Status
        # We run this in a thread because Web3.py HTTPProvider is detailed as blocking
        import asyncio
        loop = asyncio.get_event_loop()
        latest_block = await loop.run_in_executor(None, lambda: web3_client.w3.eth.block_number if web3_client.w3.is_connected() else 0)
        
        return {
            "wallet_connect": {
                "total_connected": total_wallets,
                "metamask_share": provider_stats.get("metamask", 0),
                "phantom_share": provider_stats.get("phantom", 0)
            },
            "blockchain_node": {
                "status": "connected" if latest_block > 0 else "disconnected",
                "provider": web3_client.provider_url,
                "latest_block": latest_block,
                "chain": "ethereum (mainnet)"
            },
            # NFT Indexing requires external service (Graph/Alchemy)
            # But we serve real node connectivity status now.
            "nft_collectibles": {
                "total_minted": 0, 
                "floor_price_usd": 0.0,
            }
        }
    
    async def log_web_vital(self, db: AsyncSession, data: Dict[str, Any]):
        log = WebVitalLog(
            metric_name=data.get("name"),
            value=data.get("value"),
            path=data.get("path", "/"),
            rating=data.get("rating"),
            user_agent=data.get("user_agent")
        )
        db.add(log)
        await db.commit()

    async def get_ai_models_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Stats for AI usage per model."""
        today = datetime.utcnow().date()
        
        # Requests and Cost per model
        stmt = select(
            AIUsageLog.model, 
            func.count(AIUsageLog.id), 
            func.sum(AIUsageLog.cost),
            func.avg(AIUsageLog.tokens_used) # Proxy for complexity/latency correlation
        ).where(func.date(AIUsageLog.timestamp) == today).group_by(AIUsageLog.model)
        
        results = await db.execute(stmt)
        models_data = []
        
        total_requests = 0
        total_cost = 0.0
        
        for row in results.all():
            model, count, cost, avg_tokens = row
            models_data.append({
                "id": model,
                "name": model,
                "provider": "OpenAI" if "gpt" in model else "Other",
                "status": "active",
                "requests_today": count,
                "avg_latency_ms": int(avg_tokens * 0.1) if avg_tokens else 0, # Rough proxy
                "cost_today_usd": round(cost, 2)
            })
            total_requests += count
            total_cost += cost
            
        return {
            "models": models_data,
            "usage_summary": {
                "total_requests_today": total_requests,
                "total_cost_today": round(total_cost, 2)
            }
        }

    async def get_algorithm_performance(self, db: AsyncSession) -> Dict[str, Any]:
        """Match rate based on real swipes."""
        # Match Rate = Total Matches / Total Likes
        total_likes = await db.scalar(select(func.count(Swipe.id)).where(Swipe.action == "like")) or 0
        total_matches = await db.scalar(select(func.count(Match.id))) or 0
        
        match_rate = (total_matches / max(1, total_likes)) * 100
        
        # Conversation Rate = Matches with messages / Total Matches
        # Using a subquery for distinct matches in messages
        active_conversations = await db.scalar(
            select(func.count(func.distinct(Message.match_id)))
        ) or 0
        
        conv_rate = (active_conversations / max(1, total_matches)) * 100
        
        return {
            "metrics": {
                "match_rate": round(match_rate, 1),
                "conversation_rate": round(conv_rate, 1)
            },
            # History requires time-series aggregation, let's return today's point
            "history": [{"date": datetime.utcnow().date().isoformat(), "match_rate": round(match_rate, 1)}]
        }

    async def get_call_analytics(self, db: AsyncSession) -> Dict[str, Any]:
        """Stats from CallSession table."""
        total_calls = await db.scalar(select(func.count(CallSession.id))) or 0
        
        video_calls = await db.scalar(
            select(func.count(CallSession.id)).where(CallSession.call_type == "video")
        ) or 0
        
        completed_calls = await db.scalar(
            select(func.count(CallSession.id)).where(CallSession.status == "completed")
        ) or 0
        
        # Avg duration
        # SQLite vs Postgres time diff syntax differs, doing simple Avg in Python for cross-compatibility safe
        # Or just fetching duration column if we had it. We have start/end.
        # Let's fetch last 100 calls and calc avg in app memory to be safe across DBs
        last_calls = await db.execute(
            select(CallSession).where(CallSession.end_time.is_not(None)).order_by(CallSession.start_time.desc()).limit(100)
        )
        durations = []
        for call in last_calls.scalars().all():
            if call.end_time and call.start_time:
                durations.append((call.end_time - call.start_time).total_seconds() / 60)
        
        avg_duration = sum(durations) / max(1, len(durations))

        return {
            "summary": {
                "total_calls": total_calls, 
                "video_calls": video_calls,
                "voice_calls": total_calls - video_calls,
                "avg_duration_min": round(avg_duration, 1),
                "completion_rate": int((completed_calls / max(1, total_calls)) * 100)
            },
            "quality": {"excellent": 100, "good": 0}, # Placeholder, we don't store quality rating yet
            "by_day": [] # Requires aggregation
        }

    async def get_accessibility_audit(self, db: AsyncSession) -> Dict[str, Any]:
        """Latest accessibility report."""
        report = await db.scalar(
            select(AccessibilityReport).order_by(AccessibilityReport.created_at.desc()).limit(1)
        )
        
        if not report:
            return {"overall_score": 0, "wcag_level": "N/A", "issues": {}}
            
        return {
            "overall_score": report.overall_score,
            "wcag_level": report.wcag_level,
            "last_audit": report.created_at.isoformat(),
            "issues": report.issues
        }

    async def get_recommendation_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        """Latest recommendation engine metrics."""
        metric = await db.scalar(
            select(RecommendationMetric).order_by(RecommendationMetric.created_at.desc()).limit(1)
        )
        
        if not metric:
            return {
                "engine_status": "optimizing",
                "metrics": {"precision": 0, "recall": 0, "ndcg": 0}
            }
            
        return {
            "engine_status": "active",
            "model_version": metric.model_version,
            "last_retrain": metric.created_at.isoformat(),
            "metrics": {
                "precision": metric.precision,
                "recall": metric.recall,
                "ndcg": metric.ndcg
            },
            # Mock data freshness as it's hard to measure from DB directly
            "data_freshness": {
                "user_features": "real-time", "item_embeddings": "24h"
            }
        }

    async def get_ai_usage_history(self, db: AsyncSession, days: int = 7) -> Dict[str, Any]:
        """Historical AI usage analytics."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # 1. Group by Date
        # select date(timestamp), count(*), sum(tokens), sum(cost) from ai_usage_logs ...
        daily_stmt = select(
            func.date(AIUsageLog.timestamp).label("date"),
            func.count(AIUsageLog.id),
            func.sum(AIUsageLog.tokens_used),
            func.sum(AIUsageLog.cost)
        ).where(AIUsageLog.timestamp >= start_date)\
         .group_by(func.date(AIUsageLog.timestamp))\
         .order_by(func.date(AIUsageLog.timestamp))
        
        daily_results = await db.execute(daily_stmt)
        by_day = []
        for row in daily_results.all():
            # row: date, count, tokens, cost
            d_str = row[0] # date object or string depending on driver
            if hasattr(d_str, 'strftime'): 
                 d_str = d_str.strftime("%Y-%m-%d")
            else:
                 d_str = str(d_str)

            by_day.append({
                "date": d_str,
                "requests": row[1],
                "tokens": row[2] or 0,
                "cost": round(row[3] or 0.0, 4)
            })

        # 2. Group by Feature
        feature_stmt = select(
            AIUsageLog.feature,
            func.count(AIUsageLog.id),
            func.sum(AIUsageLog.cost)
        ).where(AIUsageLog.timestamp >= start_date)\
         .group_by(AIUsageLog.feature)
         
        feature_results = await db.execute(feature_stmt)
        by_feature = []
        for row in feature_results.all():
            by_feature.append({
                "feature": row[0],
                "count": row[1],
                "cost": round(row[2] or 0.0, 4)
            })

        return {
            "period": f"{days}d",
            "by_day": by_day,
            "by_feature": by_feature
        }

    async def get_pwa_analytics(self, db: AsyncSession) -> Dict[str, Any]:
        """PWA installation and usage stats from SystemStat."""
        # Assuming we have a scheduled task or event reporting that populates SystemStat with 'pwa_install'
        # collecting aggregates.
        
        # Fetch latest metrics
        stats = await db.execute(
            select(SystemStat.metric_type, func.sum(SystemStat.value))
            .where(SystemStat.metric_type.in_(['pwa_install_ios', 'pwa_install_android', 'pwa_session']))
            .group_by(SystemStat.metric_type)
        )
        data = {row[0]: row[1] for row in stats.all()}
        
        ios_installs = int(data.get('pwa_install_ios', 0))
        android_installs = int(data.get('pwa_install_android', 0))
        total = ios_installs + android_installs
        
        # Calculate percentages
        ios_pct = (ios_installs / max(1, total)) * 100
        android_pct = (android_installs / max(1, total)) * 100
        
        return {
            "installations": {
                "total": total,
                "this_month": 0, # Requires time filter, keep 0 for accuracy if not implementing complex query
                "growth": 0
            },
            "engagement": {
                "daily_active": 0, # Need DAU PWA specific tracking
                "push_enabled": 0 
            },
            "by_platform": [
                {"platform": "iOS", "installs": ios_installs, "percentage": round(ios_pct, 1)},
                {"platform": "Android", "installs": android_installs, "percentage": round(android_pct, 1)}
            ],
            "offline_usage": {
                 # No data for offline yet
                "offline_sessions": 0, 
                "sync_success_rate": 0
            }
        }

analytics_service = AnalyticsService()
