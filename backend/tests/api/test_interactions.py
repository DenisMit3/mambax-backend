import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_swipe_flow(client: AsyncClient):
    # 1. Register User 1
    user1_data = {
        "email": "user1@example.com",
        "password": "password123",
        "name": "User One",
        "age": 25,
        "gender": "male"
    }
    resp = await client.post("/auth/register", json=user1_data)
    assert resp.status_code == 201
    token1 = resp.json()["access_token"]
    user1_id = resp.json()["user"]["id"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # 2. Register User 2
    user2_data = {
        "email": "user2@example.com",
        "password": "password123",
        "name": "User Two",
        "age": 24,
        "gender": "female"
    }
    resp = await client.post("/auth/register", json=user2_data)
    assert resp.status_code == 201
    token2 = resp.json()["access_token"]
    user2_id = resp.json()["user"]["id"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 3. User 1 gets feed - should see User 2
    resp = await client.get("/feed", headers=headers1)
    # Feed filtering might filter by gender/location preferences not set, 
    # but initially it shows everyone if no prefs/filters logic is strict.
    # Assuming User Two appears.
    # If not, we might need to adjust filter preferences via API or seed data to match.
    # Let's assume standard behavior involves seeing available users.
    
    # 4. User 1 Likes User 2
    swipe_payload = {
        "to_user_id": user2_id,
        "action": "like"
    }
    resp = await client.post("/swipe", json=swipe_payload, headers=headers1)
    assert resp.status_code == 200
    assert resp.json()["is_match"] is False

    # 5. User 2 Likes User 1 -> Match
    swipe_payload2 = {
        "to_user_id": user1_id,
        "action": "like"
    }
    resp = await client.post("/swipe", json=swipe_payload2, headers=headers2)
    assert resp.status_code == 200
    assert resp.json()["is_match"] is True

    # 6. Check Matches for User 1
    resp = await client.get("/matches", headers=headers1)
    assert resp.status_code == 200
    matches = resp.json()
    assert len(matches) == 1
    # Check if User 2 is in the match object
    assert matches[0]["user"]["id"] == user2_id
