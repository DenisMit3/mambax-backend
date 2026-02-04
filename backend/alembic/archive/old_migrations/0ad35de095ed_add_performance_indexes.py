"""add_performance_indexes

Revision ID: 0ad35de095ed
Revises: 97dc34be6cab
Create Date: 2026-01-12 07:46:54.554689

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ad35de095ed'
down_revision: Union[str, None] = '97dc34be6cab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users status index
    op.create_index('ix_users_status', 'users', ['status'])
    
    # Matches active status index
    op.create_index('ix_matches_is_active', 'matches', ['is_active'])
    
    # Messages indexes
    op.create_index('ix_messages_is_read', 'messages', ['is_read'])
    op.create_index('ix_messages_created_at', 'messages', ['created_at'])
    
    # Composite index for messages
    op.create_index('ix_messages_match_created', 'messages', ['match_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_messages_match_created', table_name='messages')
    op.drop_index('ix_messages_created_at', table_name='messages')
    op.drop_index('ix_messages_is_read', table_name='messages')
    op.drop_index('ix_matches_is_active', table_name='matches')
    op.drop_index('ix_users_status', table_name='users')
