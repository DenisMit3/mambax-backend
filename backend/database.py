from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Use Postgres on Vercel (from Neon), SQLite locally
DATABASE_URL = os.getenv("POSTGRES_URL")

if DATABASE_URL:
    # Vercel Postgres (Neon) uses postgresql:// but we need postgresql+asyncpg://
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    # Remove sslmode parameter (asyncpg doesn't support it, uses ssl= instead)
    if "sslmode" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0] + "?ssl=require"
else:
    # Local development: SQLite
    DATABASE_URL = "sqlite+aiosqlite:///./mambax.db"

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async_session = AsyncSessionLocal

