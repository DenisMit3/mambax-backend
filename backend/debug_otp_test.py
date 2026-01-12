
import asyncio
import os
import sys

# Set env vars BEFORE imports
os.environ["SECRET_KEY"] = "dev-secret-key-for-local-development-32chars"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./mambax.db"
os.environ["TELEGRAM_BOT_TOKEN"] = "dummy"

# Add backend to path
sys.path.append(os.getcwd())

from backend.database import get_db, AsyncSessionLocal
from backend import crud, schemas, auth, models
from sqlalchemy import select

async def main():
    print("Testing DB connection...")
    try:
        from backend.database import engine
        async with engine.connect() as conn:
            print("DB Connected!")
            
        async with AsyncSessionLocal() as session:
            print("Session created.")
            
            identifier = "@RezidentMD"
            print(f"Finding user {identifier}...")
            
            user = await crud.get_user_by_identifier(session, identifier)
            if user:
                print(f"User found: {user.telegram_id}")
            else:
                print("User not found (Will use demo mode)")
            
            otp = auth.generate_otp()
            auth.save_otp(identifier, otp)
            print(f"OTP Generated and Saved: {otp}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
