"""
Chat REST endpoints: online status.
"""

from fastapi import APIRouter

from backend.services.chat import manager, get_online_status

router = APIRouter(tags=["Chat"])


@router.get("/chat/online")
async def get_online_users_list():
    return {"online_count": len(manager.active_connections)}


@router.get("/chat/online/{user_id}")
async def check_online_status_endpoint(user_id: str):
    return get_online_status(user_id)
