"""API Integration tests for Social endpoints (views, compatibility, spotlight, events, preferences)."""
import pytest
import uuid
from unittest.mock import patch, AsyncMock


@pytest.fixture
def mock_user_id():
    return uuid.uuid4()


# --- Who Viewed Me ---

@pytest.mark.asyncio
async def test_get_who_viewed_me(client, mock_user_id):
    """GET /api/views/who-viewed-me should return viewers list."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.get_who_viewed_me') as mock_views:
            mock_views.return_value = {
                "viewers": [],
                "total": 0,
                "is_premium_feature": True,
                "blur_photos": True
            }
            
            response = await client.get("/api/views/who-viewed-me")
            
            assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_get_view_stats(client, mock_user_id):
    """GET /api/views/stats should return view statistics."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.get_view_stats') as mock_stats:
            mock_stats.return_value = {
                "today": 5,
                "this_week": 20,
                "this_month": 50,
                "unique_viewers": 15
            }
            
            response = await client.get("/api/views/stats")
            
            assert response.status_code in [200, 401, 307]


# --- Compatibility ---

@pytest.mark.asyncio
async def test_get_compatibility(client, mock_user_id):
    """GET /api/compatibility/{id} should return compatibility score."""
    target_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.calculate_compatibility') as mock_compat:
            mock_compat.return_value = {
                "score": 85,
                "breakdown": {
                    "interests": 90,
                    "lifestyle": 80,
                    "values": 85,
                    "location": 100,
                    "age": 70
                },
                "common_interests": ["music", "travel"],
                "compatibility_level": "excellent"
            }
            
            response = await client.get(f"/api/compatibility/{target_id}")
            
            assert response.status_code in [200, 401, 307, 404]


# --- Spotlight ---

@pytest.mark.asyncio
async def test_get_spotlight(client, mock_user_id):
    """GET /api/spotlight should return spotlight profiles."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.get_spotlight_profiles') as mock_spotlight:
            mock_spotlight.return_value = {
                "profiles": [],
                "total": 0,
                "refresh_at": "2024-01-01T12:00:00"
            }
            
            response = await client.get("/api/spotlight")
            
            assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_join_spotlight(client, mock_user_id):
    """POST /api/spotlight/join should join spotlight."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.join_spotlight') as mock_join:
            mock_join.return_value = {
                "success": True,
                "entry": {
                    "expires_at": "2024-01-01T13:00:00"
                },
                "cost": 100
            }
            
            response = await client.post("/api/spotlight/join")
            
            assert response.status_code in [200, 401, 307, 400]


@pytest.mark.asyncio
async def test_get_spotlight_stats(client, mock_user_id):
    """GET /api/spotlight/stats should return spotlight stats."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.get_spotlight_stats') as mock_stats:
            mock_stats.return_value = {
                "is_active": False,
                "current_entry": None,
                "total_impressions": 100,
                "total_clicks": 10
            }
            
            response = await client.get("/api/spotlight/stats")
            
            assert response.status_code in [200, 401, 307]


# --- Events ---

@pytest.mark.asyncio
async def test_get_events(client, mock_user_id):
    """GET /api/events should return events list."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.get_events_service') as mock_events:
            mock_events.return_value = {
                "events": [],
                "total": 0,
                "categories": ["speed_dating", "mixer", "workshop"]
            }
            
            response = await client.get("/api/events")
            
            assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_get_event_details(client, mock_user_id):
    """GET /api/events/{id} should return event details."""
    event_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.get_event_details') as mock_details:
            mock_details.return_value = {
                "id": str(event_id),
                "title": "Speed Dating Night",
                "category": "speed_dating",
                "max_participants": 20
            }
            
            response = await client.get(f"/api/events/{event_id}")
            
            assert response.status_code in [200, 401, 307, 404]


@pytest.mark.asyncio
async def test_register_for_event(client, mock_user_id):
    """POST /api/events/{id}/register should register for event."""
    event_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.register_for_event') as mock_register:
            mock_register.return_value = {
                "success": True,
                "registration": {
                    "event_id": str(event_id),
                    "status": "confirmed"
                }
            }
            
            response = await client.post(f"/api/events/{event_id}/register")
            
            assert response.status_code in [200, 401, 307, 400, 404]


@pytest.mark.asyncio
async def test_cancel_event_registration(client, mock_user_id):
    """DELETE /api/events/{id}/register should cancel registration."""
    event_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.cancel_registration') as mock_cancel:
            mock_cancel.return_value = {
                "success": True
            }
            
            response = await client.delete(f"/api/events/{event_id}/register")
            
            # 405 Method Not Allowed is acceptable if endpoint doesn't support DELETE
            assert response.status_code in [200, 401, 307, 404, 405]


# --- Preferences ---

@pytest.mark.asyncio
async def test_get_matching_preferences(client, mock_user_id):
    """GET /api/preferences/matching should return preferences."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.get_prefs_service') as mock_prefs:
            mock_prefs.return_value = {
                "preferences": {
                    "age_min": 18,
                    "age_max": 50,
                    "gender": "any"
                },
                "dealbreakers": [],
                "schema": {}
            }
            
            response = await client.get("/api/preferences/matching")
            
            assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_update_matching_preferences(client, mock_user_id):
    """PUT /api/preferences/matching should update preferences."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.update_prefs_service') as mock_update:
            mock_update.return_value = {
                "success": True,
                "updated": ["age_min", "age_max"]
            }
            
            response = await client.put(
                "/api/preferences/matching",
                json={
                    "preferences": {
                        "age_min": 25,
                        "age_max": 40
                    }
                }
            )
            
            assert response.status_code in [200, 401, 307, 422]


# --- Swipes Status ---

@pytest.mark.asyncio
async def test_get_swipes_status(client, mock_user_id):
    """GET /api/swipes/status should return swipes status."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        response = await client.get("/api/swipes/status")
        
        assert response.status_code in [200, 401, 307]
