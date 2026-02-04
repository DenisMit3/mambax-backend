
import sqlite3

def check():
    conn = sqlite3.connect('backend/mambax.db')
    cursor = conn.cursor()
    # Find Anna
    cursor.execute("SELECT id, name, age FROM users WHERE name LIKE 'Анна%'")
    annas = cursor.fetchall()
    print(f"Found Annas: {annas}")

    if annas:
        user_id = annas[0][0]
        # Check photos
        cursor.execute("SELECT url FROM user_photos WHERE user_id = ?", (user_id,))
        photos = cursor.fetchall()
        print(f"Photos for {annas[0][1]}: {photos}")
    
    conn.close()

if __name__ == "__main__":
    check()
