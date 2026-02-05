import asyncio
from backend.db.session import async_session_maker
from backend.models.monetization import VirtualGift, GiftCategory
from sqlalchemy import select

async def check():
    async with async_session_maker() as db:
        gifts = (await db.execute(select(VirtualGift))).scalars().all()
        cats = (await db.execute(select(GiftCategory))).scalars().all()
        print(f"Categories: {len(cats)}")
        print(f"Gifts: {len(gifts)}")
        for g in gifts:
            print(f" - {g.name} ({g.price} XTR)")

if __name__ == "__main__":
    asyncio.run(check())
