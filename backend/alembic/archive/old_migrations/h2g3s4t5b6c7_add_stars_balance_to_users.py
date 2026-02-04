"""Add stars_balance to users table

Revision ID: h2g3s4t5b6c7
Revises: g1f2s3t4s5a6
Create Date: 2026-01-11 16:28:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'h2g3s4t5b6c7'
down_revision = 'g1f2s3t4s5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add stars_balance column to users table for tracking Telegram Stars balance
    op.add_column(
        'users',
        sa.Column(
            'stars_balance',
            sa.Numeric(12, 2),
            nullable=False,
            server_default='0',
            comment="User's Telegram Stars balance"
        )
    )


def downgrade() -> None:
    op.drop_column('users', 'stars_balance')
