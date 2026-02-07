"""add_achievements_to_user

Revision ID: add_achievements
Revises: f05645d86065
Create Date: 2026-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'add_achievements'
down_revision: Union[str, None] = 'f05645d86065'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('achievements', sa.JSON(), nullable=False, server_default='[]'))


def downgrade() -> None:
    op.drop_column('users', 'achievements')
