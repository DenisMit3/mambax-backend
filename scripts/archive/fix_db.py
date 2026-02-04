import sqlite3

conn = sqlite3.connect('backend/mambax.db')
cursor = conn.cursor()

# Fix invalid email and age
cursor.execute('''
    UPDATE users 
    SET email = NULL, age = 18 
    WHERE email LIKE '%@mambax.local' OR age > 120
''')

affected = cursor.rowcount
conn.commit()
print(f"Fixed {affected} users with invalid email/age")

# Verify
cursor.execute('SELECT id, name, email, age FROM users WHERE age > 120 OR email LIKE "%@mambax.local"')
remaining = cursor.fetchall()
print(f"Remaining invalid: {remaining}")

conn.close()
