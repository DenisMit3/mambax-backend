
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.models.user import User
from backend.api.admin import get_current_admin
from backend.database import get_db

# Initialize TestClient
client = TestClient(app)

# Mock Data
MOCK_ADMIN_ID = "00000000-0000-0000-0000-000000000000"
mock_admin_user = User(
    id=MOCK_ADMIN_ID,
    email="admin@example.com",
    role="admin",
    name="Admin User"
)

mock_regular_user = User(
    id="11111111-1111-1111-1111-111111111111",
    email="user@example.com",
    role="user",
    name="Regular User"
)

# Mock Database Session
class MockAsyncSession:
    async def execute(self, query):
        # Return a mock result that can be scalar()'d or scalars().all()'d
        mock_result = MagicMock()
        mock_result.scalar.return_value = 100
        mock_result.scalars.return_value.all.return_value = []
        mock_result.scalars.return_value.first.return_value = None
        mock_result.scalar_one_or_none.return_value = None
        return mock_result

    async def commit(self):
        pass

    async def add(self, obj):
        pass

    async def refresh(self, obj):
        pass
        
    async def close(self):
        pass

async def override_get_db():
    session = MockAsyncSession()
    yield session

# Auth Overrides
def override_admin_auth():
    return mock_admin_user

def override_regular_auth():
    from fastapi import HTTPException, status
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin privileges required"
    )

@pytest.fixture
def admin_client():
    app.dependency_overrides[get_current_admin] = override_admin_auth
    app.dependency_overrides[get_db] = override_get_db
    yield client
    app.dependency_overrides = {}

@pytest.fixture
def user_client():
    app.dependency_overrides[get_current_admin] = override_regular_auth
    app.dependency_overrides[get_db] = override_get_db
    yield client
    app.dependency_overrides = {}

@pytest.fixture
def unauth_client():
    app.dependency_overrides = {} # Reset
    # Ensure get_db is safe for tests, though unauth shouldn't hit DB if auth fails first
    app.dependency_overrides[get_db] = override_get_db 
    yield client
    app.dependency_overrides = {}


# ============================================================================
# TESTS
# ============================================================================

def test_admin_dashboard_access_denied_metrics(user_client):
    """Confirm non-admin users receive 403 on metrics"""
    response = user_client.get("/admin/dashboard/metrics")
    assert response.status_code == 403
    assert "Admin privileges required" in response.json()["detail"]

def test_admin_dashboard_access_denied_users(user_client):
    """Confirm non-admin users receive 403 on users list"""
    response = user_client.get("/admin/users")
    assert response.status_code == 403

def test_admin_metrics_success(admin_client):
    """Confirm admin can access metrics (Real Data flow)"""
    # Note: DB results are mocked to return 100 or []
    response = admin_client.get("/admin/dashboard/metrics")
    
    assert response.status_code == 200
    data = response.json()
    # Check structure from DashboardMetrics model
    assert "total_users" in data
    assert "revenue_today" in data
    assert "active_today" in data
    # Mock returned 100 for scalars
    assert data["total_users"] == 100

def test_admin_users_list_success(admin_client):
    """Confirm admin can access user list"""
    response = admin_client.get("/admin/users")
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "total" in data

def test_admin_perform_action(admin_client):
    """Confirm state-changing actions are accessible"""
    # Mock a specific user ID for the path
    user_id = "00000000-0000-0000-0000-000000000000"
    
    # We need to mock the SELECT query for the user check in perform_user_action
    # Since our simple MockAsyncSession returns None for scalar_one_or_none, this might 404
    # But checking for 404 proves we passed the 403 Auth check.
    response = admin_client.post(
        f"/admin/users/{user_id}/action",
        params={"action": "verify"}
    )
    
    # Passing auth means we get 404 (user not found in mock DB) or 200.
    # If we failed auth, we would get 403.
    assert response.status_code != 403 

def test_admin_system_health(admin_client):
    """Confirm system health endpoint"""
    response = admin_client.get("/admin/system/health")
    assert response.status_code == 200
    assert "services" in response.json()
    assert response.json()["overall_status"] == "healthy"
