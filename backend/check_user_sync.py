"""Check user data (sync version with psycopg2).
NOTE: Set DATABASE_URL environment variable before running.
"""
import psycopg2
import os

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    print("[ERROR] Set DATABASE_URL environment variable")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)

cur = conn.cursor()

# Check if interests column exists in users table
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name IN ('photos', 'interests')
""")
cols = cur.fetchall()
print("Columns 'photos' and 'interests' in users table:")
for c in cols:
    print(f"  {c[0]}: {c[1]}")

if not cols:
    print("  Neither 'photos' nor 'interests' columns exist in users table!")

cur.close()
conn.close()
