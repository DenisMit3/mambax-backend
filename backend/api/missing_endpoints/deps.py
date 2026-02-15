# Missing Endpoints - Общие зависимости

from fastapi import Header, HTTPException
from backend.core.security import verify_token


async def get_current_user_id(authorization: str = Header(None)) -> str:
    """Extract user_id from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        user_id = verify_token(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
