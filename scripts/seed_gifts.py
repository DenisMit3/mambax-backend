"""
Virtual Gifts Seed Data

Seeds the database with gift categories and virtual gifts.
Called from main.py during startup.
"""

from datetime import datetime
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.monetization import GiftCategory, VirtualGift


# Gift Categories
GIFT_CATEGORIES = [
    {"name": "Romantic", "description": "Express your love", "icon": "❤️", "sort_order": 1},
    {"name": "Celebration", "description": "Party time!", "icon": "🎉", "sort_order": 2},
    {"name": "Luxury", "description": "Premium gifts", "icon": "💎", "sort_order": 3},
    {"name": "Fun", "description": "Just for fun", "icon": "🎈", "sort_order": 4},
]


# Virtual Gifts
VIRTUAL_GIFTS = [
    {
        "name": "Red Rose",
        "description": "A beautiful red rose to show your affection",
        "image_url": "/static/gifts/rose.png",
        "price": 5,
        "category": "Romantic",
        "sort_order": 1,
        "is_premium": False,
        "is_animated": False
    },
    {
        "name": "Heart Balloon",
        "description": "Love is in the air!",
        "image_url": "/static/gifts/heart_balloon.png",
        "price": 10,
        "category": "Romantic",
        "sort_order": 2,
        "is_premium": False,
        "is_animated": False
    },
    {
        "name": "Teddy Bear",
        "description": "Cuddly teddy bear for your special someone",
        "image_url": "/static/gifts/teddy.png",
        "price": 25,
        "category": "Romantic",
        "sort_order": 3,
        "is_premium": False,
        "is_animated": False
    },
    {
        "name": "Diamond Ring",
        "description": "A sparkling diamond ring - the ultimate gift",
        "image_url": "/static/gifts/diamond_ring.png",
        "price": 100,
        "category": "Luxury",
        "sort_order": 1,
        "is_premium": True,
        "is_animated": True
    },
    {
        "name": "Champagne",
        "description": "Celebrate together with bubbly champagne",
        "image_url": "/static/gifts/champagne.png",
        "price": 50,
        "category": "Celebration",
        "sort_order": 1,
        "is_premium": False,
        "is_animated": False
    },
    {
        "name": "Chocolate Box",
        "description": "Sweet treats for your sweetheart",
        "image_url": "/static/gifts/chocolate.png",
        "price": 15,
        "category": "Fun",
        "sort_order": 1,
        "is_premium": False,
        "is_animated": False
    },
    {
        "name": "Golden Star",
        "description": "You're a star! Show your appreciation",
        "image_url": "/static/gifts/star.png",
        "price": 20,
        "category": "Fun",
        "sort_order": 2,
        "is_premium": False,
        "is_animated": True
    },
    {
        "name": "Romantic Dinner",
        "description": "A candlelit dinner for two",
        "image_url": "/static/gifts/dinner.png",
        "price": 75,
        "category": "Luxury",
        "sort_order": 2,
        "is_premium": True,
        "is_animated": False
    },
]


async def seed_gift_categories(db: AsyncSession) -> dict[str, UUID]:
    """
    Seed gift categories. Returns mapping of name -> id.
    Idempotent: skips existing categories.
    """
    category_map = {}
    
    for cat_data in GIFT_CATEGORIES:
        # Check if exists
        result = await db.execute(
            select(GiftCategory).where(GiftCategory.name == cat_data["name"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            category_map[cat_data["name"]] = existing.id
            continue
        
        # Create new
        category = GiftCategory(
            name=cat_data["name"],
            description=cat_data["description"],
            icon=cat_data["icon"],
            sort_order=cat_data["sort_order"],
            is_active=True
        )
        db.add(category)
        await db.flush()
        category_map[cat_data["name"]] = category.id
    
    await db.commit()
    return category_map


async def seed_virtual_gifts(db: AsyncSession, category_map: dict[str, UUID]) -> int:
    """
    Seed virtual gifts. Returns count of created gifts.
    Idempotent: skips existing gifts.
    """
    created_count = 0
    
    for gift_data in VIRTUAL_GIFTS:
        # Check if exists
        result = await db.execute(
            select(VirtualGift).where(VirtualGift.name == gift_data["name"])
        )
        if result.scalar_one_or_none():
            continue
        
        # Get category ID
        category_name = gift_data.get("category")
        category_id = category_map.get(category_name) if category_name else None
        
        # Create new
        gift = VirtualGift(
            name=gift_data["name"],
            description=gift_data.get("description"),
            image_url=gift_data["image_url"],
            price=gift_data["price"],
            currency="XTR",
            category_id=category_id,
            is_premium=gift_data.get("is_premium", False),
            is_animated=gift_data.get("is_animated", False),
            is_limited=False,
            is_active=True,
            sort_order=gift_data.get("sort_order", 0)
        )
        db.add(gift)
        created_count += 1
    
    await db.commit()
    return created_count


async def seed_gifts(db: AsyncSession) -> dict:
    """
    Main entry point: seeds categories and gifts.
    Called from main.py startup.
    """
    try:
        print("Seeding gift categories...")
        category_map = await seed_gift_categories(db)
        print(f"  -> {len(category_map)} categories ready")
        
        print("Seeding virtual gifts...")
        count = await seed_virtual_gifts(db, category_map)
        print(f"  -> {count} new gifts created")
        
        return {"categories": len(category_map), "gifts_created": count}
    except Exception as e:
        print(f"Gift seeding failed: {e}")
        await db.rollback()
        return {"error": str(e)}
