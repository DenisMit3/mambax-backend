"""Tests for Spotlight service."""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from backend.services.social.spotlight import (
    get_spotlight_profiles,
    join_spotlight,
    get_spotlight_stats,
    SPOTLIGHT_COST_STARS,
    SPOTLIGHT_DURATION_HOURS
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


@pytest.mark.asyncio
async def test_get_spotlight_profiles_empty(mock_db, user_id):
    """Should return empty list when no spotlight entries."""
    # No swiped users
    swiped_mock = MagicMock()
    swiped_mock.all.return_value = []
    
    # No spotlight entries
    entries_mock = MagicMock()
    entries_mock.scalars.return_value.all.return_value = []
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        if call_count[0] == 1:
            return swiped_mock
        return entries_mock
    
    mock_db.execute = mock_execute
    mock_db.commit = AsyncMock()
    
    result = await get_spotlight_profiles(mock_db, user_id, limit=10)
    
    assert result["profiles"] == []
    assert result["total"] == 0
    assert "refresh_at" in result


@pytest.mark.asyncio
async def test_join_spotlight_success(mock_db, user_id):
    """Should join spotlight successfully with enough stars."""
    # No existing active entry
    existing_mock = MagicMock()
    existing_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=existing_mock)
    
    # User with enough stars
    mock_user = MagicMock()
    mock_user.stars_balance = Decimal("200")
    mock_db.get = AsyncMock(return_value=mock_user)
    
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    result = await join_spotlight(mock_db, user_id, duration_hours=1)
    
    assert result["success"] == True
    assert "entry" in result
    assert result["cost"] == SPOTLIGHT_COST_STARS


@pytest.mark.asyncio
async def test_join_spotlight_insufficient_stars(mock_db, user_id):
    """Should fail when user doesn't have enough stars."""
    # No existing active entry
    existing_mock = MagicMock()
    existing_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=existing_mock)
    
    # User with insufficient stars
    mock_user = MagicMock()
    mock_user.stars_balance = Decimal("10")  # Less than SPOTLIGHT_COST_STARS
    mock_db.get = AsyncMock(return_value=mock_user)
    
    result = await join_spotlight(mock_db, user_id, duration_hours=1)
    
    assert result["success"] == False
    assert "Недостаточно" in result["message"]


@pytest.mark.asyncio
async def test_join_spotlight_already_active(mock_db, user_id):
    """Should fail when user already has active spotlight."""
    # Existing active entry
    existing_entry = MagicMock()
    existing_entry.expires_at = datetime.utcnow() + timedelta(hours=1)
    
    existing_mock = MagicMock()
    existing_mock.scalar_one_or_none.return_value = existing_entry
    mock_db.execute = AsyncMock(return_value=existing_mock)
    
    result = await join_spotlight(mock_db, user_id, duration_hours=1)
    
    assert result["success"] == False
    assert "уже в Spotlight" in result["message"]


@pytest.mark.asyncio
async def test_join_spotlight_user_not_found(mock_db, user_id):
    """Should fail when user not found."""
    # No existing active entry
    existing_mock = MagicMock()
    existing_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=existing_mock)
    
    # User not found
    mock_db.get = AsyncMock(return_value=None)
    
    result = await join_spotlight(mock_db, user_id, duration_hours=1)
    
    assert result["success"] == False
    assert "не найден" in result["message"]


@pytest.mark.asyncio
async def test_get_spotlight_stats_no_active(mock_db, user_id):
    """Should return stats with no active entry."""
    # No active entry
    active_mock = MagicMock()
    active_mock.scalar_one_or_none.return_value = None
    
    # Total stats
    total_mock = MagicMock()
    total_mock.one.return_value = (100, 10)  # impressions, clicks
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        if call_count[0] == 1:
            return active_mock
        return total_mock
    
    mock_db.execute = mock_execute
    
    result = await get_spotlight_stats(mock_db, user_id)
    
    assert result["is_active"] == False
    assert result["current_entry"] is None
    assert result["total_impressions"] == 100
    assert result["total_clicks"] == 10


@pytest.mark.asyncio
async def test_get_spotlight_stats_with_active(mock_db, user_id):
    """Should return stats with active entry."""
    # Active entry
    active_entry = MagicMock()
    active_entry.expires_at = datetime.utcnow() + timedelta(minutes=30)
    active_entry.impressions = 50
    active_entry.clicks = 5
    
    active_mock = MagicMock()
    active_mock.scalar_one_or_none.return_value = active_entry
    
    # Total stats
    total_mock = MagicMock()
    total_mock.one.return_value = (150, 15)
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        if call_count[0] == 1:
            return active_mock
        return total_mock
    
    mock_db.execute = mock_execute
    
    result = await get_spotlight_stats(mock_db, user_id)
    
    assert result["is_active"] == True
    assert result["current_entry"] is not None
    assert result["current_entry"]["impressions"] == 50


def test_spotlight_cost_stars():
    """SPOTLIGHT_COST_STARS should be 100."""
    assert SPOTLIGHT_COST_STARS == 100


def test_spotlight_duration_hours():
    """SPOTLIGHT_DURATION_HOURS should be 1."""
    assert SPOTLIGHT_DURATION_HOURS == 1
