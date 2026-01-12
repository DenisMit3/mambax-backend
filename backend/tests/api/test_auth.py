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
    response = await client.post("/auth/register", json=payload)
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
    await client.post("/auth/register", json=payload)

    # Login
    login_payload = {
        "email": "loginuser@example.com",
        "password": "password123"
    }
    response = await client.post("/auth/login/email", json=login_payload)
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
    await client.post("/auth/register", json=payload)

    login_payload = {
        "email": "wrongpass@example.com",
        "password": "wrong"
    }
    response = await client.post("/auth/login/email", json=login_payload)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_otp_flow(client: AsyncClient):
    phone = "1234567890"
    
    # 1. Request OTP
    resp = await client.post("/auth/request-otp", json={"identifier": phone})
    assert resp.status_code == 200
    # In test/dev mode, it might return the OTP or we relying on the fixed debug OTP logic in backend/auth.py
    # Ideally we'd mock backend.auth.generate_otp, but implementation has a debug print.
    # backend/auth.py verify_otp allows "0000" or "1111".
    
    # 2. Login with valid fixed OTP
    resp = await client.post("/auth/login", json={"identifier": phone, "otp": "0000"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

@pytest.mark.asyncio
async def test_otp_invalid(client: AsyncClient):
    resp = await client.post("/auth/login", json={"identifier": "999", "otp": "wrong"})
    assert resp.status_code == 401
