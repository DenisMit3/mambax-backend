"""Tests for Chat service."""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from backend.services.chat import (
    ConnectionManager, 
    mark_as_read, 
    get_unread_count,
    increment_unread,
    clear_unread,
    MessageStatus,
    create_ephemeral_message,
    MessageType,
    state_manager
)


@pytest.fixture
def clean_chat_state():
    """Clean state before and after tests."""
    yield
    # Cleanup handled by state_manager


@pytest.mark.asyncio
async def test_connection_manager():
    """Test WebSocket connection manager."""
    manager = ConnectionManager()
    ws = AsyncMock()
    user_id = "user1"
    
    await manager.connect(ws, user_id)
    assert manager.is_online(user_id)
    assert ws in manager.active_connections[user_id]
    
    manager.disconnect(ws, user_id)
    assert not manager.is_online(user_id)


@pytest.mark.asyncio
async def test_unread_count_operations(clean_chat_state):
    """Test unread count increment and clear."""
    user_id = "test_user_unread"
    match_id = "test_match_unread"
    
    # Mock state_manager methods
    with patch.object(state_manager, 'get_all_unread', new_callable=AsyncMock) as mock_get:
        with patch.object(state_manager, 'increment_unread', new_callable=AsyncMock) as mock_inc:
            with patch.object(state_manager, 'clear_unread', new_callable=AsyncMock) as mock_clear:
                # Initially 0
                mock_get.return_value = {}
                result = await get_unread_count(user_id, match_id)
                assert result["total"] == 0
                
                # Increment
                await increment_unread(user_id, match_id)
                await increment_unread(user_id, match_id)
                assert mock_inc.call_count == 2
                
                # Simulate incremented state
                mock_get.return_value = {match_id: 2}
                result = await get_unread_count(user_id, match_id)
                assert result["total"] == 2
                
                # Clear
                await clear_unread(user_id, match_id)
                mock_clear.assert_called_once_with(user_id, match_id)


@pytest.mark.asyncio
async def test_create_ephemeral_message():
    """Test ephemeral message creation."""
    match_id = "m1"
    sender_id = "s1"
    
    msg = await create_ephemeral_message(match_id, sender_id, text="secret", seconds=5)
    
    assert msg is not None
    assert msg.expires_in == 5
    assert msg.text == "secret"
