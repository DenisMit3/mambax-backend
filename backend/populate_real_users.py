import asyncio
import random
import sys
import os

# FORCE RELATIVE SQLite DB path to match start_no_docker.bat
# Must be set BEFORE importing backend.db.session which loads settings
# os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///backend/mambax.db"

# Add project root to path
sys.path.append(os.getcwd())

# Now imports
from backend.db.session import async_session_maker
from backend.models.user import User, UserPhoto, UserInterest, Gender, UserRole, UserStatus
from backend.db.base import Base # Just to be sure models are registered

NAMES_MALE = [
    "Александр", "Дмитрий", "Максим", "Сергей", "Андрей", 
    "Алексей", "Артем", "Илья", "Кирилл", "Михаил"
]
NAMES_FEMALE = [
    "Анна", "Мария", "Елена", "Дарья", "Алина", 
    "Ирина", "Екатерина", "Арина", "Полина", "Ольга"
]

INTERESTS_LIST = [
    "Спорт", "Музыка", "Путешествия", "Кино", "Книги", "IT", "Бизнес", 
    "Природа", "Еда", "Наука", "Искусство", "Фотография", "Авто", 
    "Игры", "Танцы", "Йога"
]

BIOS_MALE = [
    "Люблю активный отдых и путешествия.", "Ищу серьезные отношения.", 
    "Развиваюсь в IT, люблю спорт.", "Честность на первом месте.",
    "Простой парень, люблю горы.", "Много работаю, хочу уюта.",
    "Спортсмен, ищу единомышленницу.", "Люблю готовить и вкусно поесть.",
    "Мечтаю объехать весь мир.", "Творческая личность."
]

BIOS_FEMALE = [
    "Верю в любовь с первого взгляда.", "Ищу надежного мужчину.",
    "Люблю уют и котиков.", "Занимаюсь фитнесом и саморазвитием.",
    "Ищу партнера для путешествий.", "Люблю искусство и театр.",
    "Мечтаю о крепкой семье.", "Жизнерадостная и открытая.",
    "Люблю долгие прогулки.", "Целеустремленная и добрая."
]

def get_photos(gender, start_index):
    g_code = "men" if gender == "male" else "women"
    return [
        f"https://randomuser.me/api/portraits/{g_code}/{(start_index) % 99}.jpg",
        f"https://randomuser.me/api/portraits/{g_code}/{(start_index + 25) % 99}.jpg",
        f"https://randomuser.me/api/portraits/{g_code}/{(start_index + 50) % 99}.jpg",
        f"https://randomuser.me/api/portraits/{g_code}/{(start_index + 75) % 99}.jpg"
    ]

async def create_users():
    print(f"Using Database: {os.environ.get('DATABASE_URL')}")
    async with async_session_maker() as db:
        print("🚀 Starting population of 20 realistic users...")
        
        users_added = 0
        
        # 10 Males
        for i, name in enumerate(NAMES_MALE):
            phone = f"+79{random.randint(100, 999)}{random.randint(100000, 999999)}"
            tg_id = str(random.randint(100000000, 999999999))
            
            user = User(
                phone=phone,
                telegram_id=tg_id,
                username=f"user_{phone[-6:]}",
                name=name,
                age=random.randint(22, 35),
                gender=Gender.MALE,
                bio=BIOS_MALE[i],
                is_complete=True,
                is_verified=True,
                is_vip=random.choice([True, False]),
                hashed_password="fake_hash_secure",
                role=UserRole.USER,
                status=UserStatus.ACTIVE
            )
            db.add(user)
            await db.flush() # Generate IDs

            # Add Photos
            for url in get_photos("male", i):
                p = UserPhoto(user_id=user.id, url=url)
                db.add(p)
            
            # Add Interests
            tags = random.sample(INTERESTS_LIST, 4)
            for tag in tags:
                interest = UserInterest(user_id=user.id, tag=tag)
                db.add(interest)
            
            users_added += 1

        # 10 Females
        for i, name in enumerate(NAMES_FEMALE):
            phone = f"+79{random.randint(100, 999)}{random.randint(100000, 999999)}"
            tg_id = str(random.randint(100000000, 999999999))
            
            user = User(
                phone=phone,
                telegram_id=tg_id,
                username=f"user_{phone[-6:]}",
                name=name,
                age=random.randint(19, 30),
                gender=Gender.FEMALE,
                bio=BIOS_FEMALE[i],
                is_complete=True,
                is_verified=True,
                is_vip=random.choice([True, False]),
                hashed_password="fake_hash_secure",
                role=UserRole.USER,
                status=UserStatus.ACTIVE
            )
            db.add(user)
            await db.flush()

            # Add Photos
            for url in get_photos("female", i):
                p = UserPhoto(user_id=user.id, url=url)
                db.add(p)
            
            # Add Interests
            tags = random.sample(INTERESTS_LIST, 4)
            for tag in tags:
                interest = UserInterest(user_id=user.id, tag=tag)
                db.add(interest)

            users_added += 1
        
        await db.commit()
        print(f"✅ Successfully populated database with {users_added} Verified, Complete Users (10 Male, 10 Female).")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_users())
