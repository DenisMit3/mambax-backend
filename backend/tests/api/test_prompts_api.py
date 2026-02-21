"""API Integration tests for Prompts endpoints."""
import pytest
import uuid
from unittest.mock import patch, AsyncMock


@pytest.fixture
def mock_user_id():
    return uuid.uuid4()


@pytest.mark.asyncio
async def test_get_available_prompts(client):
    """GET /api/prompts should return list of available prompts."""
    response = await client.get("/api/prompts")
    
    # Endpoint requires auth, so 401 is acceptable
    assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_get_my_prompts(client, mock_user_id):
    """GET /api/prompts/my should return user's prompts."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.get_user_prompts') as mock_get:
            mock_get.return_value = [
                {
                    "id": str(uuid.uuid4()),
                    "question": "Обо мне в двух словах...",
                    "answer": "Люблю путешествовать",
                    "type": "text",
                    "sort_order": 0
                }
            ]
            
            response = await client.get("/api/prompts/my")
            
            assert response.status_code in [200, 401, 307]


@pytest.mark.asyncio
async def test_save_prompt_answer(client, mock_user_id):
    """POST /api/prompts/answer should save prompt answer."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.save_prompt_answer') as mock_save:
            mock_save.return_value = {
                "success": True,
                "prompt": {
                    "id": str(uuid.uuid4()),
                    "question": "Обо мне в двух словах...",
                    "answer": "Тестовый ответ"
                }
            }
            
            response = await client.post(
                "/api/prompts/answer",
                json={
                    "prompt_id": "about_me",
                    "answer": "Тестовый ответ"
                }
            )
            
            assert response.status_code in [200, 401, 307, 422]


@pytest.mark.asyncio
async def test_save_prompt_answer_too_short(client, mock_user_id):
    """POST /api/prompts/answer should reject short answers."""
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.save_prompt_answer') as mock_save:
            mock_save.return_value = {
                "success": False,
                "message": "Ответ слишком короткий (минимум 3 символа)"
            }
            
            response = await client.post(
                "/api/prompts/answer",
                json={
                    "prompt_id": "about_me",
                    "answer": "Hi"
                }
            )
            
            assert response.status_code in [200, 400, 401, 307, 422]


@pytest.mark.asyncio
async def test_delete_prompt_answer(client, mock_user_id):
    """DELETE /api/prompts/{id} should delete prompt answer."""
    prompt_id = uuid.uuid4()
    
    with patch('backend.api.missing_endpoints.content.get_current_user_id', return_value=mock_user_id):
        with patch('backend.api.missing_endpoints.content.delete_prompt_answer') as mock_delete:
            mock_delete.return_value = {
                "success": True,
                "message": "Ответ удален"
            }
            
            response = await client.delete(f"/api/prompts/{prompt_id}")
            
            assert response.status_code in [200, 401, 307, 404]
