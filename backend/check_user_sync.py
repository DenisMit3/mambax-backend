import psycopg2

conn = psycopg2.connect(
    host="ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech",
    database="neondb",
    user="neondb_owner",
    password="npg_vjOPMFZV5K9n",
    sslmode="require"
)

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
