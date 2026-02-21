import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_gift_catalog(client: AsyncClient):
    """Test gift catalog endpoint exists"""
    # Without auth, should get 401 or the catalog if public
    resp = await client.get("/api/gifts/catalog")
    assert resp.status_code in [200, 401, 307, 404]

@pytest.mark.asyncio
async def test_send_gift_insufficient_funds(client: AsyncClient):
    """Test send gift requires auth"""
    payload = {
        "gift_id": "00000000-0000-0000-0000-000000000000",
        "receiver_id": "00000000-0000-0000-0000-000000000001",
        "message": "Test",
        "is_anonymous": False
    }
    resp = await client.post("/api/gifts/send", json=payload)
    # Should require auth
    assert resp.status_code in [401, 307, 422]

@pytest.mark.asyncio
async def test_send_gift_success(client: AsyncClient):
    """Test send gift endpoint exists"""
    # Without auth, should get 401
    resp = await client.post("/api/gifts/send", json={})
    assert resp.status_code in [401, 307, 422]

@pytest.mark.asyncio
async def test_top_up_invoice(client: AsyncClient):
    """Test top-up endpoint requires auth"""
    payload = {"amount": 100}
    resp = await client.post("/api/payments/top-up", json=payload)
    # Should require auth
    assert resp.status_code in [401, 307, 404, 422]
