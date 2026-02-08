"""alter_messages_duration_to_float

Revision ID: a1b2c3d4e5f6
Revises: 8f2a3b4c5d6e
Create Date: 2026-02-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8f2a3b4c5d6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Alter messages.duration from VARCHAR to DOUBLE PRECISION
    # Using USING clause to convert existing string values to float
    op.execute(
        "ALTER TABLE messages ALTER COLUMN duration TYPE double precision "
        "USING duration::double precision;"
    )


def downgrade() -> None:
    # Revert messages.duration back to VARCHAR(50)
    op.execute(
        "ALTER TABLE messages ALTER COLUMN duration TYPE VARCHAR(50) "
        "USING duration::VARCHAR(50);"
    )
