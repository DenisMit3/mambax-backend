"""Tests for Profile Views service."""
import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

from backend.services.social.profile_views import (
    record_profile_view,
    get_who_viewed_me,
    get_view_count,
    get_view_stats,
    VIEW_COOLDOWN_HOURS
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def viewer_id():
    return uuid.uuid4()


@pytest.fixture
def viewed_id():
    return uuid.uuid4()


@pytest.mark.asyncio
async def test_record_profile_view_success(mock_db, viewer_id, viewed_id):
    """Should record profile view successfully."""
    # No existing view
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    
    result = await record_profile_view(mock_db, viewer_id, viewed_id, "discover")
    
    assert result["recorded"] == True
    mock_db.add.assert_called_once()


@pytest.mark.asyncio
async def test_record_profile_view_self_view(mock_db, viewer_id):
    """Should ignore self-view."""
    result = await record_profile_view(mock_db, viewer_id, viewer_id, "discover")
    
    assert result["recorded"] == False
    assert "Self view" in result["message"]


@pytest.mark.asyncio
async def test_record_profile_view_cooldown(mock_db, viewer_id, viewed_id):
    """Should update existing view within cooldown period."""
    # Existing view within cooldown
    existing_view = MagicMock()
    existing_view.created_at = datetime.utcnow() - timedelta(hours=12)
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = existing_view
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.commit = AsyncMock()
    
    result = await record_profile_view(mock_db, viewer_id, viewed_id, "discover")
    
    assert result["recorded"] == False
    assert "cooldown" in result["message"]


@pytest.mark.asyncio
async def test_get_who_viewed_me_empty(mock_db, viewed_id):
    """Should return empty list when no views."""
    # Total count = 0
    count_mock = MagicMock()
    count_mock.scalar.return_value = 0
    mock_db.execute = AsyncMock(return_value=count_mock)
    
    result = await get_who_viewed_me(mock_db, viewed_id, limit=20, is_vip=False)
    
    assert result["viewers"] == []
    assert result["total"] == 0


@pytest.mark.asyncio
async def test_get_who_viewed_me_vip_full_data(mock_db, viewed_id, viewer_id):
    """VIP user should see full viewer data."""
    # Total count
    count_mock = MagicMock()
    count_mock.scalar.return_value = 1
    
    # Views data
    view_data = MagicMock()
    view_data.viewer_id = viewer_id
    view_data.source = "discover"
    view_data.last_viewed_at = datetime.utcnow()
    
    views_mock = MagicMock()
    views_mock.all.return_value = [view_data]
    
    # Viewer user
    viewer_user = MagicMock()
    viewer_user.name = "John Doe"
    viewer_user.photo_url = "https://example.com/photo.jpg"
    viewer_user.is_verified = True
    viewer_user.birthdate = datetime(1990, 1, 1)
    viewer_user.last_active = datetime.utcnow()
    viewer_user.city = "Moscow"
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        if call_count[0] == 1:
            return count_mock
        return views_mock
    
    mock_db.execute = mock_execute
    mock_db.get = AsyncMock(return_value=viewer_user)
    
    result = await get_who_viewed_me(mock_db, viewed_id, limit=20, is_vip=True)
    
    assert result["is_premium_feature"] == False
    assert result["blur_photos"] == False


@pytest.mark.asyncio
async def test_get_who_viewed_me_free_blurred(mock_db, viewed_id):
    """Free user should see blurred data."""
    # Total count
    count_mock = MagicMock()
    count_mock.scalar.return_value = 1
    mock_db.execute = AsyncMock(return_value=count_mock)
    
    result = await get_who_viewed_me(mock_db, viewed_id, limit=20, is_vip=False)
    
    assert result["is_premium_feature"] == True
    assert result["blur_photos"] == True


@pytest.mark.asyncio
async def test_get_view_count(mock_db, viewed_id):
    """Should return view count for period."""
    result_mock = MagicMock()
    result_mock.scalar.return_value = 42
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    count = await get_view_count(mock_db, viewed_id, days=7)
    
    assert count == 42


@pytest.mark.asyncio
async def test_get_view_stats(mock_db, viewed_id):
    """Should return view statistics."""
    result_mock = MagicMock()
    result_mock.scalar.return_value = 10
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    stats = await get_view_stats(mock_db, viewed_id)
    
    assert "today" in stats
    assert "this_week" in stats
    assert "this_month" in stats
    assert "unique_viewers" in stats


def test_view_cooldown_hours():
    """VIEW_COOLDOWN_HOURS should be 24."""
    assert VIEW_COOLDOWN_HOURS == 24
