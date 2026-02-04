import asyncio
import sys
import os

# Setup path
sys.path.append(os.getcwd())
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///backend/mambax.db"

from backend.db.session import async_session_maker
from backend.crud.user import update_profile
from backend.models.user import User, Gender
from backend.schemas.user import UserUpdate
from sqlalchemy import select

async def debug_update():
    async with async_session_maker() as db:
        print("🔍 checking users...")
        result = await db.execute(select(User).limit(1))
        user = result.scalars().first()
        
        if not user:
            print("❌ No users found!")
            return

        print(f"👤 Found user: {user.id} ({user.name})")

        # Create Update Data Pydantic Model
        update_data = UserUpdate(
            name="DebugTest", 
            age=25, 
            gender=Gender.MALE, 
            interests=["DebugTag"],
            # bio, photos etc are optional/None
        )

        print(f"🛠 Trying update_profile with: {update_data}")
        
        try:
            updated_user = await update_profile(db, str(user.id), update_data)
            print(f"✅ Update Success! New Name: {updated_user.name}")
            print(f"interests: {[i.tag for i in updated_user.interests_rel]}")
        except Exception as e:
            print(f"❌ Update CRASHED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_update())
