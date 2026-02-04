import sqlite3
conn = sqlite3.connect('backend/mambax.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM users')
count = cursor.fetchone()[0]
print(f'Users in DB: {count}')
cursor.execute('SELECT id, name, phone, telegram_id, is_complete FROM users LIMIT 5')
for row in cursor.fetchall():
    print(row)
conn.close()
