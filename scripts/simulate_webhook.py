import asyncio
import os
import uuid
import sys
import httpx
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Backend Modules
try:
    from backend.models.user import User
    from backend.models.monetization import RevenueTransaction, VirtualGift, GiftTransaction
    from backend.config.settings import settings
except ImportError as e:
    print(f"Error importing backend modules: {e}")
    print("Make sure you run this script from the project root or scripts folder.")
    sys.exit(1)

# Config
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "mambax-secret-token-change-in-prod")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_URL = "http://localhost:8001"

async def setup_db_session():
    # Use settings URL or fallback
    db_url = settings.DATABASE_URL
    if not db_url:
         db_url = "sqlite+aiosqlite:///./mambax.db"
    
    engine = create_async_engine(db_url)
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    if not BOT_TOKEN:
        print("❌ Error: TELEGRAM_BOT_TOKEN not set in environment.")
        return

    print("--- E2E Telegram Payment Simulation ---")
    
    try:
        SessionLocal = await setup_db_session()
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return

    transaction_id = None
    gift_price = 10 
    
    # 1. Prepare DB State
    async with SessionLocal() as db:
        print("🛠️  Checking/Creating Test Data in DB...")
        
        # Get Users
        users = (await db.execute(select(User).limit(2))).scalars().all()
        if len(users) < 2:
            print("❌ Need at least 2 users in DB to test Gifts. Please run seeding script first.")
            return
            
        sender = users[0]
        receiver = users[1]
        print(f"   Sender: {sender.id} ({sender.name})")
        print(f"   Receiver: {receiver.id} ({receiver.name})")
        
        # Get Gift
        gift = await db.scalar(select(VirtualGift).where(VirtualGift.is_active==True).limit(1))
        if not gift:
            print("❌ No active gifts found in DB.")
            return
        
        print(f"   Gift: {gift.name} (Price: {gift.price})")
        gift_price = int(gift.price)
        
        # Create Pending Transaction
        transaction_id = uuid.uuid4()
        pending_tx = RevenueTransaction(
            id=transaction_id,
            user_id=sender.id,
            transaction_type="gift_purchase",
            amount=gift.price,
            currency="XTR",
            status="pending",
            payment_gateway="telegram_stars",
            created_at=datetime.utcnow(),
            custom_metadata={
                "gift_id": str(gift.id),
                "receiver_id": str(receiver.id),
                "message": "Automated E2E Test Gift",
                "is_anonymous": False
            }
        )
        db.add(pending_tx)
        await db.commit()
        print(f"✅ Created Pending Transaction: {transaction_id}")

    # 2. Call Webhook
    webhook_url = f"{API_URL}/bot/webhook/{BOT_TOKEN}"
    
    # Simulate Telegram Payload
    # Note: 'invoice_payload' must match our transaction ID
    payload = {
        "update_id": 888888,
        "message": {
            "message_id": 777,
            "from": {
                "id": 123456789,
                "is_bot": False,
                "first_name": "TestSender",
                "username": "test_sender"
            },
            "chat": {"id": 123456789, "type": "private"},
            "date": int(datetime.utcnow().timestamp()),
            "successful_payment": {
                "currency": "XTR",
                "total_amount": gift_price,
                "invoice_payload": str(transaction_id),
                "telegram_payment_charge_id": f"chg_{uuid.uuid4()}",
                "provider_payment_charge_id": f"prov_{uuid.uuid4()}"
            }
        }
    }
    
    print(f"🚀 Sending Webhook to {webhook_url}...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                webhook_url, 
                json=payload, 
                headers={"X-Telegram-Bot-Api-Secret-Token": WEBHOOK_SECRET}
            )
            print(f"📡 Response: {resp.status_code} {resp.text}")
            
            if resp.status_code != 200:
                print("❌ Webhook call failed.")
                return

    except Exception as e:
        print(f"❌ Network Error: {e}")
        print("Ensure 'uvicorn' is running on port 8001.")
        return

    # 3. Verification
    print("⏳ Waiting for async processing (2s)...")
    await asyncio.sleep(2)
    
    async with SessionLocal() as db:
        # Check RevenueTransaction
        tx = await db.get(RevenueTransaction, transaction_id)
        if not tx:
            print("❌ Transaction vanished?")
            return
            
        print(f"📊 Transaction Status: {tx.status}")
        
        if tx.status == "completed":
            # Check GiftTransaction
            gift_tx = await db.scalar(
                select(GiftTransaction).where(GiftTransaction.payment_transaction_id == transaction_id)
            )
            if gift_tx:
                print(f"🎁 Gift Transaction Created! ID: {gift_tx.id}")
                status_icon = "✅" if gift_tx.status == "completed" else "⚠️"
                print(f"{status_icon} Gift Status: {gift_tx.status}")
                print("✅ E2E TEST PASSED SUCCESSFULY")
            else:
                print("❌ GiftTransaction missing (Delivery Logic Failed)")
        else:
            print("❌ Transaction not marked as completed")
            if tx.status == "pending":
                print("   (Webhook might have failed to locate transaction or bot logic error)")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
