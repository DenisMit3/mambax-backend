import sqlite3

conn = sqlite3.connect('mambax.db')
c = conn.cursor()

print("=== Messages in database ===")
c.execute('SELECT id, sender_id, receiver_id, text FROM messages LIMIT 10')
rows = c.fetchall()
for r in rows:
    print(f"ID: {r[0][:8]}... | Sender: {r[1][:8]}... | Receiver: {r[2][:8] if r[2] else 'None'} | Text: {r[3][:20] if r[3] else 'None'}...")

print("\n=== Distinct sender_ids ===")
c.execute('SELECT DISTINCT sender_id FROM messages')
senders = c.fetchall()
for s in senders:
    print(f"  Sender ID: {s[0]}")

conn.close()
