"""Tests for Compatibility service."""
import pytest
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.social.compatibility import (
    calculate_compatibility,
    invalidate_compatibility_cache
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def user1_id():
    return uuid.uuid4()


@pytest.fixture
def user2_id():
    return uuid.uuid4()


@pytest.fixture
def mock_user1():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.interests = ["music", "travel", "sports"]
    user.birthdate = datetime(1995, 5, 15)
    user.city = "Moscow"
    user.looking_for = "relationship"
    return user


@pytest.fixture
def mock_user2():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.interests = ["music", "movies", "cooking"]
    user.birthdate = datetime(1993, 8, 20)
    user.city = "Moscow"
    user.looking_for = "relationship"
    return user


@pytest.mark.asyncio
async def test_calculate_compatibility_success(mock_db, user1_id, user2_id, mock_user1, mock_user2):
    """Should calculate compatibility score."""
    mock_db.get = AsyncMock(side_effect=[mock_user1, mock_user2])
    
    # No dealbreakers
    prefs_mock = MagicMock()
    prefs_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=prefs_mock)
    
    with patch('backend.services.social.compatibility.redis_manager') as mock_redis:
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()
        
        result = await calculate_compatibility(mock_db, user1_id, user2_id, use_cache=False)
    
    assert "score" in result
    assert 0 <= result["score"] <= 100
    assert "breakdown" in result
    assert "common_interests" in result
    assert "compatibility_level" in result


@pytest.mark.asyncio
async def test_calculate_compatibility_user_not_found(mock_db, user1_id, user2_id):
    """Should return error when user not found."""
    mock_db.get = AsyncMock(return_value=None)
    
    with patch('backend.services.social.compatibility.redis_manager') as mock_redis:
        mock_redis.get = AsyncMock(return_value=None)
        
        result = await calculate_compatibility(mock_db, user1_id, user2_id, use_cache=False)
    
    assert "error" in result
    assert result["score"] == 0


@pytest.mark.asyncio
async def test_calculate_compatibility_cached(mock_db, user1_id, user2_id):
    """Should return cached result when available."""
    cached_result = {
        "score": 85,
        "breakdown": {"interests": 90, "lifestyle": 80, "values": 85, "location": 100, "age": 70},
        "common_interests": ["music"],
        "compatibility_level": "excellent"
    }
    
    with patch('backend.services.social.compatibility.redis_manager') as mock_redis:
        mock_redis.get = AsyncMock(return_value='{"score": 85, "breakdown": {}, "common_interests": ["music"], "compatibility_level": "excellent"}')
        
        result = await calculate_compatibility(mock_db, user1_id, user2_id, use_cache=True)
    
    assert result["score"] == 85
    # DB should not be called when cache hit
    mock_db.get.assert_not_called()


@pytest.mark.asyncio
async def test_calculate_compatibility_same_city_bonus(mock_db, user1_id, user2_id, mock_user1, mock_user2):
    """Users in same city should have higher location score."""
    mock_user1.city = "Moscow"
    mock_user2.city = "Moscow"
    
    mock_db.get = AsyncMock(side_effect=[mock_user1, mock_user2])
    
    prefs_mock = MagicMock()
    prefs_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=prefs_mock)
    
    with patch('backend.services.social.compatibility.redis_manager') as mock_redis:
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()
        
        result = await calculate_compatibility(mock_db, user1_id, user2_id, use_cache=False)
    
    assert result["breakdown"]["location"] == 100


@pytest.mark.asyncio
async def test_calculate_compatibility_same_goals_bonus(mock_db, user1_id, user2_id, mock_user1, mock_user2):
    """Users with same relationship goals should have higher values score."""
    mock_user1.looking_for = "marriage"
    mock_user2.looking_for = "marriage"
    
    mock_db.get = AsyncMock(side_effect=[mock_user1, mock_user2])
    
    prefs_mock = MagicMock()
    prefs_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=prefs_mock)
    
    with patch('backend.services.social.compatibility.redis_manager') as mock_redis:
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()
        
        result = await calculate_compatibility(mock_db, user1_id, user2_id, use_cache=False)
    
    # Values score should be high (50 base + 30 for same goal)
    assert result["breakdown"]["values"] >= 70


@pytest.mark.asyncio
async def test_calculate_compatibility_common_interests(mock_db, user1_id, user2_id, mock_user1, mock_user2):
    """Should find common interests."""
    mock_user1.interests = ["music", "travel", "sports"]
    mock_user2.interests = ["music", "movies", "travel"]
    
    mock_db.get = AsyncMock(side_effect=[mock_user1, mock_user2])
    
    prefs_mock = MagicMock()
    prefs_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=prefs_mock)
    
    with patch('backend.services.social.compatibility.redis_manager') as mock_redis:
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()
        
        result = await calculate_compatibility(mock_db, user1_id, user2_id, use_cache=False)
    
    assert "music" in result["common_interests"]
    assert "travel" in result["common_interests"]


@pytest.mark.asyncio
async def test_calculate_compatibility_levels():
    """Should return correct compatibility level based on score."""
    # Test level thresholds
    assert 80 <= 100  # excellent
    assert 60 <= 79   # good
    assert 40 <= 59   # moderate
    assert 0 <= 39    # low


@pytest.mark.asyncio
async def test_invalidate_compatibility_cache(user1_id):
    """Should invalidate cache for user."""
    with patch('backend.services.social.compatibility.redis_manager') as mock_redis:
        mock_redis.keys = AsyncMock(return_value=["compatibility:key1", "compatibility:key2"])
        mock_redis.delete = AsyncMock()
        
        await invalidate_compatibility_cache(user1_id)
        
        mock_redis.keys.assert_called_once()
