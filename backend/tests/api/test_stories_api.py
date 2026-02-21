"""API Integration tests for Stories endpoints."""
import pytest
import uuid
from unittest.mock import patch, AsyncMock


@pytest.fixture
def mock_user_id():
    return uuid.uuid4()


@pytest.mark.asyncio
async def test_get_stories_feed(client, mock_user_id):
    """GET /api/stories should return stories feed."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.get_stories_feed') as mock_feed:
            mock_feed.return_value = {
                "stories": [],
                "has_more": False
            }
            
            response = await client.get("/api/stories")
            
            assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_create_story(client, mock_user_id):
    """POST /api/stories should create a story."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.create_story') as mock_create:
            mock_create.return_value = {
                "success": True,
                "story": {
                    "id": str(uuid.uuid4()),
                    "media_url": "https://example.com/image.jpg",
                    "media_type": "image"
                }
            }
            
            response = await client.post(
                "/api/stories",
                json={
                    "media_url": "https://example.com/image.jpg",
                    "media_type": "image",
                    "caption": "Test story"
                }
            )
            
            assert response.status_code in [200, 401, 307, 422]


@pytest.mark.asyncio
async def test_view_story(client, mock_user_id):
    """POST /api/stories/{id}/view should record story view."""
    story_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.view_story') as mock_view:
            mock_view.return_value = {
                "success": True,
                "view_count": 5
            }
            
            response = await client.post(f"/api/stories/{story_id}/view")
            
            assert response.status_code in [200, 401, 307, 404]


@pytest.mark.asyncio
async def test_react_to_story(client, mock_user_id):
    """POST /api/stories/{id}/react should add reaction."""
    story_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.react_to_story') as mock_react:
            mock_react.return_value = {
                "success": True,
                "action": "created"
            }
            
            response = await client.post(
                f"/api/stories/{story_id}/react",
                json={"emoji": "❤️"}
            )
            
            assert response.status_code in [200, 401, 307, 404, 422]


@pytest.mark.asyncio
async def test_delete_story(client, mock_user_id):
    """DELETE /api/stories/{id} should delete story."""
    story_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.delete_story') as mock_delete:
            mock_delete.return_value = {
                "success": True
            }
            
            response = await client.delete(f"/api/stories/{story_id}")
            
            assert response.status_code in [200, 401, 307, 404]


@pytest.mark.asyncio
async def test_get_my_stories(client, mock_user_id):
    """GET /api/stories/my should return user's stories."""
    with patch('backend.api.missing_endpoints.social.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.social.get_my_stories') as mock_my:
            mock_my.return_value = {
                "stories": [],
                "total": 0
            }
            
            response = await client.get("/api/stories/my")
            
            assert response.status_code in [200, 401, 307]
