"""Tests for Daily Rewards service."""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.gamification.daily_rewards import (
    get_daily_reward_status,
    claim_daily_reward,
    DEFAULT_REWARDS
)


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.stars_balance = Decimal("100")
    return user


@pytest.mark.asyncio
async def test_get_daily_reward_status_first_time(mock_db, mock_user):
    """First time user should have streak=1 and reward available."""
    mock_db.get = AsyncMock(return_value=mock_user)
    
    # No previous claims
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_daily_reward_status(mock_db, mock_user.id)
    
    assert result["available"] == True
    assert result["streak"] == 1
    assert result["reward"]["type"] == "stars"
    assert result["reward"]["value"] == 5  # Day 1 reward


@pytest.mark.asyncio
async def test_get_daily_reward_status_cooldown(mock_db, mock_user):
    """User who claimed less than 24h ago should not be able to claim."""
    mock_db.get = AsyncMock(return_value=mock_user)
    
    # Previous claim 12 hours ago
    last_claim = MagicMock()
    last_claim.claimed_at = datetime.utcnow() - timedelta(hours=12)
    last_claim.streak_day = 1
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = last_claim
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_daily_reward_status(mock_db, mock_user.id)
    
    assert result["available"] == False
    assert result["streak"] == 1
    assert result["next_reward_at"] is not None


@pytest.mark.asyncio
async def test_streak_continues(mock_db, mock_user):
    """Streak should continue if user claims between 24-48 hours."""
    mock_db.get = AsyncMock(return_value=mock_user)
    
    # Previous claim 30 hours ago (within 24-48h window)
    last_claim = MagicMock()
    last_claim.claimed_at = datetime.utcnow() - timedelta(hours=30)
    last_claim.streak_day = 3
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = last_claim
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_daily_reward_status(mock_db, mock_user.id)
    
    assert result["available"] == True
    assert result["streak"] == 4  # 3 + 1


@pytest.mark.asyncio
async def test_streak_resets_after_48h(mock_db, mock_user):
    """Streak should reset if user misses more than 48 hours."""
    mock_db.get = AsyncMock(return_value=mock_user)
    
    # Previous claim 60 hours ago (more than 48h)
    last_claim = MagicMock()
    last_claim.claimed_at = datetime.utcnow() - timedelta(hours=60)
    last_claim.streak_day = 5
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = last_claim
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_daily_reward_status(mock_db, mock_user.id)
    
    assert result["available"] == True
    assert result["streak"] == 1  # Reset to 1


@pytest.mark.asyncio
async def test_streak_cycles_after_day_7(mock_db, mock_user):
    """Streak should cycle back to 1 after day 7."""
    mock_db.get = AsyncMock(return_value=mock_user)
    
    # Previous claim was day 7, 30 hours ago
    last_claim = MagicMock()
    last_claim.claimed_at = datetime.utcnow() - timedelta(hours=30)
    last_claim.streak_day = 7
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = last_claim
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_daily_reward_status(mock_db, mock_user.id)
    
    assert result["available"] == True
    assert result["streak"] == 1  # Cycles back to 1


@pytest.mark.asyncio
async def test_day_7_bonus(mock_db, mock_user):
    """Day 7 should have streak bonus."""
    mock_db.get = AsyncMock(return_value=mock_user)
    
    # Previous claim was day 6, 30 hours ago
    last_claim = MagicMock()
    last_claim.claimed_at = datetime.utcnow() - timedelta(hours=30)
    last_claim.streak_day = 6
    
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = last_claim
    mock_db.execute = AsyncMock(return_value=result_mock)
    
    result = await get_daily_reward_status(mock_db, mock_user.id)
    
    assert result["streak"] == 7
    assert result["streak_bonus"] is not None
    assert result["streak_bonus"]["multiplier"] == 2


def test_default_rewards_structure():
    """DEFAULT_REWARDS should have 7 days with correct structure."""
    assert len(DEFAULT_REWARDS) == 7
    
    for i, reward in enumerate(DEFAULT_REWARDS):
        assert reward["day_number"] == i + 1
        assert "reward_type" in reward
        assert "reward_value" in reward
        assert "description" in reward
    
    # Day 7 should have highest stars reward
    assert DEFAULT_REWARDS[6]["reward_value"] == 50
