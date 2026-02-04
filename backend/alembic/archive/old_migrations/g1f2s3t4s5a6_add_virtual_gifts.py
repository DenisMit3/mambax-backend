"""Add virtual gifts tables

Revision ID: g1f2s3t4s5a6
Revises: 172dcbf0aea7
Create Date: 2026-01-11 15:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'g1f2s3t4s5a6'
down_revision = '172dcbf0aea7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create gift_categories table
    op.create_table(
        'gift_categories',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create virtual_gifts table
    op.create_table(
        'virtual_gifts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('category_id', sa.Uuid(), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('animation_url', sa.String(500), nullable=True),
        sa.Column('price', sa.Numeric(10, 2), nullable=False, server_default='10'),
        sa.Column('currency', sa.String(3), nullable=False, server_default='XTR'),
        sa.Column('is_animated', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_limited', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('available_until', sa.DateTime(), nullable=True),
        sa.Column('max_quantity', sa.Integer(), nullable=True),
        sa.Column('times_sent', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['category_id'], ['gift_categories.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create gift_transactions table
    op.create_table(
        'gift_transactions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('sender_id', sa.Uuid(), nullable=False),
        sa.Column('receiver_id', sa.Uuid(), nullable=False),
        sa.Column('gift_id', sa.Uuid(), nullable=False),
        sa.Column('price_paid', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='XTR'),
        sa.Column('message', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='completed'),
        sa.Column('is_anonymous', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('payment_transaction_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id']),
        sa.ForeignKeyConstraint(['receiver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['gift_id'], ['virtual_gifts.id']),
        sa.ForeignKeyConstraint(['payment_transaction_id'], ['revenue_transactions.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('ix_gift_transactions_sender_id', 'gift_transactions', ['sender_id'])
    op.create_index('ix_gift_transactions_receiver_id', 'gift_transactions', ['receiver_id'])
    op.create_index('ix_gift_transactions_created_at', 'gift_transactions', ['created_at'])
    
    # Insert default gift categories
    categories_table = sa.table('gift_categories',
        sa.column('id', sa.Uuid),
        sa.column('name', sa.String),
        sa.column('description', sa.Text),
        sa.column('icon', sa.String),
        sa.column('sort_order', sa.Integer),
        sa.column('is_active', sa.Boolean)
    )

    op.bulk_insert(categories_table, [
        {'id': uuid.uuid4(), 'name': 'Romantic', 'description': 'Express your feelings with romantic gifts', 'icon': '💕', 'sort_order': 1, 'is_active': True},
        {'id': uuid.uuid4(), 'name': 'Fun', 'description': 'Fun and playful gifts', 'icon': '🎉', 'sort_order': 2, 'is_active': True},
        {'id': uuid.uuid4(), 'name': 'Premium', 'description': 'Exclusive premium gifts', 'icon': '💎', 'sort_order': 3, 'is_active': True},
        {'id': uuid.uuid4(), 'name': 'Seasonal', 'description': 'Limited time seasonal gifts', 'icon': '🎄', 'sort_order': 4, 'is_active': True}
    ])
    
    # Insert sample virtual gifts
    gifts_table = sa.table('virtual_gifts',
        sa.column('id', sa.Uuid),
        sa.column('name', sa.String),
        sa.column('description', sa.Text),
        sa.column('image_url', sa.String),
        sa.column('price', sa.Numeric),
        sa.column('currency', sa.String),
        sa.column('is_animated', sa.Boolean),
        sa.column('is_premium', sa.Boolean),
        sa.column('sort_order', sa.Integer)
    )

    op.bulk_insert(gifts_table, [
        {'id': uuid.uuid4(), 'name': 'Red Rose', 'description': 'A classic symbol of love', 'image_url': '/static/gifts/rose.png', 'price': 10, 'currency': 'XTR', 'is_animated': False, 'is_premium': False, 'sort_order': 1},
        {'id': uuid.uuid4(), 'name': 'Heart Balloon', 'description': 'A cute heart balloon', 'image_url': '/static/gifts/heart_balloon.png', 'price': 15, 'currency': 'XTR', 'is_animated': True, 'is_premium': False, 'sort_order': 2},
        {'id': uuid.uuid4(), 'name': 'Teddy Bear', 'description': 'A cuddly teddy bear', 'image_url': '/static/gifts/teddy.png', 'price': 25, 'currency': 'XTR', 'is_animated': False, 'is_premium': False, 'sort_order': 3},
        {'id': uuid.uuid4(), 'name': 'Champagne', 'description': 'Celebrate special moments', 'image_url': '/static/gifts/champagne.png', 'price': 30, 'currency': 'XTR', 'is_animated': True, 'is_premium': False, 'sort_order': 4},
        {'id': uuid.uuid4(), 'name': 'Diamond Ring', 'description': 'For that special someone', 'image_url': '/static/gifts/diamond_ring.png', 'price': 100, 'currency': 'XTR', 'is_animated': True, 'is_premium': True, 'sort_order': 5},
        {'id': uuid.uuid4(), 'name': 'Romantic Dinner', 'description': 'Virtual dinner date', 'image_url': '/static/gifts/dinner.png', 'price': 50, 'currency': 'XTR', 'is_animated': False, 'is_premium': True, 'sort_order': 6},
        {'id': uuid.uuid4(), 'name': 'Star', 'description': 'You are my star', 'image_url': '/static/gifts/star.png', 'price': 5, 'currency': 'XTR', 'is_animated': True, 'is_premium': False, 'sort_order': 7},
        {'id': uuid.uuid4(), 'name': 'Chocolate Box', 'description': 'Sweet like you', 'image_url': '/static/gifts/chocolate.png', 'price': 20, 'currency': 'XTR', 'is_animated': False, 'is_premium': False, 'sort_order': 8}
    ])


def downgrade() -> None:
    op.drop_index('ix_gift_transactions_created_at', table_name='gift_transactions')
    op.drop_index('ix_gift_transactions_receiver_id', table_name='gift_transactions')
    op.drop_index('ix_gift_transactions_sender_id', table_name='gift_transactions')
    op.drop_table('gift_transactions')
    op.drop_table('virtual_gifts')
    op.drop_table('gift_categories')
