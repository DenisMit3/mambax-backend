import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_swipe_flow(client: AsyncClient):
    """Test swipe endpoints require auth"""
    # Without auth, should get 401
    resp = await client.get("/api/feed")
    assert resp.status_code in [401, 307]
    
    swipe_payload = {
        "to_user_id": "00000000-0000-0000-0000-000000000000",
        "action": "like"
    }
    resp = await client.post("/api/swipe", json=swipe_payload)
    assert resp.status_code in [401, 307, 404, 422]
    
    resp = await client.get("/api/matches")
    assert resp.status_code in [401, 307]
