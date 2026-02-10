# Health Check endpoint - Проверка состояния сервера

from fastapi import APIRouter
from datetime import datetime
from typing import Optional

router = APIRouter()

# Application version
APP_VERSION = "1.0.0"


async def check_database() -> dict:
    """Check database connectivity"""
    try:
        from backend.database import async_session
        from sqlalchemy import text
        
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "latency_ms": None}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def check_redis() -> dict:
    """Check Redis connectivity"""
    try:
        from backend.config.settings import settings
        
        if not settings.REDIS_URL:
            return {"status": "not_configured"}
        
        # Try to ping Redis
        import redis.asyncio as redis
        client = redis.from_url(settings.REDIS_URL)
        await client.ping()
        await client.close()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def check_stripe() -> dict:
    """Check Stripe configuration"""
    try:
        from backend.config.settings import settings
        if not settings.STRIPE_SECRET_KEY:
            return {"status": "not_configured"}
        return {"status": "configured"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.get("/health")
async def health_check(full: bool = False):
    """
    Эндпоинт для проверки работоспособности сервера.
    
    Параметры:
    - full: Если true, выполняет полную проверку (DB, Redis)
    
    Возвращает:
    - status: "ok" если сервер работает
    - timestamp: ISO время проверки
    - version: версия приложения
    - checks: детальные проверки (если full=true)
    """
    from backend.config.settings import settings
    
    response = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": APP_VERSION,
        "environment": settings.ENVIRONMENT
    }
    
    # Full health check includes database and cache connectivity
    if full:
        db_check = await check_database()
        redis_check = await check_redis()
        stripe_check = await check_stripe()
        
        response["checks"] = {
            "database": db_check,
            "redis": redis_check,
            "stripe": stripe_check
        }
        
        # Overall status is unhealthy if any critical service is down
        if db_check.get("status") == "unhealthy":
            response["status"] = "degraded"
    
    return response


@router.get("/health/live")
async def liveness_probe():
    """
    Kubernetes/Render liveness probe.
    Returns 200 if the application is running.
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_probe():
    """
    Kubernetes/Render readiness probe.
    Returns 200 if the application is ready to accept traffic.
    """
    db_check = await check_database()
    
    if db_check.get("status") == "healthy":
        return {"status": "ready"}
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not ready")
