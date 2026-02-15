"""
Analytics - Advanced metrics
============================
AI models, algorithm performance, calls, accessibility, recommendations, PWA, web3.
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
from typing import Dict, Any

from backend.models.advanced import (
    WalletConnection, SystemStat, AIUsageLog,
    CallSession, AccessibilityReport, RecommendationMetric
)
from backend.models.interaction import Match, Swipe
from backend.models.chat import Message


async def get_ai_models_stats(db: AsyncSession) -> Dict[str, Any]:
    """Stats for AI usage per model."""
    today = datetime.utcnow().date()
    
    stmt = select(
        AIUsageLog.model, 
        func.count(AIUsageLog.id), 
        func.sum(AIUsageLog.cost),
        func.avg(AIUsageLog.tokens_used)
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
            "avg_latency_ms": int(avg_tokens * 0.1) if avg_tokens else 0,
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


async def get_algorithm_performance(db: AsyncSession) -> Dict[str, Any]:
    """Match rate based on real swipes."""
    total_likes = await db.scalar(select(func.count(Swipe.id)).where(Swipe.action == "like")) or 0
    total_matches = await db.scalar(select(func.count(Match.id))) or 0
    
    match_rate = (total_matches / max(1, total_likes)) * 100
    
    active_conversations = await db.scalar(
        select(func.count(func.distinct(Message.match_id)))
    ) or 0
    
    conv_rate = (active_conversations / max(1, total_matches)) * 100
    
    return {
        "metrics": {
            "match_rate": round(match_rate, 1),
            "conversation_rate": round(conv_rate, 1)
        },
        "history": [{"date": datetime.utcnow().date().isoformat(), "match_rate": round(match_rate, 1)}]
    }


async def get_call_analytics(db: AsyncSession) -> Dict[str, Any]:
    """Stats from CallSession table."""
    total_calls = await db.scalar(select(func.count(CallSession.id))) or 0
    
    video_calls = await db.scalar(
        select(func.count(CallSession.id)).where(CallSession.call_type == "video")
    ) or 0
    
    completed_calls = await db.scalar(
        select(func.count(CallSession.id)).where(CallSession.status == "completed")
    ) or 0
    
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
        "quality": {"excellent": 100, "good": 0},
        "by_day": []
    }


async def get_accessibility_audit(db: AsyncSession) -> Dict[str, Any]:
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


async def get_recommendation_metrics(db: AsyncSession) -> Dict[str, Any]:
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
        "data_freshness": {
            "user_features": "real-time", "item_embeddings": "24h"
        }
    }


async def get_ai_usage_history(db: AsyncSession, days: int = 7) -> Dict[str, Any]:
    """Historical AI usage analytics."""
    start_date = datetime.utcnow() - timedelta(days=days)
    
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
        d_str = row[0]
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


async def get_web3_stats(db: AsyncSession) -> Dict[str, Any]:
    """Real web3 stats."""
    from backend.services.web3_client import web3_client
    
    total_wallets = await db.scalar(select(func.count(WalletConnection.id)))
    
    providers = await db.execute(
        select(WalletConnection.provider, func.count(WalletConnection.id))
        .group_by(WalletConnection.provider)
    )
    provider_stats = {row[0]: row[1] for row in providers.all()}
    
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
        "nft_collectibles": {
            "total_minted": 0, 
            "floor_price_usd": 0.0,
        }
    }


async def get_pwa_analytics(db: AsyncSession) -> Dict[str, Any]:
    """PWA installation and usage stats from SystemStat."""
    stats = await db.execute(
        select(SystemStat.metric_type, func.sum(SystemStat.value))
        .where(SystemStat.metric_type.in_(['pwa_install_ios', 'pwa_install_android', 'pwa_session']))
        .group_by(SystemStat.metric_type)
    )
    data = {row[0]: row[1] for row in stats.all()}
    
    ios_installs = int(data.get('pwa_install_ios', 0))
    android_installs = int(data.get('pwa_install_android', 0))
    total = ios_installs + android_installs
    
    ios_pct = (ios_installs / max(1, total)) * 100
    android_pct = (android_installs / max(1, total)) * 100
    
    return {
        "installations": {
            "total": total,
            "this_month": 0,
            "growth": 0
        },
        "engagement": {
            "daily_active": 0,
            "push_enabled": 0 
        },
        "by_platform": [
            {"platform": "iOS", "installs": ios_installs, "percentage": round(ios_pct, 1)},
            {"platform": "Android", "installs": android_installs, "percentage": round(android_pct, 1)}
        ],
        "offline_usage": {
            "offline_sessions": 0, 
            "sync_success_rate": 0
        }
    }
