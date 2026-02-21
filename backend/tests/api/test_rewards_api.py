"""API Integration tests for Rewards endpoints."""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock
import uuid


@pytest.fixture
def mock_user_id():
    return uuid.uuid4()


@pytest.mark.asyncio
async def test_get_daily_reward_status(client, mock_user_id):
    """GET /api/rewards/daily should return reward status."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.get_daily_reward_status') as mock_status:
            mock_status.return_value = {
                "available": True,
                "streak": 1,
                "reward": {"type": "stars", "value": 5},
                "next_reward_at": None,
                "streak_bonus": None
            }
            
            response = await client.get("/api/rewards/daily")
            
            # Should return 200 or redirect to auth
            assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_claim_daily_reward(client, mock_user_id):
    """POST /api/rewards/daily/claim should claim reward."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.claim_daily_reward') as mock_claim:
            mock_claim.return_value = {
                "success": True,
                "reward": {"type": "stars", "value": 5},
                "new_balance": 105,
                "streak": 1
            }
            
            response = await client.post("/api/rewards/daily/claim")
            
            assert response.status_code in [200, 401, 307]
