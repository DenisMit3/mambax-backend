"""
Admin WebSocket endpoint + connection manager + broadcast helper.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Set
import json
import asyncio

from backend.database import get_db

router = APIRouter()


class AdminWSManager:
    """Manages admin WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        async with self._lock:
            self.active_connections[admin_id] = websocket

    async def disconnect(self, admin_id: str):
        async with self._lock:
            self.active_connections.pop(admin_id, None)

    async def send_personal(self, admin_id: str, data: dict):
        ws = self.active_connections.get(admin_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                await self.disconnect(admin_id)

    async def broadcast(self, data: dict):
        async with self._lock:
            dead = []
            for admin_id, ws in self.active_connections.items():
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append(admin_id)
            for aid in dead:
                self.active_connections.pop(aid, None)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Singleton manager
admin_ws_manager = AdminWSManager()


async def send_admin_update(event_type: str, data: dict):
    """Helper to broadcast an update to all connected admins."""
    await admin_ws_manager.broadcast({
        "type": event_type,
        "data": data
    })


@router.websocket("/ws/admin")
async def admin_websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for admin real-time updates."""
    from backend.auth import decode_token

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        payload = decode_token(token)
        admin_id = payload.get("sub")
        if not admin_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await admin_ws_manager.connect(websocket, admin_id)

    try:
        await websocket.send_json({
            "type": "connected",
            "data": {"admin_id": admin_id, "online_admins": admin_ws_manager.connection_count}
        })

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg_type == "subscribe":
                    await websocket.send_json({
                        "type": "subscribed",
                        "data": {"channel": msg.get("channel", "all")}
                    })
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await admin_ws_manager.disconnect(admin_id)
