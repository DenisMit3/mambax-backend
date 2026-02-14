"""
Clear ALL users from the Neon database (including superadmin).
"""
import asyncio
import ssl
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://neondb_owner:npg_mRMN7C3ohGHz@ep-restless-pond-af40wky4-pooler.c-2.us-west-2.aws.neon.tech/neondb"

async def clear_database():
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"ssl": ssl_ctx}
    )
    
    async with engine.begin() as conn:
        # Get all tables
        result = await conn.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        ))
        existing_tables = {row[0] for row in result.fetchall()}
        print(f"Found {len(existing_tables)} tables: {sorted(existing_tables)}")
        
        # Count users before
        result = await conn.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        print(f"Users before clear: {count}")
        
        # Truncate users with CASCADE (will cascade to FK-dependent tables)
        await conn.execute(text('TRUNCATE TABLE "users" CASCADE'))
        print("TRUNCATED: users CASCADE")
        
        # Also truncate user-related tables if they exist
        for table in ["user_identities", "user_push_tokens", "user_cohorts",
                       "otp_codes", "blacklisted_tokens", "audit_logs",
                       "deletion_requests", "entitlement_grants", "purchase_events",
                       "purchases", "purchase_intents"]:
            if table in existing_tables:
                try:
                    await conn.execute(text(f'TRUNCATE TABLE "{table}" CASCADE'))
                    print(f"TRUNCATED: {table}")
                except Exception as e:
                    print(f"SKIP {table}: {e}")
        
        # Verify
        result = await conn.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        print(f"Users after clear: {count}")
    
    await engine.dispose()
    print("DONE - Database fully cleared!")

if __name__ == "__main__":
    asyncio.run(clear_database())
