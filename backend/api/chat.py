# Chat API - WebSocket эндпоинт для обмена сообщениями в реальном времени

import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import verify_token
from core.websocket import manager
from db.session import async_session_maker
from models.chat import Message
from schemas.chat import MessageResponse


router = APIRouter(tags=["Chat"])


async def save_message(
    sender_id: UUID,
    receiver_id: UUID,
    content: str
) -> Message:
    """
    Сохраняет сообщение в БД.
    Использует отдельную сессию для WebSocket.
    """
    async with async_session_maker() as db:
        message = Message(
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message


async def get_chat_history(
    user1_id: UUID,
    user2_id: UUID,
    limit: int = 50
) -> list[Message]:
    """
    Получает историю сообщений между двумя пользователями.
    """
    async with async_session_maker() as db:
        stmt = (
            select(Message)
            .where(
                or_(
                    and_(
                        Message.sender_id == user1_id,
                        Message.receiver_id == user2_id
                    ),
                    and_(
                        Message.sender_id == user2_id,
                        Message.receiver_id == user1_id
                    )
                )
            )
            .order_by(Message.timestamp.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        messages = list(result.scalars().all())
        messages.reverse()  # Возвращаем в хронологическом порядке
        return messages


async def mark_messages_as_read(
    reader_id: UUID,
    sender_id: UUID
) -> int:
    """
    Отмечает все сообщения от sender как прочитанные.
    Возвращает количество обновлённых сообщений.
    """
    async with async_session_maker() as db:
        stmt = (
            select(Message)
            .where(
                and_(
                    Message.sender_id == sender_id,
                    Message.receiver_id == reader_id,
                    Message.is_read == False
                )
            )
        )
        result = await db.execute(stmt)
        messages = result.scalars().all()
        
        count = 0
        for msg in messages:
            msg.is_read = True
            count += 1
        
        await db.commit()
        return count


@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket эндпоинт для чата.
    
    Протокол:
    1. Клиент подключается с токеном в URL
    2. Токен валидируется
    3. Клиент отправляет JSON сообщения:
       {"type": "message", "receiver_id": "uuid", "content": "текст"}
       {"type": "typing", "receiver_id": "uuid", "is_typing": true}
       {"type": "read", "message_id": "uuid"}
    4. Сервер отправляет:
       {"type": "message", "message_id": "uuid", "sender_id": "uuid", "content": "текст", "timestamp": "..."}
       {"type": "typing", "user_id": "uuid", "is_typing": true}
       {"type": "read", "message_id": "uuid", "reader_id": "uuid"}
    """
    # Валидируем токен
    user_id = verify_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    # Подключаем пользователя
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            # Получаем сообщение от клиента
            data = await websocket.receive_text()
            
            try:
                message_data = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue
            
            msg_type = message_data.get("type", "message")
            
            if msg_type == "message":
                # Обработка текстового сообщения
                receiver_id = message_data.get("receiver_id")
                content = message_data.get("content")
                
                if not receiver_id or not content:
                    await websocket.send_json({"error": "Missing receiver_id or content"})
                    continue
                
                # Сохраняем в БД
                db_message = await save_message(
                    sender_id=UUID(user_id),
                    receiver_id=UUID(receiver_id),
                    content=content
                )
                
                # Формируем ответ
                outgoing = {
                    "type": "message",
                    "message_id": str(db_message.id),
                    "sender_id": str(db_message.sender_id),
                    "content": db_message.content,
                    "timestamp": db_message.timestamp.isoformat(),
                }
                
                # Отправляем получателю (если онлайн)
                await manager.send_personal_message(outgoing, receiver_id)
                
                # Подтверждаем отправителю
                await websocket.send_json({
                    "type": "sent",
                    "message_id": str(db_message.id),
                    "timestamp": db_message.timestamp.isoformat(),
                })
            
            elif msg_type == "typing":
                # Уведомление о наборе текста
                receiver_id = message_data.get("receiver_id")
                is_typing = message_data.get("is_typing", True)
                
                if receiver_id:
                    await manager.send_personal_message({
                        "type": "typing",
                        "user_id": user_id,
                        "is_typing": is_typing,
                    }, receiver_id)
            
            elif msg_type == "read":
                # Отметка о прочтении
                sender_id = message_data.get("sender_id")
                
                if sender_id:
                    count = await mark_messages_as_read(
                        reader_id=UUID(user_id),
                        sender_id=UUID(sender_id)
                    )
                    
                    # Уведомляем отправителя
                    await manager.send_personal_message({
                        "type": "read",
                        "reader_id": user_id,
                        "count": count,
                    }, sender_id)
            
            elif msg_type == "history":
                # Запрос истории чата
                partner_id = message_data.get("partner_id")
                limit = message_data.get("limit", 50)
                
                if partner_id:
                    messages = await get_chat_history(
                        user1_id=UUID(user_id),
                        user2_id=UUID(partner_id),
                        limit=limit
                    )
                    
                    await websocket.send_json({
                        "type": "history",
                        "messages": [
                            {
                                "message_id": str(m.id),
                                "sender_id": str(m.sender_id),
                                "content": m.content,
                                "timestamp": m.timestamp.isoformat(),
                                "is_read": m.is_read,
                            }
                            for m in messages
                        ]
                    })
    
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(user_id)


@router.get("/chat/history/{partner_id}", response_model=list[MessageResponse])
async def get_history(
    partner_id: UUID,
    limit: int = 50,
):
    """
    REST эндпоинт для получения истории чата.
    Альтернатива WebSocket запросу history.
    """
    # TODO: Get current_user from auth
    from uuid import uuid4
    current_user_id = uuid4()
    
    messages = await get_chat_history(current_user_id, partner_id, limit)
    
    return [
        MessageResponse(
            id=m.id,
            sender_id=m.sender_id,
            receiver_id=m.receiver_id,
            content=m.content,
            timestamp=m.timestamp,
            is_read=m.is_read,
        )
        for m in messages
    ]


@router.get("/chat/online")
async def get_online_users():
    """Возвращает количество онлайн пользователей."""
    return {"online_count": manager.get_online_count()}
