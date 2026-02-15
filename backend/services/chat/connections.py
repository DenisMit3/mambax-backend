"""
Chat - WebSocket Connection Manager
"""

import asyncio
import logging
from typing import Dict, List

from backend.services.chat.state import state_manager

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections.
    
    TODO (SCALABILITY): Currently stores connections in-memory dict.
    For horizontal scaling (2+ servers), migrate to Redis Pub/Sub:
    - On message: publish to Redis channel
    - Each server: subscribe and forward to local connections
    """
    def __init__(self):
        self.active_connections: Dict[str, List] = {}
        self._offline_tasks: Dict[str, asyncio.Task] = {}
    
    async def connect(self, websocket, user_id: str):
        # accept() вызывается снаружи (в websocket_endpoint), здесь только регистрация
        
        # Cancel any pending offline task for this user (reconnect within grace period)
        if user_id in self._offline_tasks:
            self._offline_tasks[user_id].cancel()
            del self._offline_tasks[user_id]
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        await state_manager.set_user_online(user_id)
    
    def disconnect(self, websocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Set offline after 30s grace period (handles page reloads)
                self._schedule_offline(user_id)

    def _schedule_offline(self, user_id: str):
        """Schedule offline status after grace period"""
        async def set_offline_after_delay():
            try:
                await asyncio.sleep(30)  # 30 second grace period
                # Only set offline if user hasn't reconnected
                if user_id not in self.active_connections:
                    await state_manager.set_user_offline(user_id)
                    logger.info(f"User {user_id} marked offline after grace period")
            except asyncio.CancelledError:
                pass  # User reconnected, task cancelled
        
        # Cancel existing task if any
        if user_id in self._offline_tasks:
            self._offline_tasks[user_id].cancel()
        
        self._offline_tasks[user_id] = asyncio.create_task(set_offline_after_delay())

    async def send_personal(self, user_id: str, message: dict):
        connections = self.active_connections.get(user_id, [])
        for ws in connections:
            try:
                await ws.send_json(message)
            except:
                pass

    async def send_to_match(self, match_id: str, sender_id: str, recipient_id: str, message: dict):
        await self.send_personal(recipient_id, message)
        await self.send_personal(sender_id, {**message, "confirmed": True})

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active_connections


manager = ConnectionManager()
