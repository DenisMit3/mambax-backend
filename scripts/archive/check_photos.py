import sqlite3
conn = sqlite3.connect('backend/mambax.db')
c = conn.cursor()
c.execute('SELECT COUNT(*) FROM user_photos')
print(f'Total photos: {c.fetchone()[0]}')
c.execute('SELECT url FROM user_photos LIMIT 5')
for r in c.fetchall():
    print(r[0][:100] if r[0] else 'NULL')
conn.close()
