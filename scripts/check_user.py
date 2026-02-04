import asyncio
import sys
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add parent dir to path to find backend module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.user import User

DATABASE_URL = "sqlite+aiosqlite:///./mambax.db"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Checking for user 'RezidentMD'...")
        stmt = select(User).where(User.username == "RezidentMD")
        result = await session.execute(stmt)
        user = result.scalars().first()
        
        if user:
            print(f"FOUND: ID={user.id}, Username={user.username}, TelegramID={user.telegram_id}, Phone={user.phone}")
        else:
            print("NOT FOUND: User 'RezidentMD' does not exist in the database.")
            
        print("\nChecking for ANY user with telegram_id...")
        stmt = select(User).where(User.telegram_id.isnot(None))
        result = await session.execute(stmt)
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.username}, TelegramID: {u.telegram_id}")

if __name__ == "__main__":
    try:
        asyncio.run(check())
    except Exception as e:
        print(f"Error: {e}")
