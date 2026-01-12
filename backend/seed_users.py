"""
Seed script to create 50 test users for development.
Run: python seed_users.py
"""
import asyncio
import random
import uuid
from datetime import datetime, timedelta

# Setup path for imports
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database import AsyncSessionLocal
from backend.models.user import User

FIRST_NAMES_MALE = [
    "Александр", "Дмитрий", "Максим", "Сергей", "Андрей",
    "Алексей", "Артём", "Илья", "Кирилл", "Михаил",
    "Николай", "Павел", "Роман", "Владимир", "Егор"
]

FIRST_NAMES_FEMALE = [
    "Анна", "Мария", "Елена", "Ольга", "Наталья",
    "Татьяна", "Ирина", "Екатерина", "Светлана", "Юлия",
    "Дарья", "Алина", "Виктория", "Полина", "Кристина"
]

INTERESTS = [
    "Путешествия", "Спорт", "Музыка", "Кино", "Книги",
    "Кулинария", "Фотография", "Танцы", "Йога", "Бег",
    "Плавание", "Велосипед", "Искусство", "Театр", "Концерты",
    "Игры", "Природа", "Животные", "Технологии", "Мода"
]

CITIES = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург",
    "Казань", "Нижний Новгород", "Челябинск", "Самара",
    "Ростов-на-Дону", "Краснодар", "Уфа", "Волгоград"
]

BIOS_MALE = [
    "Люблю активный отдых и новые знакомства 🌟",
    "Ищу интересную девушку для общения ☕",
    "Обожаю путешествия и приключения ✈️",
    "Спорт, музыка, позитив - это про меня 💪",
    "Романтик в душе, ищу свою половинку ❤️",
    "Программист днём, гитарист вечером 🎸",
    "Фотограф-любитель, ценю красоту 📸",
    "Люблю готовить и вкусно поесть 🍳"
]

BIOS_FEMALE = [
    "Люблю смеяться и быть счастливой 😊",
    "Ищу интересного собеседника ☕",
    "Обожаю путешествия и море 🌊",
    "Творческая натура, люблю искусство 🎨",
    "Мечтаю о настоящих чувствах ❤️",
    "Позитивная и открытая новому 🌟",
    "Книголюб и киноман 📚🎬",
    "Активная, люблю спорт и природу 🏃‍♀️"
]

PHOTO_URLS_MALE = [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=500&q=60"
]

PHOTO_URLS_FEMALE = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=60",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=500&q=60"
]


async def create_test_users(count: int = 50):
    """Create test users for development."""
    async with AsyncSessionLocal() as session:
        print(f"🌱 Creating {count} test users...")
        
        created = 0
        for i in range(count):
            try:
                gender = "male" if i % 2 == 0 else "female"
                
                if gender == "male":
                    name = random.choice(FIRST_NAMES_MALE)
                    bio = random.choice(BIOS_MALE)
                    photos = random.sample(PHOTO_URLS_MALE, k=min(2, len(PHOTO_URLS_MALE)))
                else:
                    name = random.choice(FIRST_NAMES_FEMALE)
                    bio = random.choice(BIOS_FEMALE)
                    photos = random.sample(PHOTO_URLS_FEMALE, k=min(2, len(PHOTO_URLS_FEMALE)))
                
                age = random.randint(18, 45)
                
                user = User(
                    id=uuid.uuid4(),
                    phone=f"+7900{i:07d}",
                    username=f"user{i+1}",
                    hashed_password="test_hash_password",
                    name=name,
                    age=age,
                    gender=gender,
                    bio=bio,
                    photos=photos,
                    interests=random.sample(INTERESTS, k=random.randint(3, 6)),
                    height=random.randint(160, 190) if gender == "male" else random.randint(155, 175),
                    smoking=random.choice(["never", "sometimes", "regularly"]),
                    drinking=random.choice(["never", "socially", "regularly"]),
                    education=random.choice(["high_school", "bachelor", "master", "phd"]),
                    looking_for=random.choice(["relationship", "friendship", "casual"]),
                    latitude=55.7558 + random.uniform(-0.5, 0.5),  # Moscow area
                    longitude=37.6173 + random.uniform(-0.5, 0.5),
                    city=random.choice(CITIES),
                    is_active=True,
                    is_complete=True,
                    is_verified=random.choice([True, False]),
                    status="active",
                    subscription_tier=random.choice(["free", "free", "free", "gold", "vip"]),
                    role="user",
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365))
                )
                
                session.add(user)
                await session.commit()
                created += 1
                
                if (i + 1) % 10 == 0:
                    print(f"✅ Created {i + 1} users...")
                    
            except Exception as e:
                print(f"⚠️ Skipping user {i+1}: {e}")
                await session.rollback()
        
        print(f"🎉 Successfully created {created} test users!")
        return created


if __name__ == "__main__":
    asyncio.run(create_test_users())
