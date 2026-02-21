import pytest
from httpx import AsyncClient
from backend.models.user import User

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    payload = {
        "email": "newuser@example.com",
        "password": "password123",
        "name": "New User",
        "age": 20,
        "gender": "male",
        "bio": "Hello world"
    }
    response = await client.post("/api/auth/register", json=payload)
    if response.status_code != 201:
        print(f"Error: {response.text}")
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "newuser@example.com"
    assert "access_token" in data

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    # Register first
    payload = {
        "email": "loginuser@example.com",
        "password": "password123",
        "name": "Login User",
        "age": 22,
        "gender": "female"
    }
    await client.post("/api/auth/register", json=payload)

    # Login
    login_payload = {
        "email": "loginuser@example.com",
        "password": "password123"
    }
    response = await client.post("/api/auth/login/email", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    payload = {
        "email": "wrongpass@example.com",
        "password": "correct",
        "name": "Wrong Pass",
        "age": 20,
        "gender": "female"
    }
    await client.post("/api/auth/register", json=payload)

    login_payload = {
        "email": "wrongpass@example.com",
        "password": "wrong"
    }
    response = await client.post("/api/auth/login/email", json=login_payload)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_otp_flow(client: AsyncClient):
    phone = "1234567890"
    
    # 1. Request OTP
    resp = await client.post("/api/auth/request-otp", json={"identifier": phone})
    assert resp.status_code == 200
    
    # 2. Login with OTP - mock verify_otp to return True
    from unittest.mock import patch, AsyncMock
    with patch("backend.api.auth.login.verify_otp", new_callable=AsyncMock, return_value=True):
        resp = await client.post("/api/auth/login", json={"identifier": phone, "otp": "123456"})
        # Should be 200 (success) or 404 (user not found - new user flow)
        assert resp.status_code in [200, 404]

@pytest.mark.asyncio
async def test_otp_invalid(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={"identifier": "999", "otp": "wrong"})
    assert resp.status_code == 401
