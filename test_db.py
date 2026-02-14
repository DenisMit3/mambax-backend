"""Quick script to test database connection.
NOTE: Set DATABASE_URL environment variable before running.
"""
import asyncio
import os

async def test():
    try:
        import asyncpg
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            print("ERROR: Set DATABASE_URL environment variable")
            return
        
        conn = await asyncio.wait_for(
            asyncpg.connect(db_url),
            timeout=15
        )
        version = await conn.fetchval('SELECT version()')
        print(f'Connected OK: {version}')
        
        tables = await conn.fetch(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        )
        print(f'Tables ({len(tables)}):')
        for t in tables:
            print(f'  - {t["table_name"]}')
        
        await conn.close()
    except Exception as e:
        print(f'DB Error: {type(e).__name__}: {e}')

asyncio.run(test())
