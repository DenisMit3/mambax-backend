"""add_performance_indexes_discover

Revision ID: 8f2a3b4c5d6e
Revises: f05645d86065
Create Date: 2026-02-08 12:00:00.000000

PERF: Additional composite indexes for /discover endpoint optimization
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f2a3b4c5d6e'
down_revision: Union[str, None] = 'f05645d86065'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PERF: Composite indexes for discover queries optimization
    # These indexes improve filtering performance for common query patterns
    
    # Index for filtering complete and active profiles sorted by creation date
    op.create_index(
        'idx_users_complete_active', 
        'users', 
        ['is_complete', 'is_active', 'created_at'], 
        unique=False
    )
    
    # Index for VIP/verified user filtering
    op.create_index(
        'idx_users_vip_verified', 
        'users', 
        ['is_vip', 'is_verified'], 
        unique=False
    )
    
    # Index for gender + age + active status filtering (common discover pattern)
    op.create_index(
        'idx_users_gender_age_active', 
        'users', 
        ['gender', 'age', 'is_active'], 
        unique=False
    )


def downgrade() -> None:
    op.drop_index('idx_users_gender_age_active', table_name='users')
    op.drop_index('idx_users_vip_verified', table_name='users')
    op.drop_index('idx_users_complete_active', table_name='users')
