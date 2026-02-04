import sqlite3
conn = sqlite3.connect('backend/mambax.db')
c = conn.cursor()
c.execute('SELECT to_user_id, from_user_id, action FROM swipes LIMIT 3')
print("Swipes:")
for r in c.fetchall():
    print(r)
c.execute('SELECT id FROM users WHERE name="Денис" LIMIT 1')
print('Denis ID:', c.fetchone())
conn.close()
