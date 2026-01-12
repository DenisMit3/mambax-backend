from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
import os
import re
import sentry_sdk

from backend import database
from backend.config.settings import settings
from backend.seed import seed_db

# Initialize Sentry for production error tracking
if settings.is_production and settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment="production",
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        enable_tracing=True,
    )

# Load environment variables
load_dotenv()

# --- Helpers ---

def is_allowed_origin(origin: str) -> bool:
    """Check if an origin is allowed for CORS."""
    if not origin: return False
    
    environment = os.environ.get("ENVIRONMENT", "production").lower()
    is_dev = environment == "development"
    
    try:
        parsed = urlparse(origin)
        host = parsed.hostname or ""
        port = parsed.port
    except Exception:
        return False
    
    # 1. Localhost
    if host == "localhost":
        return True if is_dev else port in [3000, 3001, 8001]
    
    # 2. 127.0.0.1
    if host == "127.0.0.1":
        return True if is_dev else port in [3000, 3001, 8001]
    
    # 3. Local network
    if settings.LOCAL_NETWORK_ACCESS:
        if re.match(r"^192\.168\.\d{1,3}\.\d{1,3}$", host): return True
        if re.match(r"^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$", host): return True
        if re.match(r"^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$", host): return True
    
    # 4. Vercel
    if host.endswith(".vercel.app"): return True
    
    # 5. Telegram
    if host == "web.telegram.org": return True
    
    # 6. Custom
    allowed_origins_str = os.environ.get("ALLOWED_ORIGINS", "")
    if allowed_origins_str:
        allowed_list = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]
        if "*" in allowed_list: return True
        if origin in allowed_list: return True
        origin_clean = origin.rstrip("/")
        for allowed in allowed_list:
            if origin_clean == allowed.rstrip("/"): return True
    
    return False

# --- Lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    if len(settings.SECRET_KEY) < 32:
        raise RuntimeError(f"SECRET_KEY too short ({len(settings.SECRET_KEY)} chars). Must be 32+ characters.")
        
    print("Starting up: Creating database tables...")
    async with database.engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.create_all)
    print("Database tables created/verified.")
    
    # Seed DB
    if settings.SEED_ON_STARTUP:
         async with database.async_session() as session:
             await seed_db(session)
    else:
         print("Skipping DB seeding (SEED_ON_STARTUP is False)")
    
    yield
    # Shutdown
    print("Shutting down...")

# --- App Init ---

app = FastAPI(
    title="MambaX API",
    description="Backend API for MambaX Dating Platform",
    version="0.1.0",
    lifespan=lifespan
)

# --- Middleware ---

CORS_ALLOWED_HEADERS = "authorization, content-type, x-requested-with, accept, origin, cache-control, pragma"
CORS_EXPOSE_HEADERS = "content-length, content-type"

@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    
    if request.method == "OPTIONS":
        if is_allowed_origin(origin):
            response = Response(status_code=204)
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            requested_headers = request.headers.get("Access-Control-Request-Headers", "")
            response.headers["Access-Control-Allow-Headers"] = requested_headers or CORS_ALLOWED_HEADERS
            response.headers["Access-Control-Expose-Headers"] = CORS_EXPOSE_HEADERS
            response.headers["Access-Control-Max-Age"] = "86400"
            return response
        else:
            print(f"CORS: Rejected preflight from origin: {origin}")
            return Response(status_code=403, content="CORS not allowed")
    
    response = await call_next(request)
    
    if origin and is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = CORS_ALLOWED_HEADERS
        response.headers["Access-Control-Expose-Headers"] = CORS_EXPOSE_HEADERS
    
    return response

if settings.is_production:
    app.add_middleware(HTTPSRedirectMiddleware)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    from backend.services.security import check_rate_limit
    from fastapi.responses import JSONResponse
    
    if request.url.path.startswith("/static") or request.url.path == "/health" or "debug" in request.url.path:
        return await call_next(request)
    
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    endpoint_type = "default"
    path = request.url.path
    if "/auth" in path: endpoint_type = "auth"
    elif "/likes" in path: endpoint_type = "likes"
    elif "/messages" in path: endpoint_type = "messages"
    elif "/upload" in path: endpoint_type = "upload"
    
    result = check_rate_limit(client_ip, endpoint_type)
    
    if not result.allowed:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Too Many Requests",
                "remaining": result.remaining,
                "reset_at": result.reset_at,
                "retry_after": result.retry_after
            },
            headers={
                "Retry-After": str(result.retry_after or 60),
                "X-RateLimit-Remaining": str(result.remaining),
                "X-RateLimit-Reset": result.reset_at
            }
        )
    
    response = await call_next(request)
    response.headers["X-RateLimit-Remaining"] = str(result.remaining)
    response.headers["X-RateLimit-Reset"] = result.reset_at
    return response

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
from backend.api.monetization import router as monetization_router, gifts_router, payments_router, dev_router
from backend.api.marketing import router as marketing_router
from backend.api.system import router as system_router
from backend.api.advanced import router as advanced_router
from backend.api.debug import router as debug_router


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
app.include_router(dev_router)
app.include_router(marketing_router)
app.include_router(system_router)
app.include_router(advanced_router)
app.include_router(debug_router)

# --- Static Files & Root ---

static_dir = Path(__file__).parent / "static"
if not static_dir.exists():
    static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

# --- Run ---

if __name__ == "__main__":
    import uvicorn
    cert = "cert.pem"
    key = "key.pem"
    port = int(os.getenv("PORT", 8000))

    if os.path.exists(cert) and os.path.exists(key):
        print(f"Starting in HTTPS mode on port {port}...")
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, ssl_keyfile=key, ssl_certfile=cert)
    else:
        print(f"Starting in HTTP mode on port {port}...")
        uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
