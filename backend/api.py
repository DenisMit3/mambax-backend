# Vercel Serverless API Entry Point
# ==================================
# Minimal FastAPI app for Vercel deployment
# Database: Neon PostgreSQL via asyncpg

import os
import ssl
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text

# ============================================
# DATABASE SETUP
# ============================================

DATABASE_URL = os.environ.get("DATABASE_URL", "")

if DATABASE_URL:
    # Fix scheme for asyncpg
    _async_url = DATABASE_URL
    if _async_url.startswith("postgres://"):
        _async_url = _async_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif _async_url.startswith("postgresql://") and "+asyncpg" not in _async_url:
        _async_url = _async_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Replace sslmode with ssl for asyncpg
    if "sslmode=" in _async_url:
        _async_url = _async_url.replace("sslmode=require", "ssl=require")
    
    # SSL context for Neon
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Engine
    engine = create_async_engine(
        _async_url,
        echo=False,
        poolclass=NullPool,
        connect_args={
            "ssl": ssl_context,
            "timeout": 30,
            "command_timeout": 30,
        }
    )
    
    # Session factory
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
else:
    engine = None
    async_session_maker = None


async def get_db():
    """Database session dependency"""
    if not async_session_maker:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# ============================================
# APP SETUP
# ============================================

app = FastAPI(
    title="MambaX API",
    description="Backend API for MambaX Dating Platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# SCHEMAS
# ============================================

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    database: Optional[str] = None


class UserPublic(BaseModel):
    id: str
    name: Optional[str] = None
    age: Optional[int] = None
    bio: Optional[str] = None
    photos: list = []
    
    class Config:
        from_attributes = True


# ============================================
# HEALTH ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {"status": "ok", "message": "MambaX Backend is running on Vercel"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check with optional database connectivity test"""
    response = HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat() + "Z",
        version="1.0.0",
        database="not_configured"
    )
    
    if engine:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            response.database = "connected"
        except Exception as e:
            response.database = f"error: {str(e)[:50]}"
            response.status = "degraded"
    
    return response


@app.get("/ping")
async def ping():
    return {"pong": True}


# ============================================
# DATABASE TEST ENDPOINTS
# ============================================

@app.get("/api/db-test")
async def db_test(db: AsyncSession = Depends(get_db)):
    """Test database connection"""
    try:
        result = await db.execute(text("SELECT NOW()"))
        row = result.fetchone()
        return {
            "status": "ok",
            "database": "connected",
            "server_time": str(row[0]) if row else None
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")


@app.get("/api/users/count")
async def users_count(db: AsyncSession = Depends(get_db)):
    """Get total users count"""
    try:
        result = await db.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")


# ============================================
# DISCOVERY ENDPOINT (simplified)
# ============================================

@app.get("/api/discovery/profiles")
async def get_discovery_profiles(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Get profiles for discovery feed.
    Simplified version without auth for testing.
    """
    try:
        result = await db.execute(text("""
            SELECT 
                id::text, 
                name, 
                age, 
                bio, 
                photos,
                gender,
                is_vip
            FROM users 
            WHERE is_active = true 
            AND photos IS NOT NULL 
            AND array_length(photos, 1) > 0
            ORDER BY RANDOM() 
            LIMIT :limit
        """), {"limit": limit})
        
        rows = result.fetchall()
        
        profiles = []
        for row in rows:
            profiles.append({
                "id": row[0],
                "name": row[1],
                "age": row[2],
                "bio": row[3],
                "photos": row[4] or [],
                "gender": row[5],
                "is_vip": row[6] or False
            })
        
        return {"profiles": profiles, "total": len(profiles)}
    
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")


# Vercel handler
handler = app
