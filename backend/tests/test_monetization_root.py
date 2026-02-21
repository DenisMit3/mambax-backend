
import pytest
import uuid
import pytest_asyncio
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy import select
from backend.main import app
from backend.models.user import User
from backend.models.monetization import SubscriptionPlan, RevenueTransaction, VirtualGift, GiftCategory
from backend.api.monetization import router
from backend.auth import get_current_admin, get_current_user_from_token

# Mock User
@pytest.fixture
def mock_admin_user():
    return User(
        id=uuid.uuid4(),
        email="admin@example.com",
        role="admin",
        is_active=True
    )

@pytest.fixture
def mock_generic_user():
    return User(
        id=uuid.uuid4(),
        email="user@example.com",
        role="user",
        is_active=True,
        stars_balance=1000
    )

@pytest_asyncio.fixture
async def admin_client(client, mock_admin_user):
    # Override get_current_admin
    app.dependency_overrides[get_current_admin] = lambda: mock_admin_user
    app.dependency_overrides[get_current_user_from_token] = lambda: mock_admin_user # Admin is also a user
    yield client
    app.dependency_overrides = {}

@pytest_asyncio.fixture
async def user_client(client, mock_generic_user):
    # Override get_current_user_from_token
    app.dependency_overrides[get_current_user_from_token] = lambda: mock_generic_user
    yield client
    app.dependency_overrides = {}

@pytest.mark.asyncio
async def test_get_subscription_plans(admin_client, db_session):
    # Seed a plan
    plan = SubscriptionPlan(
        name="Test Plan", 
        tier="gold", 
        price=100, 
        currency="XTR", 
        duration_days=30,
        is_active=True
    )
    db_session.add(plan)
    await db_session.commit()

    response = await admin_client.get("/admin/monetization/plans")
    assert response.status_code == 200
    data = response.json()
    assert "plans" in data
    assert len(data["plans"]) >= 1
    assert data["plans"][0]["name"] == "Test Plan"

@pytest.mark.asyncio
async def test_create_subscription_plan(admin_client, db_session):
    payload = {
        "name": "New Plan",
        "tier": "platinum",
        "price": 500,
        "currency": "XTR",
        "duration_days": 90,
        "features": {"unlimited_swipes": True}
    }
    response = await admin_client.post("/admin/monetization/plans", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["plan"]["name"] == "New Plan"
    
    # Verify in DB
    result = await db_session.execute(select(SubscriptionPlan).where(SubscriptionPlan.name == "New Plan"))
    plan = result.scalar_one_or_none()
    assert plan is not None
    assert plan.price == 500

@pytest.mark.asyncio
async def test_create_telegram_invoice(admin_client, db_session):
    # Create plan
    plan = SubscriptionPlan(
        name="Invoice Plan", 
        tier="gold", 
        price=100, 
        currency="XTR", 
        duration_days=30,
        is_active=True
    )
    db_session.add(plan)
    await db_session.commit()
    
    payload = {"plan_id": str(plan.id)}
    response = await admin_client.post("/admin/monetization/telegram/create-invoice", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "invoice_link" in data
    assert data["amount"] == 100

@pytest.mark.asyncio
async def test_create_gift_purchase_invoice(user_client, db_session):
    # Seed gift
    gift = VirtualGift(
        name="Rose",
        price=50,
        currency="XTR",
        is_active=True,
        image_url="http://example.com/rose.png"
    )
    db_session.add(gift)
    await db_session.commit()
    
    payload = {
        "gift_id": str(gift.id),
        "receiver_id": str(uuid.uuid4()),
        "message": "For you",
        "is_anonymous": False
    }
    
    # Needs to mock create_stars_invoice from telegram_payments service
    # We can patch it
    with pytest.MonkeyPatch.context() as m:
        async def mock_invoice(*args, **kwargs):
            return "https://t.me/invoice"
        
        m.setattr("backend.services.telegram_payments.create_stars_invoice", mock_invoice)
        
        response = await user_client.post("/admin/monetization/payments/gift", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["invoice_link"] == "https://t.me/invoice"
        assert data["amount"] == 50

@pytest.mark.asyncio
async def test_get_transactions(admin_client, db_session, mock_admin_user):
    # Seed transaction
    tx = RevenueTransaction(
        user_id=mock_admin_user.id,
        transaction_type="subscription",
        amount=100,
        currency="XTR",
        status="completed"
    )
    db_session.add(tx)
    await db_session.commit()
    
    response = await admin_client.get("/admin/monetization/transactions")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["total"] >= 1

@pytest.mark.asyncio
async def test_refund_transaction(admin_client, db_session, mock_admin_user):
    # Seed completed transaction
    tx = RevenueTransaction(
        user_id=mock_admin_user.id,
        transaction_type="subscription",
        amount=100,
        currency="XTR",
        status="completed"
    )
    db_session.add(tx)
    await db_session.commit()
    
    payload = {"reason": "Test refund"}
    response = await admin_client.post(f"/admin/monetization/transactions/{tx.id}/refund", json=payload)
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    await db_session.refresh(tx)
    assert tx.status == "refunded"

@pytest.mark.asyncio
async def test_revenue_metrics(admin_client, db_session):
    response = await admin_client.get("/admin/monetization/revenue/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "revenue" in data
    assert "metrics" in data

@pytest.mark.asyncio
async def test_gift_catalog(user_client, db_session):
    # Seed category and gift
    cat = GiftCategory(name="Flowers", sort_order=1, is_active=True)
    db_session.add(cat)
    await db_session.commit()
    
    gift = VirtualGift(
        name="Tulip",
        price=10,
        currency="XTR",
        is_active=True,
        category_id=cat.id,
        image_url="http://example.com/tulip.png"
    )
    db_session.add(gift)
    await db_session.commit()
    
    # Correct endpoint is /gifts/catalog
    response = await user_client.get("/gifts/catalog")
    assert response.status_code == 200
    data = response.json()
    assert len(data["categories"]) >= 1
    assert len(data["gifts"]) >= 1
