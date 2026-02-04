import sqlite3
import requests
import os
import uuid

UPLOADS_DIR = "backend/static/uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

conn = sqlite3.connect('backend/mambax.db')
cursor = conn.cursor()

# Get photos that are external URLs (randomuser.me)
cursor.execute("SELECT id, url FROM user_photos WHERE url LIKE 'https://%'")
external_photos = cursor.fetchall()
print(f"Found {len(external_photos)} external photo URLs to download")

downloaded = 0
for photo_id, url in external_photos:
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            # Save locally
            filename = f"{uuid.uuid4()}.jpg"
            filepath = os.path.join(UPLOADS_DIR, filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            # Update DB with local path
            local_url = f"/static/uploads/{filename}"
            cursor.execute("UPDATE user_photos SET url = ? WHERE id = ?", (local_url, photo_id))
            downloaded += 1
            if downloaded % 10 == 0:
                print(f"Downloaded {downloaded}...")
    except Exception as e:
        print(f"Failed to download {url}: {e}")

conn.commit()
conn.close()
print(f"Done! Downloaded {downloaded} photos")
