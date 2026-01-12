
import asyncio
import os
import sys

# Set env vars BEFORE imports
# Ensure we point to the SAME db as Alembic created (backend/mambax.db)
# Assuming we run this script from project ROOT
os.environ["SECRET_KEY"] = "dev-secret-key-for-local-development-32chars"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./backend/mambax.db" # Adjusted path
os.environ["TELEGRAM_BOT_TOKEN"] = "dummy"

# Add backend to path
sys.path.append(os.getcwd())

from backend.database import get_db, AsyncSessionLocal
from backend import crud, schemas, auth, models
from backend.core.security import hash_password
from sqlalchemy import select

async def main():
    print("Initializing Seed...")
    try:
        from backend.database import engine
        # Verify connection first
        async with engine.connect() as conn:
            print("DB Connected!")

        async with AsyncSessionLocal() as session:
            identifier = "@RezidentMD"
            print(f"Checking for user {identifier}...")
            
            # Using basic select to debug if crud fails
            stmt = select(models.User).where(models.User.telegram_id == identifier)
            result = await session.execute(stmt)
            user = result.scalars().first()
            
            if not user:
                print("Creating test user...")
                new_user = models.User(
                    telegram_id=identifier,
                    username="RezidentMD",
                    name="Test User",
                    age=25,
                    gender="male",
                    hashed_password=hash_password("dummy"),
                    is_active=True,
                    is_verified=True,
                    role="admin",
                    # Add required fields to avoid validation errors
                    email="test@example.com", 
                    status="active",
                    subscription_tier="free"
                )
                session.add(new_user)
                await session.commit()
                print(f"User {identifier} created successfully.")
            else:
                print(f"User {identifier} already exists.")
                
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
