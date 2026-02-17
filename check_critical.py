import psycopg2

# Direct connection (no pooler)
conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    connect_timeout=15
)
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
tables = [r[0] for r in cur.fetchall()]
print(f'Total: {len(tables)}')
for t in tables:
    print(t)
cur.close()
conn.close()
