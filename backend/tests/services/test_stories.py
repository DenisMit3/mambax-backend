"""Tests for Stories service."""
import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from backend.services.social.stories import (
    create_story,
    get_stories_feed,
    view_story,
    react_to_story,
    delete_story,
    get_my_stories,
    STORY_DURATION_HOURS,
    MAX_STORIES_PER_USER
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


@pytest.fixture
def story_id():
    return uuid.uuid4()


@pytest.mark.asyncio
async def test_create_story_success(mock_db, user_id):
    """Should create story successfully."""
    # No active stories (under limit)
    count_mock = MagicMock()
    count_mock.scalar.return_value = 0
    mock_db.execute = AsyncMock(return_value=count_mock)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    
    # Mock refresh to set created_at
    async def mock_refresh(obj):
        obj.id = uuid.uuid4()
        obj.created_at = datetime.utcnow()
        obj.expires_at = datetime.utcnow() + timedelta(hours=24)
        obj.view_count = 0
    
    mock_db.refresh = mock_refresh
    
    result = await create_story(
        mock_db, user_id, 
        media_url="https://example.com/image.jpg",
        media_type="image",
        caption="Test story"
    )
    
    assert result["success"] == True
    assert "story" in result


@pytest.mark.asyncio
async def test_create_story_invalid_media_type(mock_db, user_id):
    """Should reject invalid media type."""
    result = await create_story(
        mock_db, user_id,
        media_url="https://example.com/file.pdf",
        media_type="pdf"
    )
    
    assert result["success"] == False
    assert "тип" in result["message"].lower()


@pytest.mark.asyncio
async def test_create_story_limit_reached(mock_db, user_id):
    """Should reject when story limit reached."""
    # Already at max stories
    count_mock = MagicMock()
    count_mock.scalar.return_value = MAX_STORIES_PER_USER
    mock_db.execute = AsyncMock(return_value=count_mock)
    
    result = await create_story(
        mock_db, user_id,
        media_url="https://example.com/image.jpg",
        media_type="image"
    )
    
    assert result["success"] == False
    assert "лимит" in result["message"].lower()


@pytest.mark.asyncio
async def test_view_story_success(mock_db, user_id, story_id):
    """Should record story view and increment counter."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.user_id = uuid.uuid4()  # Different user
    mock_story.is_active = True
    mock_story.expires_at = datetime.utcnow() + timedelta(hours=12)
    mock_story.view_count = 5
    
    mock_db.get = AsyncMock(return_value=mock_story)
    
    # No existing view
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    
    result = await view_story(mock_db, story_id, user_id)
    
    assert result["success"] == True
    assert result["view_count"] == 6  # Incremented


@pytest.mark.asyncio
async def test_view_story_own_story(mock_db, user_id, story_id):
    """Should not count view on own story."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.user_id = user_id  # Same user
    mock_story.is_active = True
    mock_story.expires_at = datetime.utcnow() + timedelta(hours=12)
    mock_story.view_count = 5
    
    mock_db.get = AsyncMock(return_value=mock_story)
    
    result = await view_story(mock_db, story_id, user_id)
    
    assert result["success"] == True
    assert result["is_own"] == True
    assert result["view_count"] == 5  # Not incremented


@pytest.mark.asyncio
async def test_view_story_expired(mock_db, user_id, story_id):
    """Should reject view on expired story."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.is_active = True
    mock_story.expires_at = datetime.utcnow() - timedelta(hours=1)  # Expired
    
    mock_db.get = AsyncMock(return_value=mock_story)
    
    result = await view_story(mock_db, story_id, user_id)
    
    assert result["success"] == False
    assert "истекла" in result["message"]


@pytest.mark.asyncio
async def test_view_story_not_found(mock_db, user_id, story_id):
    """Should fail when story not found."""
    mock_db.get = AsyncMock(return_value=None)
    
    result = await view_story(mock_db, story_id, user_id)
    
    assert result["success"] == False
    assert "не найдена" in result["message"]


@pytest.mark.asyncio
async def test_react_to_story_success(mock_db, user_id, story_id):
    """Should add reaction to story."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.user_id = uuid.uuid4()  # Different user
    mock_story.is_active = True
    mock_story.expires_at = datetime.utcnow() + timedelta(hours=12)
    
    mock_db.get = AsyncMock(return_value=mock_story)
    
    # No existing reaction
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    
    result = await react_to_story(mock_db, story_id, user_id, "❤️")
    
    assert result["success"] == True
    assert result["action"] == "created"


@pytest.mark.asyncio
async def test_react_to_story_invalid_emoji(mock_db, user_id, story_id):
    """Should reject invalid emoji."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.user_id = uuid.uuid4()
    mock_story.is_active = True
    mock_story.expires_at = datetime.utcnow() + timedelta(hours=12)
    
    mock_db.get = AsyncMock(return_value=mock_story)
    
    result = await react_to_story(mock_db, story_id, user_id, "💀")  # Not in allowed list
    
    assert result["success"] == False
    assert "Недопустимая" in result["message"]


@pytest.mark.asyncio
async def test_react_to_own_story(mock_db, user_id, story_id):
    """Should not allow reaction on own story."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.user_id = user_id  # Same user
    mock_story.is_active = True
    mock_story.expires_at = datetime.utcnow() + timedelta(hours=12)
    
    mock_db.get = AsyncMock(return_value=mock_story)
    
    result = await react_to_story(mock_db, story_id, user_id, "❤️")
    
    assert result["success"] == False
    assert "свою" in result["message"]


@pytest.mark.asyncio
async def test_delete_story_success(mock_db, user_id, story_id):
    """Should delete story successfully."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.user_id = user_id
    
    mock_db.get = AsyncMock(return_value=mock_story)
    mock_db.execute = AsyncMock()
    mock_db.delete = AsyncMock()
    mock_db.commit = AsyncMock()
    
    result = await delete_story(mock_db, story_id, user_id)
    
    assert result["success"] == True


@pytest.mark.asyncio
async def test_delete_story_wrong_user(mock_db, user_id, story_id):
    """Should fail when deleting another user's story."""
    mock_story = MagicMock()
    mock_story.id = story_id
    mock_story.user_id = uuid.uuid4()  # Different user
    
    mock_db.get = AsyncMock(return_value=mock_story)
    
    result = await delete_story(mock_db, story_id, user_id)
    
    assert result["success"] == False
    assert "доступа" in result["message"]


def test_story_duration_hours():
    """STORY_DURATION_HOURS should be 24."""
    assert STORY_DURATION_HOURS == 24


def test_max_stories_per_user():
    """MAX_STORIES_PER_USER should be 10."""
    assert MAX_STORIES_PER_USER == 10
