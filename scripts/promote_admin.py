import asyncio
import os
import sys

# Add backend to sys.path to allow imports
sys.path.append(os.getcwd())

from backend.db.session import async_session_maker
from backend.models.user import User
from sqlalchemy import select

async def make_admin():
    print("Connecting to DB...")
    async with async_session_maker() as db:
        # Try to find the user we just created (+79062148253)
        stmt = select(User).where(User.phone == "+79062148253")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            print(f"Found user: {user.name} (ID: {user.id})")
            user.role = "admin"
            await db.commit()
            print("SUCCESS: User promoted to admin")
        else:
            print("User 79998887766 not found. Trying to find any user...")
            stmt = select(User).limit(1)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                 print(f"Promoting fallback user: {user.name} ({user.phone})")
                 user.role = "admin"
                 await db.commit()
                 print("SUCCESS: Fallback user promoted")
            else:
                 print("ERROR: No users found in DB")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(make_admin())
