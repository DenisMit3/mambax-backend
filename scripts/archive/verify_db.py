
import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from backend.db.session import async_session_maker
from backend.crud.user import get_user_by_email
from sqlalchemy import text

async def main():
    print("Testing DB Connection...")
    try:
        async with async_session_maker() as session:
            print("Session created.")
            # Test simple query
            res = await session.execute(text("SELECT 1"))
            print(f"Simple query result: {res.scalar()}")
            
            # Test user table
            res = await session.execute(text("SELECT count(*) FROM users"))
            print(f"Users count: {res.scalar()}")
            
    except Exception as e:
        print(f"DB Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
