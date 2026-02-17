"""
Add ALL missing columns to match SQLAlchemy models.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


DATABASE_URL = os.getenv("DATABASE_URL")
if "sslmode" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")


async def migrate():
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # === audit_logs ===
        # Model expects: admin_id(done), action(exists), target_resource, changes, ip_address(exists), user_agent(exists), created_at(exists)
        await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_resource VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes JSON DEFAULT '{}';"))
        
        # === revenue_transactions ===
        # Model expects many columns not in DB
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(30);"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS telegram_charge_id VARCHAR(100);"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS subscription_id UUID;"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS promo_code_id UUID;"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS acquisition_channel VARCHAR(50);"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS affiliate_id VARCHAR(50);"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS custom_metadata JSON DEFAULT '{}';"))
        await conn.execute(text("ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;"))
        
        # === user_notes ===
        # Model expects: author_id(done), content, is_internal
        await conn.execute(text("ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS content TEXT;"))
        await conn.execute(text("ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT TRUE;"))
        
        # Copy existing data to new columns where possible
        # audit_logs: entity_type+entity_id -> target_resource
        await conn.execute(text("""
            UPDATE audit_logs SET target_resource = COALESCE(entity_type, '') || ':' || COALESCE(entity_id::text, '')
            WHERE target_resource IS NULL AND (entity_type IS NOT NULL OR entity_id IS NOT NULL);
        """))
        # audit_logs: old_values/new_values -> changes
        await conn.execute(text("""
            UPDATE audit_logs SET changes = COALESCE(new_values, '{}')
            WHERE changes IS NULL OR changes::text = '{}';
        """))
        # user_notes: note -> content
        await conn.execute(text("""
            UPDATE user_notes SET content = note WHERE content IS NULL AND note IS NOT NULL;
        """))
        # user_notes: admin_id -> author_id
        await conn.execute(text("""
            UPDATE user_notes SET author_id = admin_id WHERE author_id IS NULL AND admin_id IS NOT NULL;
        """))
        
        print("Migration completed successfully!")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
