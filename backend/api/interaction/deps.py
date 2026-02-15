# Interaction API - Зависимости

import uuid
from uuid import UUID

from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from backend.core.security import verify_token


class SwipeResponse(BaseModel):
    """Ответ на свайп"""
    success: bool
    is_match: bool


async def get_current_user_id(
    authorization: str = Header(None),
) -> UUID:
    """
    Извлекает user_id из JWT токена.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization required"
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
        
        user_id = verify_token(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
