# Simple test API for Vercel
from fastapi import FastAPI

app = FastAPI(title="MambaX Backend Test")

@app.get("/")
def root():
    return {"status": "ok", "message": "MambaX Backend is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Vercel handler
handler = app
