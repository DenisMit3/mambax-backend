"""Tests for AI service: icebreakers, conversation prompts, QOTD."""
import pytest
from unittest.mock import AsyncMock, patch
from backend.services.ai import ai_service


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.mark.asyncio
async def test_generate_icebreakers_returns_list(mock_db):
    """generate_icebreakers returns up to count strings (fallback to simulate when no users)."""
    from unittest.mock import MagicMock
    r = MagicMock()
    r.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=r)
    with patch.object(ai_service, '_simulate_response', new_callable=AsyncMock) as m_sim:
        m_sim.return_value = (["Hi!", "How are you?", "What's up?"], {})
        result = await ai_service.generate_icebreakers(
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002",
            mock_db,
            count=3,
        )
    assert isinstance(result, list)
    assert len(result) <= 3
    assert all(isinstance(x, str) for x in result)


@pytest.mark.asyncio
async def test_generate_conversation_prompts_returns_list(mock_db):
    """generate_conversation_prompts returns list of prompts when there are messages."""
    from unittest.mock import MagicMock
    from uuid import uuid4
    msg = MagicMock()
    msg.sender_id = uuid4()
    msg.text = "Hello"
    msg.created_at = MagicMock()
    r = MagicMock()
    r.scalars.return_value.all.return_value = [msg]
    mock_db.execute = AsyncMock(return_value=r)
    with patch.object(ai_service, 'generate_content', new_callable=AsyncMock) as m_gen:
        m_gen.return_value = (["Ask about their day", "Share a meme", "Ask a question"], {})
        mid = uuid4()
        result = await ai_service.generate_conversation_prompts(str(mid), mock_db, count=3)
    assert isinstance(result, list)
    assert len(result) <= 3


@pytest.mark.asyncio
async def test_get_question_of_the_day_returns_string():
    """get_question_of_the_day returns a non-empty string."""
    with patch.object(ai_service, 'generate_content', new_callable=AsyncMock) as m_gen:
        m_gen.return_value = (["What's your favorite season?"], {})
        with patch('backend.core.redis.redis_manager') as m_redis:
            m_redis.get_json = AsyncMock(return_value=None)
            m_redis.set_json = AsyncMock()
            result = await ai_service.get_question_of_the_day()
    assert isinstance(result, str)
    assert len(result) > 0
    assert isinstance(result, str)
    assert len(result) > 0
