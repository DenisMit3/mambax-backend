"""add onboarding profile fields (job, zodiac, personality_type, love_language, pets, ideal_date, intent)

Revision ID: 7b3e9f1a2c4d
Revises: 4599ca70e57a
Create Date: 2026-02-12 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b3e9f1a2c4d'
down_revision: Union[str, None] = '4599ca70e57a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('job', sa.String(100), nullable=True, comment="User's job/occupation"))
    op.add_column('users', sa.Column('zodiac', sa.String(30), nullable=True, comment="Zodiac sign"))
    op.add_column('users', sa.Column('personality_type', sa.String(30), nullable=True, comment="Introvert, extrovert, ambivert"))
    op.add_column('users', sa.Column('love_language', sa.String(100), nullable=True, comment="Love language(s), comma-separated"))
    op.add_column('users', sa.Column('pets', sa.String(100), nullable=True, comment="Pets info, comma-separated"))
    op.add_column('users', sa.Column('ideal_date', sa.String(200), nullable=True, comment="Ideal date description, comma-separated"))
    op.add_column('users', sa.Column('intent', sa.String(200), nullable=True, comment="What user is looking for, comma-separated"))


def downgrade() -> None:
    op.drop_column('users', 'intent')
    op.drop_column('users', 'ideal_date')
    op.drop_column('users', 'pets')
    op.drop_column('users', 'love_language')
    op.drop_column('users', 'personality_type')
    op.drop_column('users', 'zodiac')
    op.drop_column('users', 'job')
