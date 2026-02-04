import sqlite3
import uuid
from datetime import datetime

conn = sqlite3.connect('mambax.db')
c = conn.cursor()

# Found from previous output - match with Ekaterina
match_id = 'ceb324f4c0ea4bffb16d779850424b47'
your_id = '8a01a04f77a54dd19cd61a69216bee67'
ekaterina_id = 'eb4db2dfec064784bda71a23c404048a'

# Insert test message from Ekaterina
msg_id = uuid.uuid4().hex
now = datetime.utcnow().isoformat()

c.execute('''
    INSERT INTO messages (id, match_id, sender_id, receiver_id, text, type, created_at, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
''', (
    msg_id,
    match_id,
    ekaterina_id,  # Ekaterina sends
    your_id,       # You receive
    'Привет! Это тестовое сообщение от меня 😊',
    'text',
    now,
    0
))

conn.commit()
print(f"✅ Added test message from Ekaterina (ID: {msg_id[:8]}...)")
print(f"   Match: {match_id[:8]}...")
print(f"   Sender (Ekaterina): {ekaterina_id[:8]}...")
print(f"   Receiver (You): {your_id[:8]}...")

conn.close()
