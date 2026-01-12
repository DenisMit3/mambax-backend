import pytest
from httpx import AsyncClient
from uuid import UUID
from sqlalchemy import select
from backend.models.user import User
from backend.models.monetization import VirtualGift

@pytest.mark.asyncio
async def test_gift_catalog(client: AsyncClient, db_session):
    # Register/Login
    resp = await client.post("/auth/register", json={
        "email": "gift_user@example.com", "password": "pass", "name": "Gifter", "age": 20, "gender": "male"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get Catalog
    resp = await client.get("/gifts/catalog", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "gifts" in data
    assert "categories" in data

@pytest.mark.asyncio
async def test_send_gift_insufficient_funds(client: AsyncClient, db_session):
    # Register sender
    resp = await client.post("/auth/register", json={
        "email": "poor_user@example.com", "password": "pass", "name": "Poor", "age": 20, "gender": "male"
    })
    token_sender = resp.json()["access_token"]
    sender_id = resp.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token_sender}"}

    # Register receiver
    resp = await client.post("/auth/register", json={
        "email": "receiver@example.com", "password": "pass", "name": "Receiver", "age": 20, "gender": "female"
    })
    receiver_id = resp.json()["user"]["id"]

    # Pick a gift (Need query existing gifts or ensure seed ran)
    # The fixture cleans DB? Yes, db_session creates/drops tables.
    # So the DB is EMPTY!
    # I MUST create a gift in the DB first.
    
    gift = VirtualGift(
        name="Test Rose",
        price=10,
        currency="XTR",
        is_active=True,
        image_url="/test.png"
    )
    db_session.add(gift)
    await db_session.commit()
    await db_session.refresh(gift)
    
    # Send gift
    payload = {
        "gift_id": str(gift.id),
        "receiver_id": receiver_id,
        "message": "For you",
        "is_anonymous": False
    }
    resp = await client.post("/gifts/send", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "Insufficient balance" in resp.text

@pytest.mark.asyncio
async def test_send_gift_success(client: AsyncClient, db_session):
    # Register sender
    resp = await client.post("/auth/register", json={
        "email": "rich_user@example.com", "password": "pass", "name": "Rich", "age": 20, "gender": "male"
    })
    token = resp.json()["access_token"]
    sender_uid = UUID(resp.json()["user"]["id"])
    headers = {"Authorization": f"Bearer {token}"}

    # Register receiver
    resp_r = await client.post("/auth/register", json={
        "email": "lucky@example.com", "password": "pass", "name": "Lucky", "age": 20, "gender": "female"
    })
    receiver_id = resp_r.json()["user"]["id"]

    # Add funds to sender manually
    stmt = select(User).where(User.id == sender_uid)
    result = await db_session.execute(stmt)
    user = result.scalar_one()
    user.stars_balance = 500
    
    # Create gift
    gift = VirtualGift(
        name="Test Gift",
        price=100,
        currency="XTR",
        is_active=True,
        image_url="/test.png"
    )
    db_session.add(gift)
    await db_session.commit()
    await db_session.refresh(gift)

    # Send gift
    payload = {
        "gift_id": str(gift.id),
        "receiver_id": receiver_id,
        "message": "Enjoy",
        "is_anonymous": False
    }
    resp = await client.post("/gifts/send", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    
    # Check balance deduction
    await db_session.refresh(user)
    assert user.stars_balance == 400

@pytest.mark.asyncio
async def test_top_up_invoice(client: AsyncClient, db_session):
    # Register user
    resp = await client.post("/auth/register", json={
        "email": "topup@example.com", "password": "pass", "name": "TopUp", "age": 20, "gender": "male"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Request Top-Up
    payload = {"amount": 100}
    resp = await client.post("/payments/top-up", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "invoice_url" in data
    assert data["amount"] == 100
    assert "transaction_id" in data
