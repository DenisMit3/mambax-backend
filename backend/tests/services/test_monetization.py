import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from backend.services.monetization import get_or_create_default_plans, buy_subscription_with_stars
from backend.models.user import User
from backend.models.monetization import SubscriptionPlan

@pytest.mark.asyncio
async def test_get_or_create_default_plans_creates_if_missing():
    db = AsyncMock()
    # Mock scalar to return None for both gold and platinum
    db.scalar.side_effect = [None, None]
    
    await get_or_create_default_plans(db)
    
    # Should have added 2 plans
    assert db.add.call_count == 2
    assert db.commit.called

@pytest.mark.asyncio
async def test_get_or_create_default_plans_skips_if_exists():
    db = AsyncMock()
    # Mock scalar to return object
    db.scalar.side_effect = [MagicMock(), MagicMock()]
    
    await get_or_create_default_plans(db)
    
    assert db.add.call_count == 0
    assert db.commit.called

@pytest.mark.asyncio
async def test_buy_subscription_success():
    db = AsyncMock()
    user_id = "test_user"
    
    # Mock plan
    plan = MagicMock(spec=SubscriptionPlan)
    plan.price = Decimal("500")
    plan.duration_days = 30
    plan.id = "plan_id"
    plan.name = "Gold"
    
    # Mock scalar for plan query
    # First call in buy_subscription_with_stars calls get_or_create_default_plans which calls scalar twice
    # Then it calls scalar for the plan itself.
    # So we need to handle get_or_create_default_plans calls too.
    # Easier to mock get_or_create_default_plans
    
    with patch("backend.services.monetization.get_or_create_default_plans", new_callable=AsyncMock) as mock_get_defaults:
        db.scalar.return_value = plan
        
        # Mock user
        user = MagicMock(spec=User)
        user.stars_balance = Decimal("600")
        db.get.return_value = user
        
        result = await buy_subscription_with_stars(db, user_id, "gold")
        
        assert result["success"] is True
        assert user.stars_balance == Decimal("100")
        assert user.subscription_tier == "gold"
        assert db.add.call_count == 2 # subscription + transaction
        assert db.commit.called

@pytest.mark.asyncio
async def test_buy_subscription_insufficient_balance():
    db = AsyncMock()
    user_id = "test_user"
    
    with patch("backend.services.monetization.get_or_create_default_plans", new_callable=AsyncMock):
        plan = MagicMock(spec=SubscriptionPlan)
        plan.price = Decimal("500")
        db.scalar.return_value = plan
        
        user = MagicMock(spec=User)
        user.stars_balance = Decimal("100")
        db.get.return_value = user
        
        result = await buy_subscription_with_stars(db, user_id, "gold")
        
        assert result["success"] is False
        assert result["error"] == "insufficient_balance"
        db.commit.assert_not_called()
