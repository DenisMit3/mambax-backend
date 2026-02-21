"""Tests for Matching Preferences service."""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from backend.services.social.preferences import (
    get_matching_preferences,
    update_matching_preferences,
    set_dealbreaker,
    reset_preferences,
    get_preference_suggestions,
    PREFERENCE_SCHEMA
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def user_id():
    return uuid.uuid4()


@pytest.mark.asyncio
async def test_get_matching_preferences_defaults(mock_db, user_id):
    """Should return default preferences when user has none."""
    # No existing preferences
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_matching_preferences(mock_db, user_id)
    
    assert "preferences" in result
    assert "dealbreakers" in result
    assert "schema" in result
    
    # Check defaults
    prefs = result["preferences"]
    assert prefs["age_min"] == 18
    assert prefs["age_max"] == 50
    assert prefs["gender"] == "any"


@pytest.mark.asyncio
async def test_get_matching_preferences_with_data(mock_db, user_id):
    """Should return user's saved preferences."""
    # Existing preferences
    pref1 = MagicMock()
    pref1.key = "age"
    pref1.value = {"min": 25, "max": 35}
    pref1.is_dealbreaker = False
    
    pref2 = MagicMock()
    pref2.key = "smoking"
    pref2.value = ["never"]
    pref2.is_dealbreaker = True
    
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = [pref1, pref2]
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_matching_preferences(mock_db, user_id)
    
    assert result["preferences"]["age_min"] == 25
    assert result["preferences"]["age_max"] == 35
    assert result["preferences"]["smoking"] == ["never"]
    assert "smoking" in result["dealbreakers"]


@pytest.mark.asyncio
async def test_update_matching_preferences_success(mock_db, user_id):
    """Should update preferences successfully."""
    # No existing preference for this key
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    
    preferences = {
        "age_min": 20,
        "age_max": 40,
        "gender": "female"
    }
    
    result = await update_matching_preferences(mock_db, user_id, preferences)
    
    assert result["success"] == True
    assert len(result["updated"]) > 0


@pytest.mark.asyncio
async def test_update_matching_preferences_with_dealbreakers(mock_db, user_id):
    """Should set dealbreakers correctly."""
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    
    preferences = {
        "smoking": ["never", "socially"],
        "children": ["no", "dont_want"]
    }
    dealbreakers = ["smoking"]
    
    result = await update_matching_preferences(mock_db, user_id, preferences, dealbreakers)
    
    assert result["success"] == True


@pytest.mark.asyncio
async def test_set_dealbreaker_success(mock_db, user_id):
    """Should set dealbreaker flag on preference."""
    mock_pref = MagicMock()
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = mock_pref
    mock_db.execute = AsyncMock(return_value=result_mock)
    mock_db.commit = AsyncMock()
    
    result = await set_dealbreaker(mock_db, user_id, "smoking", True)
    
    assert result["success"] == True
    assert mock_pref.is_dealbreaker == True


@pytest.mark.asyncio
async def test_set_dealbreaker_not_found(mock_db, user_id):
    """Should fail when preference not found."""
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await set_dealbreaker(mock_db, user_id, "nonexistent", True)
    
    assert result["success"] == False
    assert "не найдено" in result["message"]


@pytest.mark.asyncio
async def test_reset_preferences(mock_db, user_id):
    """Should reset all preferences."""
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()
    
    result = await reset_preferences(mock_db, user_id)
    
    assert result["success"] == True
    assert "сброшены" in result["message"]


@pytest.mark.asyncio
async def test_get_preference_suggestions_no_dealbreakers(mock_db, user_id):
    """Should suggest setting dealbreakers when none set."""
    mock_user = MagicMock()
    mock_db.get = AsyncMock(return_value=mock_user)
    
    # No dealbreakers set
    prefs_result = {
        "preferences": {"age_min": 18, "age_max": 100, "distance_km_max": 500},
        "dealbreakers": [],
        "schema": PREFERENCE_SCHEMA
    }
    
    # Mock get_matching_preferences
    result_mock = MagicMock()
    result_mock.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    suggestions = await get_preference_suggestions(mock_db, user_id)
    
    # Should suggest setting dealbreakers
    assert any("dealbreaker" in s.get("key", "").lower() or "dealbreaker" in s.get("message", "").lower() 
               for s in suggestions)


def test_preference_schema_structure():
    """PREFERENCE_SCHEMA should have correct structure."""
    assert "basic" in PREFERENCE_SCHEMA
    assert "appearance" in PREFERENCE_SCHEMA
    assert "lifestyle" in PREFERENCE_SCHEMA
    assert "values" in PREFERENCE_SCHEMA
    
    # Check basic preferences
    assert "age" in PREFERENCE_SCHEMA["basic"]
    assert "distance_km" in PREFERENCE_SCHEMA["basic"]
    assert "gender" in PREFERENCE_SCHEMA["basic"]
    
    # Check lifestyle preferences
    assert "smoking" in PREFERENCE_SCHEMA["lifestyle"]
    assert "drinking" in PREFERENCE_SCHEMA["lifestyle"]
    assert "children" in PREFERENCE_SCHEMA["lifestyle"]
