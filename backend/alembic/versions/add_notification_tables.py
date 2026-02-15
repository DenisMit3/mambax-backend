"""add notification tables (in_app, preferences, templates, logs)

Revision ID: b7c8d9e0f1a2
Revises: 4a06a7607b64
Create Date: 2026-02-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "4a06a7607b64"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Notification templates
    op.create_table(
        "notification_templates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("title_template", sa.String(255), nullable=False),
        sa.Column("body_template", sa.Text(), nullable=False),
        sa.Column("variables", sa.JSON(), server_default="[]"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Notification logs
    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("template_id", sa.Uuid(), sa.ForeignKey("notification_templates.id"), nullable=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), server_default="sent"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), index=True),
    )

    # User notification preferences
    op.create_table(
        "user_notification_preferences",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("new_match", sa.Boolean(), server_default="true"),
        sa.Column("new_message", sa.Boolean(), server_default="true"),
        sa.Column("new_like", sa.Boolean(), server_default="true"),
        sa.Column("profile_view", sa.Boolean(), server_default="false"),
        sa.Column("gift_received", sa.Boolean(), server_default="true"),
        sa.Column("story_reaction", sa.Boolean(), server_default="true"),
        sa.Column("marketing", sa.Boolean(), server_default="false"),
        sa.Column("quiet_hours_start", sa.String(5), nullable=True),
        sa.Column("quiet_hours_end", sa.String(5), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # In-app notifications inbox
    op.create_table(
        "in_app_notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("notification_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("icon_url", sa.String(500), nullable=True),
        sa.Column("related_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default="false"),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table("in_app_notifications")
    op.drop_table("user_notification_preferences")
    op.drop_table("notification_logs")
    op.drop_table("notification_templates")
