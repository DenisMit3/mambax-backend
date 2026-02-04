from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from pathlib import Path
from dotenv import load_dotenv
import os
import logging

# Load environment variables first
load_dotenv()

from backend import database
from backend.config.settings import settings
from backend.seed import seed_db

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Sentry for production error tracking (Enterprise integration)
from backend.core.sentry import init_sentry, set_context
init_sentry(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    release=os.getenv('APP_VERSION', '1.0.0'),
    traces_sample_rate=0.1 if settings.is_production else 0.0,
    profiles_sample_rate=0.1 if settings.is_production else 0.0,
    enable_tracing=settings.is_production
)

# --- Lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    if len(settings.SECRET_KEY) < 32:
        raise RuntimeError(f"SECRET_KEY too short ({len(settings.SECRET_KEY)} chars). Must be 32+ characters.")
        
    logger.info("Starting up: Creating database tables...")
    try:
        async with database.engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
        logger.info("Database tables created/verified.")
    except Exception as e:
        logger.warning(f"Table creation warning (tables may already exist): {e}")
    
    # Seed DB
    if settings.SEED_ON_STARTUP:
         async with database.async_session() as session:
             await seed_db(session)
    else:
         logger.info("Skipping DB seeding (SEED_ON_STARTUP is False)")
    
    # Start scheduler for background jobs (retention calculation, backups)
    if settings.ENABLE_SCHEDULER:
        try:
            from backend.tasks.retention_calculator import start_scheduler
            start_scheduler()
            logger.info("Background scheduler started")
        except Exception as e:
            logger.warning(f"Failed to start scheduler: {e}")
    
    # Set Sentry context
    set_context("app", {
        "environment": settings.ENVIRONMENT,
        "version": os.getenv('APP_VERSION', '1.0.0')
    })
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    
    # Stop scheduler
    if settings.ENABLE_SCHEDULER:
        try:
            from backend.tasks.retention_calculator import stop_scheduler
            stop_scheduler()
            logger.info("Background scheduler stopped")
        except Exception:
            pass

# --- App Init ---

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MambaX API",
    description="Backend API for MambaX Dating Platform",
    version="0.1.0",
    lifespan=lifespan
)

# --- Global Exception Handler ---
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)}
    )

# --- Middleware ---

# Prepare allowed origins
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://web.telegram.org"
]
if settings.ALLOWED_ORIGINS:
    allowed_origins.extend([o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()])

# Regex for Vercel preview deployments and Local Network (if enabled)
allowed_origin_regex = r"https://.*\.vercel\.app"
if settings.LOCAL_NETWORK_ACCESS:
    # Allow 192.168.x.x, 10.x.x.x, 172.x.x.x with any port
    allowed_origin_regex += r"|http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?|http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?|http://172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?"

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.is_production:
    app.add_middleware(HTTPSRedirectMiddleware)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    try:
        from backend.services.security import check_rate_limit, is_ip_banned
        from fastapi.responses import JSONResponse
        
        # Exempt static, health, debug, and admin routes FIRST
        if (request.url.path.startswith("/static") or 
            request.url.path == "/health" or 
            request.url.path.startswith("/health/") or
            request.url.path == "/ping" or
            request.url.path == "/docs" or
            request.url.path == "/openapi.json" or
            request.url.path == "/redoc" or
            "debug" in request.url.path or 
            request.url.path.startswith("/admin")):
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        fw = request.headers.get("X-Forwarded-For")
        if fw: 
            client_ip = fw.split(",")[0].strip()
        
        # Exempt localhost/internal IPs
        if client_ip in ["127.0.0.1", "localhost", "::1"]:
            return await call_next(request)
            
        # Check if IP is globally banned (SafeRedisClient handles connection errors gracefully)
        if await is_ip_banned(client_ip):
             return JSONResponse(status_code=403, content={"detail": "Access Permanently Suspended"})

        # Anti-Scraping
        user_agent = request.headers.get("user-agent", "").lower()
        bot_signatures = ["python-requests", "curl/", "wget/", "scrapy", "aiohttp", "urllib"]
        if any(sig in user_agent for sig in bot_signatures):
            return JSONResponse(status_code=403, content={"detail": "Access denied (Anti-Bot)"})

        # Rate Limiting
        endpoint_type = "default"
        path = request.url.path
        if "/auth" in path: endpoint_type = "auth"
        elif "/likes" in path: endpoint_type = "likes"
        elif "/messages" in path: endpoint_type = "messages"
        elif "/upload" in path: endpoint_type = "upload"
        
        result = await check_rate_limit(client_ip, endpoint_type)
        if not result.allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too Many Requests"},
                headers={"Retry-After": str(result.retry_after or 60)}
            )

        # Call Next
        response = await call_next(request)
        
        # Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        if result:
            response.headers["X-RateLimit-Remaining"] = str(result.remaining)
            response.headers["X-RateLimit-Reset"] = str(result.reset_at)
            
        return response

    except Exception as e:
        # Fallback: If middleware fails, allow request but log error
        logger.warning(f"Rate limit middleware error: {e}")
        return await call_next(request)

