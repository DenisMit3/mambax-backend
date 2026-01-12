import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.db.session import get_db
from backend.db.base import Base

# Use in-memory SQLite for tests with StaticPool to share connection across threads/coroutines
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Patch the global engine and session maker in the backend
# This ensures that when the app starts (lifespan), it uses our test engine
from backend.db import session as db_session_module
db_session_module.engine = engine
db_session_module.async_session_maker = TestingSessionLocal
# Also patch database.py wrappers if they exist/are used
from backend import database
database.engine = engine
database.async_session = TestingSessionLocal
database.AsyncSessionLocal = TestingSessionLocal

@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def db_session():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
        # No need to explicitly rollback as we drop all tables next, 
        # but for safety in case of logical transaction tests:
        await session.rollback()
    
    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    # We might also need to override get_current_user dependencies if we want to bypass auth
    # But for integration tests, it's better to login and get a token.
    
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture
def test_user_data():
    return {
        "email": "test@example.com",
        "password": "strongpassword123",
        "name": "Test User",
        "age": 25,
        "gender": "male",
        "bio": "Just a test user",
        "is_active": True
    }
