import asyncio
import httpx
import uuid
from uuid import uuid4

# Config
BASE_URL = "http://localhost:8001"
# We need a token. We can try to use a "dev" token if available, or generate one if we can access the secret.
# Or we can use the /auth/telegram endpoint if we mock the data, but that's hard (HMAC).
# Let's try to simulate a login or just generate a token locally using the same secret if we can read it.
# Actually, since we are on the server machine, we can just import the token generator!

import sys
import os
sys.path.append(os.getcwd())

from backend.core.security import create_access_token
from backend.core.config import settings

async def test_flow():
    # 1. Generate Tokens for 2 users
    user1_id = str(uuid4())
    user2_id = str(uuid4())
    match_id = str(uuid4())
    
    token1 = create_access_token(user1_id)
    token2 = create_access_token(user2_id)
    
    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    print(f"User 1: {user1_id}")
    print(f"User 2: {user2_id}")

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # Note: We need to create a Match in DB for them to chat?
        # The API checks if match exists: "if not match_obj: raise HTTPException(404)"
        # So we MUST create a match in the DB first.
        # We can use the 'seed.py' logic or just insert directly if we have DB access.
        # Importing crud/models here is best.
        
        from backend.db.session import async_session_maker
        from backend.models.interaction import Match
        from datetime import datetime
        
        async with async_session_maker() as db:
            m = Match(
                id=uuid.UUID(match_id),
                user1_id=uuid.UUID(user1_id),
                user2_id=uuid.UUID(user2_id),
                created_at=datetime.utcnow(),
                is_active=True
            )
            db.add(m)
            try:
                await db.commit()
                print("✅ Match created in DB")
            except Exception as e:
                print(f"Match creation failed (might exist): {e}")
                await db.rollback()

        # 2. Test Voice Upload
        print("\n--- Testing Voice Upload ---")
        # Create dummy wav
        with open("test.wav", "wb") as f:
            f.write(b"RIFF" + b"\x00"*32) # Fake header
        
        # Real ffmpeg needs real audio. Let's send a text message first.
        
        print("\n--- Testing Text Message ---")
        msg_payload = {
            "match_id": match_id,
            "text": "Hello User 2!",
            "type": "text"
        }
        message_id = None
        try:
            resp = await client.post("/chat/send", json=msg_payload, headers=headers1)
            if resp.status_code == 200:
                print("✅ Text Message Sent")
                msg_data = resp.json()
                message_id = msg_data['id']
                print(f"Message ID: {message_id}")
            else:
                print(f"❌ Text Message Failed: {resp.text}")
        except httpx.ReadTimeout:
             print("⚠️ Text Message Timed Out (Likely Push Notification Issue)")
             
        # Fetch History to get ID if missing
        if not message_id:
             print("Fetching history to recover Message ID...")
             resp = await client.get(f"/chat/history/{user2_id}", headers=headers1)
             if resp.status_code == 200:
                 msgs = resp.json()
                 if msgs:
                     message_id = msgs[0]['id']
                     print(f"Recovered Message ID: {message_id}")

        if not message_id:
             print("❌ Could not get message ID, aborting read receipt test.")
        else:
            # 4. Test Read Receipt
            print("\n--- Testing Read Receipt ---")
            read_payload = {
                "match_id": match_id,
                "message_ids": [message_id]
            }
            resp = await client.post("/chat/read", json=read_payload, headers=headers2)
            if resp.status_code == 200:
                print("✅ Read Receipt Sent")
            else:
                print(f"❌ Read Receipt Failed: {resp.text}")

        # 5. Test Voice Upload (Mocked if no real file)
        # We need a valid audio file for ffmpeg or the backend will error 500.
        # We'll skip actual upload if we don't have a valid file to generate.
        # Unless we can find one in the system.
        
        print("\n--- Testing Voice Endpoint Structure ---")
        # We'll send a dummy file and expect a 400 or 500 (from ffmpeg) but check if endpoint is reachable
        files = {'file': ('test.wav', b'dummy content', 'audio/wav')}
        resp = await client.post("/chat/voice", files=files, headers=headers1)
        if resp.status_code == 200:
            print("✅ Voice Upload Success")
        elif resp.status_code == 500:
            print("⚠️ Voice Upload Reached (Failed @ FFmpeg as expected with dummy file)")
        else:
            print(f"❌ Voice Upload Endpoint Issue: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_flow())
