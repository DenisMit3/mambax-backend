"""add referral system - users fields + referrals table

Revision ID: add_referral_system
Revises: add_achievements
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_referral_system"
down_revision: Union[str, None] = "add_achievements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add referral fields to users table
    op.add_column("users", sa.Column("referral_code", sa.String(20), unique=True, nullable=True))
    op.add_column("users", sa.Column("referred_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))
    op.create_index("idx_users_referral_code", "users", ["referral_code"])

    # Create referrals table
    op.create_table(
        "referrals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("referrer_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("pending", "converted", "expired", name="referralstatus"), nullable=False, server_default="pending"),
        sa.Column("reward_stars", sa.Float(), nullable=False, server_default="50.0"),
        sa.Column("reward_paid", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("converted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("idx_referrals_referrer_id", "referrals", ["referrer_id"])
    op.create_index("idx_referrals_referred_id", "referrals", ["referred_id"])


def downgrade() -> None:
    op.drop_table("referrals")
    op.drop_index("idx_users_referral_code", table_name="users")
    op.drop_column("users", "referred_by")
    op.drop_column("users", "referral_code")
    op.execute("DROP TYPE IF EXISTS referralstatus")
