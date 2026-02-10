# Vercel Serverless API Entry Point
# ==================================
# Minimal FastAPI app for Vercel deployment

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create app
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

# Health check
@app.get("/")
def root():
    return {"status": "ok", "message": "MambaX Backend is running on Vercel"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/ping")
def ping():
    return {"pong": True}

# Vercel handler
handler = app
