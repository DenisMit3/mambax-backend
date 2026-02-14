"""Quick script to check admin credentials in the database.
NOTE: Set DB_DSN environment variable before running.
"""
import asyncio
import ssl
import os
import asyncpg
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

DB_DSN = os.getenv("DATABASE_URL", "")

if not DB_DSN:
    print("ERROR: Set DATABASE_URL environment variable")
    exit(1)

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")

if not ADMIN_EMAIL:
    print("ERROR: Set ADMIN_EMAIL environment variable")
    exit(1)

async def check():
    ssl_ctx = ssl.create_default_context()
    conn = await asyncpg.connect(DB_DSN, ssl=ssl_ctx)
    
    row = await conn.fetchrow(
        "SELECT id, email, hashed_password, role, is_active FROM users WHERE email = $1",
        ADMIN_EMAIL
    )
    
    if not row:
        print(f"USER NOT FOUND: {ADMIN_EMAIL}")
        print("\nAll admin/moderator users:")
        rows = await conn.fetch(
            "SELECT id, email, role, is_active FROM users WHERE role IN ('admin', 'moderator', 'ADMIN', 'MODERATOR')"
        )
        for r in rows:
            print(f"  id={r['id']}, email={r['email']}, role={r['role']}, active={r['is_active']}")
        await conn.close()
        return
    
    print(f"User found: id={row['id']}, email={row['email']}, role={row['role']}, is_active={row['is_active']}")
    hashed = row['hashed_password']
    print(f"Hash: {hashed[:40] if hashed else 'NO HASH'}...")
    
    await conn.close()

asyncio.run(check())
