"""add is_read to messages

Revision ID: f1a2b3c4d5e7
Revises: e1a2b3c4d5e6
Create Date: 2026-01-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e7'
down_revision = '1de50891d900'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_read column to messages table with default value False
    op.add_column('messages', sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    op.drop_column('messages', 'is_read')
