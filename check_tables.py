import psycopg2

conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    connect_timeout=10
)
conn.autocommit = True
cur = conn.cursor()

# Check user_prompts table
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_prompts' AND table_schema = 'public' ORDER BY ordinal_position")
cols = [r[0] for r in cur.fetchall()]
print('user_prompts:', cols if cols else 'TABLE DOES NOT EXIST')

# Check user_preferences again
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_preferences' AND table_schema = 'public' ORDER BY ordinal_position")
cols2 = [r[0] for r in cur.fetchall()]
print('user_preferences:', cols2)

cur.close()
conn.close()
print('Done!')
