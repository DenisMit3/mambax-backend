"""merge_gift_migrations

Revision ID: 50f68ebfca2c
Revises: de04cc0a8fee, h2g3s4t5b6c7
Create Date: 2026-01-11 18:40:57.422517

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '50f68ebfca2c'
down_revision: Union[str, None] = ('de04cc0a8fee', 'h2g3s4t5b6c7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
