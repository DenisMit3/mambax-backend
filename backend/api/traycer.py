from fastapi import APIRouter, HTTPException, Request, Depends, status
import logging
from backend.config.traycer import TRAYCER_API_TOKEN

router = APIRouter(prefix="/api/traycer", tags=["Traycer"])

logger = logging.getLogger(__name__)

async def verify_traycer_token(request: Request):
    """
    Verifies that the request comes from Traycer using the configured API Token.
    Expects the token in the 'X-Traycer-Token' header or 'Authorization' header.
    """
    token = request.headers.get("X-Traycer-Token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if token != TRAYCER_API_TOKEN:
        logger.warning(f"Unauthorized access attempt to Traycer webhook from {request.client.host}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Traycer API Token",
        )

@router.post("/webhook")
async def traycer_webhook(request: Request, _ = Depends(verify_traycer_token)):
    """
    Receives tasks or updates from Traycer.
    """
    try:
        payload = await request.json()
        logger.info(f"Received Traycer payload: {payload}")
        
        # TODO: Implement logic to handle specific Traycer events
        # e.g., create_task, update_status, etc.
        
        return {"status": "success", "message": "Payload received"}
    except Exception as e:
        logger.error(f"Error processing Traycer webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))
