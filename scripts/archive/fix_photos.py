
import sqlite3
import os
import random
from pathlib import Path

# Config
# Check both locations
DB_PATHS = ["mambax.db", "backend/mambax.db"]
UPLOADS_DIR = Path("backend/static/uploads")

def fix_photos():
    if not UPLOADS_DIR.exists():
        print(f"Directory not found: {UPLOADS_DIR}")
        return

    # 1. Get real files
    files = [f.name for f in UPLOADS_DIR.glob("*.jpg")]
    if not files:
        print("No .jpg files found in uploads!")
        return
    
    print(f"Found {len(files)} real images.")

    for db_path in DB_PATHS:
        if not os.path.exists(db_path):
            print(f"Skipping {db_path} (not found)")
            continue
            
        print(f"Processing DB: {db_path}...")
        
        try:
            # 2. Connect to DB
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # 3. Get all photo IDs
            try:
                cursor.execute("SELECT id FROM user_photos")
                photo_rows = cursor.fetchall()
                print(f"  Found {len(photo_rows)} photo records.")
            except sqlite3.OperationalError:
                print("  Table user_photos not found.")
                conn.close()
                continue

            # 4. Update each record with a random real file
            updated_count = 0
            for row in photo_rows:
                photo_id = row[0]
                random_file = random.choice(files)
                new_url = f"/static/uploads/{random_file}"
                
                cursor.execute("UPDATE user_photos SET url = ? WHERE id = ?", (new_url, photo_id))
                updated_count += 1

            conn.commit()
            conn.close()
            print(f"  Successfully updated {updated_count} records.")
            
        except Exception as e:
            print(f"  Error processing {db_path}: {e}")

if __name__ == "__main__":
    fix_photos()
