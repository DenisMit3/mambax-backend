# =============================================
# ALEMBIC ENV - ТОЛЬКО Neon PostgreSQL
# =============================================
# ВАЖНО: SQLite и локальный PostgreSQL ЗАПРЕЩЕНЫ
# =============================================

import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path for imports
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, root_dir)

# Import Base and ALL models for autogenerate support
from backend.db.base import Base
from backend.models import (
    User, Swipe, Match, Message, PushSubscription,
    ModerationLog, BannedUser, ModerationQueueItem, NSFWDetection, Appeal,
    SubscriptionPlan, UserSubscription, RevenueTransaction, PromoCode,
    AlgorithmSettings, Icebreaker, DatingEvent, Partner, CustomReport, AIUsageLog
)
from backend.models.analytics import DailyMetric, RetentionCohort, AnalyticsEvent
from backend.models.marketing import MarketingCampaign, PushCampaign, EmailCampaign
from backend.models.system import AuditLog, FeatureFlag, SecurityAlert, BackupStatus
from backend.models.user_management import FraudScore, UserSegment, UserNote, VerificationRequest

# this is the Alembic Config object
config = context.config

# Get DATABASE_URL - ONLY Neon PostgreSQL allowed
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL не установлен! "
        "Используйте только Neon PostgreSQL: postgresql+asyncpg://...@...neon.tech/..."
    )

# Validate - no SQLite allowed
if "sqlite" in DATABASE_URL.lower():
    raise RuntimeError(
        "SQLite ЗАПРЕЩЕН! Используйте только Neon PostgreSQL. "
        "Получите бесплатную БД на https://neon.tech"
    )

# Validate - no localhost allowed
if "localhost" in DATABASE_URL or "127.0.0.1" in DATABASE_URL:
    raise RuntimeError(
        "Локальный PostgreSQL ЗАПРЕЩЕН! Используйте только Neon PostgreSQL. "
        "Получите бесплатную БД на https://neon.tech"
    )

# Fix URL for asyncpg
if DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Handle SSL parameter
if "sslmode" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")

config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection, 
        target_metadata=target_metadata,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations with async engine for Neon PostgreSQL."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
