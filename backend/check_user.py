import asyncio
import asyncpg

async def check_user():
    conn = await asyncpg.connect(
        'postgresql://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?ssl=require'
    )
    
    # Check all tables
    tables = await conn.fetch(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    )
    print("Tables in database:")
    for t in tables:
        print(f"  - {t['table_name']}")
    
    print("\n---\n")
    
    # Check all users
    users = await conn.fetch(
        "SELECT id, name, telegram_id, is_complete, gender FROM users LIMIT 10"
    )
    print(f"Users in database ({len(users)} shown):")
    for u in users:
        print(f"  - {u['name']} | tg_id: {u['telegram_id']} | complete: {u['is_complete']} | gender: {u['gender']}")
    
    # Check if photos table exists
    print("\n---\n")
    photos_table = await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'photos' OR table_name = 'user_photos'"
    )
    if photos_table:
        print("Photos table columns:", [p['column_name'] for p in photos_table])
    else:
        print("No photos table found")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_user())
