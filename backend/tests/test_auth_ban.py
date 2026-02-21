import pytest
import pytest_asyncio
from backend.models.user import User, UserStatus
from backend.core.security import create_access_token
from backend.auth import generate_otp, save_otp

@pytest.mark.asyncio
async def test_banned_user_login_otp(client, db_session):
    # 1. Create a banned user
    banned_user = User(
        email="banned@example.com",
        username="banned_user",
        hashed_password="hashed_password",
        name="Banned Dude",
        age=99,
        gender="male",
        status=UserStatus.BANNED,
        is_active=False
    )
    db_session.add(banned_user)
    await db_session.commit()
    await db_session.refresh(banned_user)

    # 2. Generate OTP
    phone = "+1234567890"
    banned_user.phone = phone
    await db_session.commit()
    
    otp = "1234"
    await save_otp(phone, otp)

    # 3. Attempt Login
    response = await client.post("/api/auth/login", json={
        "identifier": phone,
        "otp": otp
    })

    # 4. Assert 401 Unauthorized
    assert response.status_code == 401
    assert "banned" in response.json()["detail"].lower() or "disabled" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_banned_user_login_telegram(client, db_session):
    # 1. Create banned user linked to Telegram ID
    tg_id = "123456789"
    banned_user = User(
        telegram_id=tg_id,
        username="banned_tg_user",
        hashed_password="hashed_password",
        name="Banned TG",
        age=30,
        gender="female",
        status=UserStatus.BANNED,
        is_active=False
    )
    db_session.add(banned_user)
    await db_session.commit()

    # 2. Mock validation to succeed
    from unittest.mock import patch
    
    auth_data_mock = {
        "id": int(tg_id),
        "username": "banned_tg_user",
        "first_name": "Banned"
    }

    with patch("backend.api.auth.login.validate_telegram_data", return_value=auth_data_mock):
        # 3. Attempt Login
        # We can pass any string as init_data since the validator is mocked
        response = await client.post("/api/auth/telegram", json={
            "init_data": "query_id=..."
        })

        # 4. Assert 401 and specifically "banned" message
        assert response.status_code == 401
        detail = response.json()["detail"].lower()
        assert "banned" in detail or "disabled" in detail
