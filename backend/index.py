# MambaX Backend - Vercel Serverless Entry Point
# ==============================================

import sys
import os

# Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Create backend module reference for imports like "from backend.xxx"
import types
backend_module = types.ModuleType('backend')
backend_module.__path__ = [current_dir]
backend_module.__file__ = os.path.join(current_dir, '__init__.py')
sys.modules['backend'] = backend_module

from dotenv import load_dotenv
load_dotenv()

# Import the app
app = None
import_error = None

try:
    from main import app
except Exception as e:
    import_error = str(e)
    import traceback
    traceback.print_exc()

# Fallback if main import fails — at least show the error
if app is None:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(title="MambaX API (Fallback)")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    async def root():
        return {"status": "fallback", "error": import_error}
    
    @app.get("/health")
    async def health():
        return {"status": "fallback", "error": import_error}
    
    @app.get("/api/health")
    async def api_health():
        return {"status": "fallback", "error": import_error}
    
    @app.get("/ping")
    async def ping():
        return {"status": "fallback", "error": import_error}
