"""
Простой скрипт сброса профиля через asyncpg напрямую.
NOTE: Set DATABASE_URL environment variable before running.
"""
import asyncio
import asyncpg
import ssl
import os

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    print("[ERROR] Set DATABASE_URL environment variable")
    exit(1)

async def main():
    print("[*] Connecting to PostgreSQL...")
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(DATABASE_URL, ssl=ssl_context),
            timeout=30.0
        )
        print("[OK] Connected!")
        
        # 1. Get users
        users = await conn.fetch("SELECT id, telegram_id, name, is_complete, gender FROM users")
        
        if not users:
            print("[!] No users in DB")
            await conn.close()
            return
        
        print(f"[*] Found {len(users)} user(s):")
        for user in users:
            print(f"    - TG: {user['telegram_id']}, Name: {user['name']}, Complete: {user['is_complete']}, Gender: {user['gender']}")
        
        # 2. Delete photos
        deleted_photos = await conn.execute("DELETE FROM user_photos")
        print(f"[*] Deleted photos: {deleted_photos}")
        
        # 3. Reset profiles
        updated = await conn.execute("UPDATE users SET is_complete = false, gender = 'other'")
        print(f"[*] Updated users: {updated}")
        
        await conn.close()
        
        print("\n[SUCCESS] Profiles reset!")
        print("    - is_complete = False")
        print("    - gender = 'other'")
        print("    - photos deleted")
        print("\n[*] Now AI onboarding will show when entering mini-app!")
        
    except asyncio.TimeoutError:
        print("[ERROR] Connection timeout (30 sec)")
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
