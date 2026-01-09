# WebSocket Manager - Управление WebSocket соединениями для чата

from typing import Dict, Optional
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    """
    Менеджер WebSocket соединений.
    
    Обеспечивает:
    - Хранение активных соединений по user_id
    - Отправку персональных сообщений
    - Широковещательную рассылку (опционально)
    
    Для MVP у одного пользователя хранится одно соединение.
    При новом подключении старое заменяется.
    """
    
    def __init__(self):
        # Активные соединения: user_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """
        Подключает пользователя к WebSocket.
        
        Args:
            user_id: ID пользователя (строка UUID)
            websocket: WebSocket соединение
        """
        await websocket.accept()
        
        # Если уже есть соединение, закрываем старое
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close()
            except Exception:
                pass
        
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str) -> None:
        """
        Отключает пользователя от WebSocket.
        
        Args:
            user_id: ID пользователя
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str) -> bool:
        """
        Отправляет сообщение конкретному пользователю.
        
        Args:
            message: Словарь с данными сообщения
            user_id: ID получателя
        
        Returns:
            bool: True если отправлено, False если пользователь офлайн
        """
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except Exception:
                # Соединение разорвано, удаляем
                self.disconnect(user_id)
                return False
        return False
    
    async def broadcast(self, message: dict, exclude: Optional[str] = None) -> None:
        """
        Отправляет сообщение всем подключённым пользователям.
        
        Args:
            message: Словарь с данными сообщения
            exclude: ID пользователя, которого исключить
        """
        for user_id, connection in list(self.active_connections.items()):
            if exclude and user_id == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(user_id)
    
    def is_online(self, user_id: str) -> bool:
        """
        Проверяет, онлайн ли пользователь.
        
        Args:
            user_id: ID пользователя
        
        Returns:
            bool: True если онлайн
        """
        return user_id in self.active_connections
    
    def get_online_count(self) -> int:
        """Возвращает количество онлайн пользователей."""
        return len(self.active_connections)


# Глобальный экземпляр менеджера
manager = ConnectionManager()
