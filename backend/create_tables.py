import asyncio
import sys
import os

sys.path.append(os.getcwd())

from backend.db.session import engine
from backend.db.base import Base
# Import ALL models to register them
from backend import models 

async def create_tables():
    print("Creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created!")
    
    # Run Seed
    from backend.seed import seed_db
    from backend.db.session import async_session_maker
    
    print("Seeding DB...")
    async with async_session_maker() as db:
        await seed_db(db)
    print("Seeding Complete!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_tables())
