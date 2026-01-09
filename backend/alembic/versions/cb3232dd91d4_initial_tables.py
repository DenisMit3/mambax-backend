"""Initial tables

Revision ID: cb3232dd91d4
Revises: 
Create Date: 2026-01-09 12:41:28.546254

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'cb3232dd91d4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### Users table ###
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('gender', sa.String(length=20), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('photos', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('interests', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('is_vip', sa.Boolean(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # ### Swipes table ###
    op.create_table(
        'swipes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('to_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['from_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_swipes_from_user_id'), 'swipes', ['from_user_id'], unique=False)
    op.create_index(op.f('ix_swipes_to_user_id'), 'swipes', ['to_user_id'], unique=False)

    # ### Matches table ###
    op.create_table(
        'matches',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user1_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user2_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['user1_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user2_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_matches_user1_id'), 'matches', ['user1_id'], unique=False)
    op.create_index(op.f('ix_matches_user2_id'), 'matches', ['user2_id'], unique=False)


def downgrade() -> None:
    # ### Drop tables in reverse order ###
    op.drop_index(op.f('ix_matches_user2_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_user1_id'), table_name='matches')
    op.drop_table('matches')

    op.drop_index(op.f('ix_swipes_to_user_id'), table_name='swipes')
    op.drop_index(op.f('ix_swipes_from_user_id'), table_name='swipes')
    op.drop_table('swipes')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
