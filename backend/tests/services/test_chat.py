import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock
from backend.services.chat import (
    ConnectionManager, 
    mark_as_read, 
    unread_counts, 
    message_statuses,
    MessageStatus,
    create_ephemeral_message,
    MessageType
)

@pytest.fixture
def clean_chat_state():
    # Setup
    unread_counts.clear()
    message_statuses.clear()
    yield
    # Teardown
    unread_counts.clear()
    message_statuses.clear()

@pytest.mark.asyncio
async def test_connection_manager():
    manager = ConnectionManager()
    ws = AsyncMock()
    user_id = "user1"
    
    await manager.connect(ws, user_id)
    assert manager.is_online(user_id)
    assert ws in manager.active_connections[user_id]
    
    manager.disconnect(ws, user_id)
    assert not manager.is_online(user_id)

@pytest.mark.asyncio
async def test_mark_as_read(clean_chat_state):
    match_id = "match1"
    user_id = "user1"
    msg_id = "msg1"
    
    # Simulate unread
    unread_counts[user_id][match_id] = 5
    
    await mark_as_read(match_id, user_id, [msg_id])
    
    assert unread_counts[user_id][match_id] == 0
    assert message_statuses.get(msg_id) == MessageStatus.READ

@pytest.mark.asyncio
async def test_create_ephemeral_message():
    match_id = "m1"
    sender_id = "s1"
    
    msg = await create_ephemeral_message(match_id, sender_id, text="secret", seconds=5)
    
    assert msg.is_ephemeral is True
    assert msg.ephemeral_seconds == 5
    assert msg.text == "secret"
    assert msg.type == MessageType.TEXT
