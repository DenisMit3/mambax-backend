"""Add advanced tables

Revision ID: e1a2b3c4d5e6
Revises: bfa2729b3e19
Create Date: 2026-01-10 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, None] = 'bfa2729b3e19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # algorithm_settings
    op.create_table('algorithm_settings',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('weights', sa.JSON(), nullable=True),
        sa.Column('experimental_flags', sa.JSON(), nullable=True),
        sa.Column('updated_by', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # icebreakers
    op.create_table('icebreakers',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False),
        sa.Column('success_count', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_by', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('icebreakers', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_icebreakers_category'), ['category'], unique=False)

    # dating_events
    op.create_table('dating_events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('max_participants', sa.Integer(), nullable=False),
        sa.Column('current_participants', sa.Integer(), nullable=False),
        sa.Column('is_premium', sa.Boolean(), nullable=False),
        sa.Column('host_name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # partners
    op.create_table('partners',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('domain', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('revenue_share_percentage', sa.Float(), nullable=False),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.Column('users_count', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # custom_reports
    op.create_table('custom_reports',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('report_type', sa.String(length=50), nullable=False),
        sa.Column('schedule', sa.String(length=50), nullable=True),
        sa.Column('last_run_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # ai_usage_logs
    op.create_table('ai_usage_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('feature', sa.String(length=50), nullable=False),
        sa.Column('model', sa.String(length=50), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=False),
        sa.Column('cost', sa.Float(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('ai_usage_logs')
    op.drop_table('custom_reports')
    op.drop_table('partners')
    op.drop_table('dating_events')
    with op.batch_alter_table('icebreakers', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_icebreakers_category'))
    op.drop_table('icebreakers')
    op.drop_table('algorithm_settings')
