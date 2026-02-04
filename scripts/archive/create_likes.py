import sqlite3
import random
import uuid
from datetime import datetime, timedelta

conn = sqlite3.connect('backend/mambax.db')
cursor = conn.cursor()

# Target: the user "уацуа" who is currently logged in
target_id = "ecced68700a2496e9481c6d2902bfc53"
cursor.execute("SELECT name FROM users WHERE id = ?", (target_id,))
target_name = cursor.fetchone()[0]
print(f"✅ Target user: {target_name} ({target_id})")

# Get other users to create likes from
cursor.execute("""
    SELECT id, name FROM users 
    WHERE id != ? AND is_active = 1 
    LIMIT 15
""", (target_id,))
fake_users = cursor.fetchall()
print(f"Found {len(fake_users)} users to create likes from")

# Create likes 
likes_created = 0
for user_id, user_name in fake_users:
    # Check if swipe already exists
    cursor.execute("SELECT id FROM swipes WHERE from_user_id = ? AND to_user_id = ?", (user_id, target_id))
    if cursor.fetchone():
        continue
    
    action = random.choice(['like', 'like', 'like', 'superlike'])
    timestamp = datetime.now() - timedelta(hours=random.randint(1, 72))
    swipe_id = uuid.uuid4().hex
    
    cursor.execute("""
        INSERT INTO swipes (id, from_user_id, to_user_id, action, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (swipe_id, user_id, target_id, action, timestamp.isoformat()))
    
    likes_created += 1
    print(f"  💖 {user_name} -> {target_name} ({action})")

conn.commit()
conn.close()

print(f"\n✅ Created {likes_created} likes for {target_name}!")
