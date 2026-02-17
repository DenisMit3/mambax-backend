import psycopg2
import sys

conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    connect_timeout=10
)
conn.set_session(readonly=True)
cur = conn.cursor()

# Get table list first
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables, flush=True)

for t in sorted(tables):
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{t}' AND table_schema = 'public' ORDER BY ordinal_position")
    cols = [r[0] for r in cur.fetchall()]
    print(f"\n{t}: {cols}", flush=True)

cur.close()
conn.close()
print("\nDone!", flush=True)
