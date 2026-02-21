"""Tests for Events service."""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from backend.services.social.events import (
    get_events,
    get_event_details,
    register_for_event,
    cancel_registration,
    get_my_events,
    create_event
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


@pytest.fixture
def event_id():
    return uuid.uuid4()


@pytest.fixture
def mock_event():
    event = MagicMock()
    event.id = uuid.uuid4()
    event.name = "Speed Dating Night"
    event.event_type = "speed_dating"
    event.status = "upcoming"
    event.start_date = datetime.utcnow() + timedelta(days=7)
    event.max_participants = 20
    event.current_participants = 10
    event.is_premium = False
    event.host_name = "MambaX"
    event.created_at = datetime.utcnow()
    return event


@pytest.mark.asyncio
async def test_get_events_empty(mock_db, user_id):
    """Should return empty list when no events."""
    # Count = 0
    count_mock = MagicMock()
    count_mock.scalar.return_value = 0
    
    # Empty events list
    events_mock = MagicMock()
    events_mock.scalars.return_value.all.return_value = []
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        if call_count[0] == 1:
            return count_mock
        return events_mock
    
    mock_db.execute = mock_execute
    
    result = await get_events(mock_db, user_id)
    
    assert result["events"] == []
    assert result["total"] == 0
    assert "categories" in result


@pytest.mark.asyncio
async def test_get_events_with_data(mock_db, user_id, mock_event):
    """Should return list of events."""
    # Count = 1
    count_mock = MagicMock()
    count_mock.scalar.return_value = 1
    
    # One event
    events_mock = MagicMock()
    events_mock.scalars.return_value.all.return_value = [mock_event]
    
    call_count = [0]
    async def mock_execute(stmt):
        call_count[0] += 1
        if call_count[0] == 1:
            return count_mock
        return events_mock
    
    mock_db.execute = mock_execute
    
    result = await get_events(mock_db, user_id)
    
    assert len(result["events"]) == 1
    assert result["events"][0]["title"] == "Speed Dating Night"
    assert result["total"] == 1


@pytest.mark.asyncio
async def test_get_event_details_success(mock_db, user_id, event_id, mock_event):
    """Should return event details."""
    mock_db.get = AsyncMock(return_value=mock_event)
    
    result = await get_event_details(mock_db, event_id, user_id)
    
    assert result["title"] == "Speed Dating Night"
    assert result["category"] == "speed_dating"
    assert result["max_participants"] == 20


@pytest.mark.asyncio
async def test_get_event_details_not_found(mock_db, user_id, event_id):
    """Should return error when event not found."""
    mock_db.get = AsyncMock(return_value=None)
    
    result = await get_event_details(mock_db, event_id, user_id)
    
    assert "error" in result


@pytest.mark.asyncio
async def test_register_for_event_success(mock_db, user_id, event_id, mock_event):
    """Should register for event successfully."""
    mock_db.get = AsyncMock(return_value=mock_event)
    
    # User
    mock_user = MagicMock()
    mock_user.stars_balance = Decimal("100")
    mock_user.is_vip = False
    
    async def mock_get(model, id):
        if str(id) == str(event_id):
            return mock_event
        return mock_user
    
    mock_db.get = mock_get
    mock_db.commit = AsyncMock()
    
    result = await register_for_event(mock_db, event_id, user_id)
    
    assert result["success"] == True
    assert "registration" in result


@pytest.mark.asyncio
async def test_register_for_event_not_found(mock_db, user_id, event_id):
    """Should fail when event not found."""
    mock_db.get = AsyncMock(return_value=None)
    
    result = await register_for_event(mock_db, event_id, user_id)
    
    assert result["success"] == False
    assert "не найдено" in result["message"]


@pytest.mark.asyncio
async def test_register_for_event_full(mock_db, user_id, event_id, mock_event):
    """Should fail when event is full."""
    mock_event.current_participants = 20  # Same as max
    mock_db.get = AsyncMock(return_value=mock_event)
    
    mock_user = MagicMock()
    mock_user.is_vip = False
    
    async def mock_get(model, id):
        if str(id) == str(event_id):
            return mock_event
        return mock_user
    
    mock_db.get = mock_get
    
    result = await register_for_event(mock_db, event_id, user_id)
    
    assert result["success"] == False
    assert "заняты" in result["message"]


@pytest.mark.asyncio
async def test_register_for_event_past(mock_db, user_id, event_id, mock_event):
    """Should fail when event already started."""
    mock_event.start_date = datetime.utcnow() - timedelta(hours=1)  # Past
    mock_db.get = AsyncMock(return_value=mock_event)
    
    result = await register_for_event(mock_db, event_id, user_id)
    
    assert result["success"] == False
    assert "началось" in result["message"]


@pytest.mark.asyncio
async def test_register_for_premium_event_no_vip(mock_db, user_id, event_id, mock_event):
    """Should fail for premium event without VIP or payment."""
    mock_event.is_premium = True
    mock_db.get = AsyncMock(return_value=mock_event)
    
    mock_user = MagicMock()
    mock_user.is_vip = False
    
    async def mock_get(model, id):
        if str(id) == str(event_id):
            return mock_event
        return mock_user
    
    mock_db.get = mock_get
    
    result = await register_for_event(mock_db, event_id, user_id, use_stars=False)
    
    assert result["success"] == False
    assert "премиум" in result["message"].lower()


@pytest.mark.asyncio
async def test_cancel_registration_success(mock_db, user_id, event_id, mock_event):
    """Should cancel registration successfully."""
    mock_event.current_participants = 10
    mock_db.get = AsyncMock(return_value=mock_event)
    mock_db.commit = AsyncMock()
    
    result = await cancel_registration(mock_db, event_id, user_id)
    
    assert result["success"] == True
    assert mock_event.current_participants == 9  # Decremented


@pytest.mark.asyncio
async def test_cancel_registration_not_found(mock_db, user_id, event_id):
    """Should fail when event not found."""
    mock_db.get = AsyncMock(return_value=None)
    
    result = await cancel_registration(mock_db, event_id, user_id)
    
    assert result["success"] == False


@pytest.mark.asyncio
async def test_get_my_events(mock_db, user_id):
    """Should return empty list (current implementation)."""
    result = await get_my_events(mock_db, user_id)
    
    # Current implementation returns empty list
    # TODO: Implement when event_registrations table is added
    assert result == []


@pytest.mark.asyncio
async def test_create_event_success(mock_db):
    """Should create event successfully."""
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    data = {
        "title": "New Event",
        "category": "mixer",
        "event_date": (datetime.utcnow() + timedelta(days=14)).isoformat(),
        "max_participants": 50
    }
    
    result = await create_event(mock_db, data)
    
    assert result["success"] == True
    assert "event_id" in result
