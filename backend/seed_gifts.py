import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models.monetization import GiftCategory, VirtualGift

async def seed_gifts(db: AsyncSession):
    """
    Seeds the virtual gifts catalog with categories and items.
    Uses local images from /static/gifts/.
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
    
    await db.flush()
    
    # 3. Create Gifts (8 items with local images)
    gifts_data = [
        # Романтика
        {
            "name": "Красная роза",
            "description": "Классический символ любви",
            "price": 10,
            "category_idx": 0,
            "img": "/static/gifts/rose.png",
            "is_animated": False,
            "is_premium": False,
            "sort_order": 1
        },
        {
            "name": "Воздушное сердце",
            "description": "Милый воздушный шарик-сердечко",
            "price": 15,
            "category_idx": 0,
            "img": "/static/gifts/heart_balloon.png",
            "is_animated": True,
            "is_premium": False,
            "sort_order": 2
        },
        {
            "name": "Плюшевый мишка",
            "description": "Уютный плюшевый медвежонок",
            "price": 25,
            "category_idx": 0,
            "img": "/static/gifts/teddy.png",
            "is_animated": False,
            "is_premium": False,
            "sort_order": 3
        },
        # Веселье
        {
            "name": "Шампанское",
            "description": "Отпразднуйте особенный момент",
            "price": 30,
            "category_idx": 1,
            "img": "/static/gifts/champagne.png",
            "is_animated": True,
            "is_premium": False,
            "sort_order": 4
        },
        {
            "name": "Звезда",
            "description": "Ты - моя звезда!",
            "price": 5,
            "category_idx": 1,
            "img": "/static/gifts/star.png",
            "is_animated": True,
            "is_premium": False,
            "sort_order": 7
        },
        {
            "name": "Коробка конфет",
            "description": "Сладкая, как ты",
            "price": 20,
            "category_idx": 1,
            "img": "/static/gifts/chocolate.png",
            "is_animated": False,
            "is_premium": False,
            "sort_order": 8
        },
        # Премиум
        {
            "name": "Бриллиантовое кольцо",
            "description": "Для самого особенного человека",
            "price": 100,
            "category_idx": 2,
            "img": "/static/gifts/diamond_ring.png",
            "is_animated": True,
            "is_premium": True,
            "sort_order": 5
        },
        {
            "name": "Романтический ужин",
            "description": "Виртуальное свидание за ужином",
            "price": 50,
            "category_idx": 2,
            "img": "/static/gifts/dinner.png",
            "is_animated": False,
            "is_premium": True,
            "sort_order": 6
        }
    ]
    
    for g in gifts_data:
        gift = VirtualGift(
            id=uuid.uuid4(),
            category_id=categories[g["category_idx"]].id,
            name=g["name"],
            description=g["description"],
            image_url=g["img"],
            price=Decimal(str(g["price"])),
            currency="XTR",
            is_animated=g.get("is_animated", False),
            is_premium=g.get("is_premium", False),
            is_active=True,
            sort_order=g["sort_order"]
        )
        db.add(gift)
        
    await db.commit()
    print("✅ Virtual Gifts seeded successfully! (8 gifts, 3 categories)")
