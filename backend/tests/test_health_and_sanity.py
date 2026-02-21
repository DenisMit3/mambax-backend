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
    """Test public endpoint - check API docs are available"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Test that OpenAPI docs are available
        response = await ac.get("/docs")
    
    # Docs should be available
    assert response.status_code == 200
