# MambaX Backend - Vercel Serverless Entry Point
# ==============================================
# This file is the entry point for Vercel deployment

import sys
import os

# CRITICAL: Setup Python path for Vercel
# Vercel runs from backend/ directory, but modules use "from backend.xxx" imports
# We need to add parent directory so "backend" package is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

# Add parent to path so "from backend.xxx" works
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Also add current dir for direct imports
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Now import the main app
from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import the full app from main.py
try:
    from backend.main import app
    logger.info("✅ Imported full app from backend.main")
except ImportError as e:
    logger.error(f"❌ Failed to import backend.main: {e}")
    
    # Fallback: create minimal app
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(
        title="MambaX API (Fallback)",
        description="Backend API - Running in fallback mode",
        version="1.0.0"
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    async def root():
        return {
            "status": "fallback",
            "message": "MambaX Backend API (fallback mode)",
            "error": str(e)
        }
    
    @app.get("/health")
    async def health():
        return {"status": "fallback", "error": str(e)}
    
    @app.get("/ping")
    async def ping():
        return {"pong": True}

# Vercel handler export
handler = app
