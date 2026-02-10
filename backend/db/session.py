# Database Session - Neon PostgreSQL
# =============================================
# ВАЖНО: Единственная разрешенная БД - Neon PostgreSQL
# Использование SQLite, локального PostgreSQL ЗАПРЕЩЕНО
# =============================================

import os
import sys
import ssl
from typing import AsyncGenerator, Optional
from contextlib import contextmanager, asynccontextmanager

# psycopg2 only needed for Windows local dev, not on Vercel
psycopg2 = None
if sys.platform == 'win32':
    try:
        import psycopg2
    except ImportError:
        pass  # Not available, will use async only

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from backend.config.settings import settings


# Database URL from settings - ONLY Neon PostgreSQL allowed
DATABASE_URL = settings.DATABASE_URL

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL не установлен! "
        "Используйте только Neon PostgreSQL: postgresql+asyncpg://...@...neon.tech/..."
    )

# Validate that it's Neon PostgreSQL
if "neon.tech" not in DATABASE_URL and "neon" not in DATABASE_URL.lower():
    if "sqlite" in DATABASE_URL.lower():
        raise RuntimeError(
            "SQLite ЗАПРЕЩЕН! Используйте только Neon PostgreSQL. "
            "Получите бесплатную БД на https://neon.tech"
        )
    if "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL:
        raise RuntimeError(
            "Локальный PostgreSQL ЗАПРЕЩЕН! Используйте только Neon PostgreSQL. "
            "Получите бесплатную БД на https://neon.tech"
        )

# Parse connection params from URL for psycopg2 (only if available)
def _parse_neon_url(url: str) -> dict:
    """Parse Neon URL into connection params for psycopg2"""
    # postgresql+asyncpg://user:pass@host/db?ssl=require
    import re
    pattern = r'postgresql\+\w+://([^:]+):([^@]+)@([^/]+)/([^?]+)'
    match = re.match(pattern, url)
    if match:
        return {
            'user': match.group(1),
            'password': match.group(2),
            'host': match.group(3),
            'database': match.group(4),
            'sslmode': 'require',
            'connect_timeout': 10,
        }
    raise ValueError(f"Cannot parse DATABASE_URL: {url}")

# Only parse if psycopg2 is available (Windows local dev)
NEON_CONN_PARAMS = _parse_neon_url(DATABASE_URL) if psycopg2 else {}


# ============================================
# SYNC CONNECTION (for Windows local dev)
# ============================================

class NeonSyncDB:
    """
    Синхронное подключение к Neon через psycopg2.
    Используется для локальной разработки на Windows,
    где SQLAlchemy async имеет проблемы с таймаутами.
    """
    
    @staticmethod
    @contextmanager
    def get_connection():
        if psycopg2 is None:
            raise RuntimeError("psycopg2 not available - use async methods instead")
        conn = psycopg2.connect(**NEON_CONN_PARAMS)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    @staticmethod
    def execute(query: str, params: tuple = None):
        with NeonSyncDB.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(query, params)
            if cur.description:
                return cur.fetchall()
            return None
    
    @staticmethod
    def fetchone(query: str, params: tuple = None):
        with NeonSyncDB.get_connection() as conn:
            cur = conn.cursor()
            cur.execute(query, params)
            return cur.fetchone()
    
    @staticmethod
    def fetchval(query: str, params: tuple = None):
        result = NeonSyncDB.fetchone(query, params)
        return result[0] if result else None


# ============================================
# ASYNC CONNECTION (for production on Linux)
# ============================================

# Fix scheme for asyncpg
_async_url = DATABASE_URL
if _async_url.startswith("postgres://"):
    _async_url = _async_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _async_url.startswith("postgresql://") and "+asyncpg" not in _async_url:
    _async_url = _async_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Replace sslmode with ssl for asyncpg compatibility
if "sslmode=" in _async_url:
    _async_url = _async_url.replace("sslmode=require", "ssl=require")

# Create SSL context for Neon
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Engine configuration for Neon PostgreSQL
engine_kwargs = {
    "echo": not settings.is_production,
    "future": True,
    "poolclass": NullPool,  # Neon pooler handles pooling
    "connect_args": {
        "ssl": ssl_context,
        "timeout": 60,
        "command_timeout": 60,
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
    Инициализация базы данных - проверка подключения к Neon.
    Таблицы уже созданы в Neon, не создаем их автоматически.
    """
    from backend.db.base import Base
    from backend import models  # noqa: F401
    from sqlalchemy import text
    
    # На Windows используем синхронное подключение для проверки
    if sys.platform == 'win32':
        try:
            result = NeonSyncDB.fetchval("SELECT 1")
            if result != 1:
                raise RuntimeError("Neon connection test failed")
        except Exception as e:
            raise RuntimeError(f"Не удалось подключиться к Neon PostgreSQL: {e}")
    else:
        # На Linux используем async
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception as e:
            raise RuntimeError(f"Не удалось подключиться к Neon PostgreSQL: {e}")
