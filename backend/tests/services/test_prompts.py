"""Tests for Profile Prompts service."""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from backend.services.social.prompts import (
    get_available_prompts,
    get_prompt_by_id,
    get_user_prompts,
    save_prompt_answer,
    delete_prompt_answer,
    AVAILABLE_PROMPTS,
    MAX_PROMPTS_PER_USER
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


def test_get_available_prompts():
    """Should return list of available prompts."""
    prompts = get_available_prompts()
    
    assert isinstance(prompts, list)
    assert len(prompts) == 15
    
    for prompt in prompts:
        assert "id" in prompt
        assert "text" in prompt
        assert "category" in prompt


def test_get_prompt_by_id_exists():
    """Should return prompt when ID exists."""
    prompt = get_prompt_by_id("about_me")
    
    assert prompt is not None
    assert prompt["id"] == "about_me"
    assert "text" in prompt


def test_get_prompt_by_id_not_exists():
    """Should return None when ID doesn't exist."""
    prompt = get_prompt_by_id("nonexistent_prompt")
    
    assert prompt is None


@pytest.mark.asyncio
async def test_get_user_prompts_empty(mock_db, user_id):
    """Should return empty list when user has no prompts."""
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    prompts = await get_user_prompts(mock_db, user_id)
    
    assert prompts == []


@pytest.mark.asyncio
async def test_get_user_prompts_with_data(mock_db, user_id):
    """Should return user's prompts."""
    mock_prompt = MagicMock()
    mock_prompt.id = uuid.uuid4()
    mock_prompt.question = "Обо мне в двух словах..."
    mock_prompt.answer = "Люблю путешествовать"
    mock_prompt.type = "text"
    mock_prompt.media_url = None
    mock_prompt.sort_order = 0
    mock_prompt.created_at = MagicMock()
    mock_prompt.created_at.isoformat.return_value = "2024-01-01T00:00:00"
    
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [mock_prompt]
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    prompts = await get_user_prompts(mock_db, user_id)
    
    assert len(prompts) == 1
    assert prompts[0]["answer"] == "Люблю путешествовать"


@pytest.mark.asyncio
async def test_save_prompt_answer_success(mock_db, user_id):
    """Should save prompt answer successfully."""
    # No existing answer
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    result_mock.scalars.return_value.all.return_value = []  # No existing prompts
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    result = await save_prompt_answer(
        mock_db, user_id, "about_me", "Я люблю кодить"
    )
    
    assert result["success"] == True
    assert "prompt" in result


@pytest.mark.asyncio
async def test_save_prompt_answer_too_short(mock_db, user_id):
    """Should reject answer shorter than 3 characters."""
    result = await save_prompt_answer(
        mock_db, user_id, "about_me", "Hi"
    )
    
    assert result["success"] == False
    assert "короткий" in result["message"]


@pytest.mark.asyncio
async def test_save_prompt_answer_too_long(mock_db, user_id):
    """Should reject answer longer than 500 characters."""
    long_answer = "x" * 501
    
    result = await save_prompt_answer(
        mock_db, user_id, "about_me", long_answer
    )
    
    assert result["success"] == False
    assert "длинный" in result["message"]


@pytest.mark.asyncio
async def test_save_prompt_answer_invalid_prompt(mock_db, user_id):
    """Should reject invalid prompt ID."""
    result = await save_prompt_answer(
        mock_db, user_id, "invalid_prompt_id", "Valid answer"
    )
    
    assert result["success"] == False
    assert "Неизвестный" in result["message"]


@pytest.mark.asyncio
async def test_save_prompt_answer_limit_reached(mock_db, user_id):
    """Should reject when user has reached max prompts limit."""
    # No existing answer for this prompt
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    
    # But user already has MAX_PROMPTS_PER_USER prompts
    existing_prompts = [MagicMock() for _ in range(MAX_PROMPTS_PER_USER)]
    result_mock.scalars.return_value.all.return_value = existing_prompts
    
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await save_prompt_answer(
        mock_db, user_id, "about_me", "Valid answer"
    )
    
    assert result["success"] == False
    assert "лимит" in result["message"].lower()


@pytest.mark.asyncio
async def test_delete_prompt_answer_success(mock_db, user_id):
    """Should delete prompt answer successfully."""
    prompt_id = uuid.uuid4()
    
    mock_prompt = MagicMock()
    mock_prompt.user_id = user_id
    
    mock_db.get = AsyncMock(return_value=mock_prompt)
    mock_db.delete = AsyncMock()
    mock_db.commit = AsyncMock()
    
    # Empty remaining prompts
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await delete_prompt_answer(mock_db, user_id, prompt_id)
    
    assert result["success"] == True


@pytest.mark.asyncio
async def test_delete_prompt_answer_not_found(mock_db, user_id):
    """Should fail when prompt not found."""
    prompt_id = uuid.uuid4()
    
    mock_db.get = AsyncMock(return_value=None)
    
    result = await delete_prompt_answer(mock_db, user_id, prompt_id)
    
    assert result["success"] == False
    assert "не найден" in result["message"]


@pytest.mark.asyncio
async def test_delete_prompt_answer_wrong_user(mock_db, user_id):
    """Should fail when prompt belongs to different user."""
    prompt_id = uuid.uuid4()
    
    mock_prompt = MagicMock()
    mock_prompt.user_id = uuid.uuid4()  # Different user
    
    mock_db.get = AsyncMock(return_value=mock_prompt)
    
    result = await delete_prompt_answer(mock_db, user_id, prompt_id)
    
    assert result["success"] == False
    assert "доступа" in result["message"]


def test_max_prompts_per_user():
    """MAX_PROMPTS_PER_USER should be 6."""
    assert MAX_PROMPTS_PER_USER == 6
