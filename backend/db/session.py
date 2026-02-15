# Database Session - Neon PostgreSQL (Vercel Only)
# =============================================
# БД: только Neon PostgreSQL через asyncpg
# Деплой: только Vercel Serverless
# =============================================

import ssl
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from backend.config.settings import settings


# Database URL from settings - ONLY Neon PostgreSQL
DATABASE_URL = settings.DATABASE_URL

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL не установлен! "
        "Используйте только Neon PostgreSQL: postgresql+asyncpg://...@...neon.tech/..."
    )

# Fix scheme for asyncpg
_async_url = DATABASE_URL
if _async_url.startswith("postgres://"):
    _async_url = _async_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _async_url.startswith("postgresql://") and "+asyncpg" not in _async_url:
    _async_url = _async_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Replace sslmode with ssl for asyncpg compatibility
if "sslmode=" in _async_url:
    _async_url = _async_url.replace("sslmode=require", "ssl=require")

# SSL-контекст для Neon PostgreSQL
ssl_context = ssl.create_default_context()
if settings.is_production:
    # В production — полная проверка сертификатов Neon
    ssl_context.check_hostname = True
    ssl_context.verify_mode = ssl.CERT_REQUIRED
else:
    # В dev — без проверки (self-signed / локальные сертификаты)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

# Engine configuration for Neon PostgreSQL
engine_kwargs = {
    "echo": not settings.is_production,
    "future": True,
    "poolclass": NullPool,  # Neon pooler handles pooling
    "connect_args": {
        "ssl": ssl_context,
        "timeout": 30,
        "command_timeout": 30,
        "statement_cache_size": 0,  # Disable for Neon pooler
        "server_settings": {
            "application_name": "mambax_backend"
        }
    }
}

# Async Engine
engine = create_async_engine(_async_url, **engine_kwargs)

# Async Session Factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Генератор асинхронных сессий для FastAPI Depends."""
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
    """Проверка подключения к Neon PostgreSQL."""
    from sqlalchemy import text
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        raise RuntimeError(f"Не удалось подключиться к Neon PostgreSQL: {e}")
