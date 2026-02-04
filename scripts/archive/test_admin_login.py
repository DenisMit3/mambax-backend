"""Test admin login endpoint"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///backend/mambax.db"
os.environ["ENVIRONMENT"] = "development"

from backend.crud.user import get_user_by_email
from backend.db.session import async_session_maker
from backend.core.security import verify_password


async def test():
    async with async_session_maker() as session:
        user = await get_user_by_email(session, "admin@mambax.app")
        if user:
            print(f"Found user: {user.email}")
            print(f"Role: {user.role}")
            # Test password
            result = verify_password("Admin123!", user.hashed_password)
            print(f"Password valid: {result}")
        else:
            print("User not found!")


if __name__ == "__main__":
    asyncio.run(test())