# --- Routers ---

from backend.api.health import router as health_router
from backend.api.auth import router as auth_router
from backend.api.interaction import router as interaction_router
from backend.api.discovery import router as discovery_router
from backend.api.chat import router as chat_router
from backend.api.users import router as users_router
from backend.api.traycer import router as traycer_router
from backend.api.bot_webhook import router as bot_webhook_router
from backend.api.verification import router as verification_router
from backend.api import stripe_webhook
from backend.api.security import router as security_router
from backend.api.ux_features import router as ux_features_router
from backend.api.notification import router as notification_router
from backend.api.safety import router as safety_router
from backend.api.admin import router as admin_router
from backend.api.monetization import router as monetization_router, gifts_router, dev_router
from backend.api.marketing import router as marketing_router
from backend.api.system import router as system_router
from backend.api.advanced import router as advanced_router
from backend.api.debug import router as debug_router
from backend.api.payments import router as payments_router


app.include_router(health_router, tags=["Health"])
app.include_router(auth_router)
app.include_router(interaction_router)
app.include_router(discovery_router)
app.include_router(chat_router)
app.include_router(users_router)
app.include_router(traycer_router)
app.include_router(bot_webhook_router)
app.include_router(verification_router)
app.include_router(stripe_webhook.router, prefix="/api/v1", tags=["Payments"])
app.include_router(security_router)
app.include_router(ux_features_router)
app.include_router(notification_router)
app.include_router(safety_router)
app.include_router(admin_router)
app.include_router(monetization_router)
app.include_router(gifts_router)
app.include_router(payments_router)
app.include_router(marketing_router)
app.include_router(system_router)
app.include_router(advanced_router)

# Only enable Debug/Dev routes in non-production
if not settings.is_production:
    app.include_router(dev_router)
    app.include_router(debug_router)

# Simple test endpoint that doesn't depend on anything
@app.get("/ping")
async def ping():
    return {"pong": True}

# --- Static Files & Root ---

# Determine absolute path to static directory
# When running from different CWD, Path(__file__) might be relative
static_dir = Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "static")))

logger.info(f"Serving static files from: {static_dir}")

if not static_dir.exists():
    static_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Created static directory: {static_dir}")

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

if not settings.is_production:
    @app.get("/debug/static-files")
    async def list_static_files():
        files = []
        if static_dir.exists():
            for f in static_dir.glob("**/*"):
                if f.is_file():
                    files.append(str(f.relative_to(static_dir)))
        return {
            "static_dir_absolute": str(static_dir),
            "exists": static_dir.exists(),
            "files_count": len(files),
            "sample_files": files[:10]
        }

# --- Run ---

if __name__ == "__main__":
    import uvicorn
    cert = "cert.pem"
    key = "key.pem"
    port = int(os.getenv("PORT", 8000))

    if os.path.exists(cert) and os.path.exists(key):
        print(f"Starting in HTTPS mode on port {port}...")
        uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True, ssl_keyfile=key, ssl_certfile=cert)
    else:
        print(f"Starting in HTTP mode on port {port}...")
        uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
