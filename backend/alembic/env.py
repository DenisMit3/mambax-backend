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
# Current file is backend/alembic/env.py
# We want to add root of project to sys.path so 'backend' package is found
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

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Determine DATABASE_URL similar to database.py
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    if "sslmode" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?")[0] + "?ssl=require"
else:
    # Local SQLite
    DATABASE_URL = "sqlite+aiosqlite:///./mambax.db"

config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata for autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True # Enable batch mode for SQLite
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection, 
        target_metadata=target_metadata,
        render_as_batch=True # Enable batch mode for SQLite
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

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
