# Database Session - Async SQLAlchemy engine и session для PostgreSQL

import os
import urllib.parse
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.config.settings import settings


# Database URL from settings (preferred) or environment
DATABASE_URL = settings.DATABASE_URL

if not DATABASE_URL:
    DATABASE_URL = "sqlite+aiosqlite:///./mambax.db"

# Fix scheme for asyncpg (Vercel/Neon compatibility)
if DATABASE_URL and DATABASE_URL.startswith("postgres"):
    parsed = urllib.parse.urlparse(DATABASE_URL)
    if parsed.scheme == "postgresql":
        parsed = parsed._replace(scheme="postgresql+asyncpg")
    DATABASE_URL = urllib.parse.urlunparse(parsed)

# SQLite config requires connect_args check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

# Async Engine
# Disable SQL echo in production to reduce log noise
engine = create_async_engine(
    DATABASE_URL,
    echo=not settings.is_production,  # Only log SQL queries in development
    future=True,
    # pool_size parameter is not supported by SQLite engine
    # pool_size=5,
    # max_overflow=10,
    connect_args=connect_args,
)

# Async Session Factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Генератор асинхронных сессий для FastAPI Depends.
    
    Использование:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Инициализация базы данных - создание таблиц.
    Вызывается при старте приложения.
    """
    from backend.db.base import Base
    # Import all models to register them with Base
    # This ensures all tables are created
    from backend import models  # noqa: F401
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
