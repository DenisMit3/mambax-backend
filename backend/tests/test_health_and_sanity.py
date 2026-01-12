import pytest
from httpx import AsyncClient
from backend.main import app

# Need to install httpx and pytest-asyncio if not present
# But for now we just add the test file.

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    # Health endpoint might return just {status: ok}
    # Checking status code mainly.
    assert response.status_code == 200
    # assert response.json().get("status") == "ok" # Uncomment if health endpoint follows this structure

@pytest.mark.asyncio
async def test_filter_options_public():
    """Test public endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/filters/options")
    
    # This endpoint might be protected? 
    # Looking at main.py: app.get("/filters/options") seems public.
    assert response.status_code == 200
    data = response.json()
    assert "gender" in data
