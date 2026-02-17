"""add missing admin columns

Revision ID: b1c2d3e4f5a6
Revises: 4a06a7607b64
Create Date: 2026-02-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = '4a06a7607b64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # audit_logs: add admin_id if missing
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE audit_logs ADD COLUMN admin_id UUID;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)

    # revenue_transactions: add payment_method if missing
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE revenue_transactions ADD COLUMN payment_method VARCHAR(50);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)

    # user_notes: add author_id if missing
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE user_notes ADD COLUMN author_id UUID;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE audit_logs DROP COLUMN IF EXISTS admin_id;")
    op.execute("ALTER TABLE revenue_transactions DROP COLUMN IF EXISTS payment_method;")
    op.execute("ALTER TABLE user_notes DROP COLUMN IF EXISTS author_id;")
