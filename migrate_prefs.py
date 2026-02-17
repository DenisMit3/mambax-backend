import psycopg2

conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_vjOPMFZV5K9n@ep-still-band-agqygsk6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
)
conn.autocommit = True
cur = conn.cursor()

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_preferences'")
existing = [r[0] for r in cur.fetchall()]
print('Current columns:', existing)

if 'value' not in existing:
    cur.execute('ALTER TABLE user_preferences ADD COLUMN value JSONB')
    print('Added: value')
else:
    print('value exists')

if 'is_dealbreaker' not in existing:
    cur.execute('ALTER TABLE user_preferences ADD COLUMN is_dealbreaker BOOLEAN DEFAULT false')
    print('Added: is_dealbreaker')
else:
    print('is_dealbreaker exists')

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_preferences'")
final = [r[0] for r in cur.fetchall()]
print('Final:', final)

cur.close()
conn.close()
print('Done!')
