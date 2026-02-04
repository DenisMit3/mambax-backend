import sqlite3

conn = sqlite3.connect('mambax.db')
c = conn.cursor()

try:
    c.execute('ALTER TABLE users ADD COLUMN last_seen DATETIME')
    conn.commit()
    print('✅ Column last_seen added successfully')
except sqlite3.OperationalError as e:
    if 'duplicate column name' in str(e):
        print('✅ Column last_seen already exists')
    else:
        print(f'❌ Error: {e}')

conn.close()
