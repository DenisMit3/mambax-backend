import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.monetization import GiftCategory, VirtualGift

async def seed_gifts(db: AsyncSession):
    """
    Seeds the virtual gifts catalog with categories and items.
    """
    print("Seeding Virtual Gifts...")
    
    # 1. Check if categories already exist
    result = await db.execute(select(GiftCategory).limit(1))
    if result.scalars().first():
        print("Gift categories already exist, skipping gift seed.")
        return

    # 2. Create Categories
    categories = [
        GiftCategory(
            id=uuid.uuid4(),
            name="Романтика",
            description="Подарки для проявления нежных чувств",
            icon="❤️",
            sort_order=1
        ),
        GiftCategory(
            id=uuid.uuid4(),
            name="Веселье",
            description="Поднимите настроение собеседнику",
            icon="🎉",
            sort_order=2
        ),
        GiftCategory(
            id=uuid.uuid4(),
            name="Премиум",
            description="Эксклюзивные подарки для особенных случаев",
            icon="💎",
            sort_order=3
        )
    ]
    
    for cat in categories:
        db.add(cat)
    
    await db.flush() # To get IDs for gifts
    
    # 3. Create Gifts
    gifts_data = [
        # Romantic
        {
            "name": "Красная роза",
            "price": 10,
            "category_idx": 0,
            "img": "https://cdn-icons-png.flaticon.com/512/726/726338.png"
        },
        {
            "name": "Сердце",
            "price": 25,
            "category_idx": 0,
            "img": "https://cdn-icons-png.flaticon.com/512/833/833472.png"
        },
        # Fun
        {
            "name": "Кофе",
            "price": 15,
            "category_idx": 1,
            "img": "https://cdn-icons-png.flaticon.com/512/924/924514.png"
        },
        {
            "name": "Пицца",
            "price": 20,
            "category_idx": 1,
            "img": "https://cdn-icons-png.flaticon.com/512/3595/3595455.png"
        },
        # Premium
        {
            "name": "Бриллиант",
            "price": 100,
            "category_idx": 2,
            "img": "https://cdn-icons-png.flaticon.com/512/3135/3135761.png",
            "is_premium": True
        },
        {
            "name": "Корона",
            "price": 250,
            "category_idx": 2,
            "img": "https://cdn-icons-png.flaticon.com/512/1067/1067055.png",
            "is_premium": True
        }
    ]
    
    for g in gifts_data:
        gift = VirtualGift(
            id=uuid.uuid4(),
            category_id=categories[g["category_idx"]].id,
            name=g["name"],
            description=f"Отправьте {g['name'].lower()} чтобы привлечь внимание!",
            image_url=g["img"],
            price=Decimal(str(g["price"])),
            currency="XTR",
            is_premium=g.get("is_premium", False),
            is_active=True,
            sort_order=0
        )
        db.add(gift)
        
    await db.commit()
    print("✅ Virtual Gifts seeded successfully!")
