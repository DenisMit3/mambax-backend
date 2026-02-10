# Vercel Serverless API Entry Point
# ==================================
# Simplified FastAPI app for Vercel deployment with Neon PostgreSQL

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Create app
app = FastAPI(
    title="MambaX API",
    description="Backend API for MambaX Dating Platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://mambax-frontend.vercel.app",
        "https://web.telegram.org",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/")
def root():
    return {"status": "ok", "message": "MambaX Backend is running on Vercel"}

@app.get("/health")
def health():
    return {"status": "healthy", "database": "neon"}

@app.get("/ping")
def ping():
    return {"pong": True}

# Database test endpoint
@app.get("/db-test")
async def db_test():
    try:
        from backend.db.session import NeonSyncDB
        tables = NeonSyncDB.fetchval("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
        return {"status": "ok", "tables": tables, "database": "neon"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error": str(e)}
        )

# Import routers (basic ones that don't require complex dependencies)
try:
    from backend.api.health import router as health_router
    app.include_router(health_router, tags=["Health"])
except Exception as e:
    print(f"Warning: Could not load health router: {e}")

try:
    from backend.api.auth import router as auth_router
    app.include_router(auth_router)
except Exception as e:
    print(f"Warning: Could not load auth router: {e}")

# Vercel handler
handler = app
