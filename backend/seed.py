from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from datetime import datetime
import uuid
from backend import models
from backend.config.settings import settings

# Constant UUID for mock match to ensure DB consistency
MOCK_MATCH_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")

async def seed_db(db: AsyncSession):
    # Create/Update Admin User
    try:
        admin_phone = settings.ADMIN_PHONE
        admin_username = settings.ADMIN_USERNAME
        
        # Check if admin exists by phone
        stmt = select(models.User).where(models.User.phone == admin_phone)
        result = await db.execute(stmt)
        admin_user = result.scalars().first()
        
        if not admin_user:
            # Check by username if no phone match
            stmt = select(models.User).where(models.User.username == admin_username.lower())
            result = await db.execute(stmt)
            admin_user = result.scalars().first()

        if not admin_user:
            print(f"Creating Admin User: {admin_username} ({admin_phone})")
            admin_user = models.User(
                phone=admin_phone,
                username=admin_username.lower(), # Store as lowercase for matching
                name=admin_username,
                role="admin",
                is_vip=True,
                is_verified=True,
                is_complete=True,
                hashed_password="admin_password_hash", # Should be changed
                gender="male", # Default
                age=30
            )
            db.add(admin_user)
            await db.commit()
        else:
            # Ensure admin rights
            if admin_user.role != "admin":
                print(f"Promoting user {admin_username} to admin.")
                admin_user.role = "admin"
                admin_user.is_vip = True
                await db.commit()
                
    except Exception as e:
        print(f"Failed to seed admin user: {e}")
        await db.rollback()

    # Check if test match exists - only skip user/match seeding, not verification
    result = await db.execute(select(models.Match).where(models.Match.id == MOCK_MATCH_ID))
    match_exists = result.scalars().first() is not None
    
    if match_exists:
        print("Test match already exists, skipping user/match seed...")
    else:
        print("Checking for existing users...")
        # Check if users already exist
        result = await db.execute(select(models.User).limit(2))
        existing_users = result.scalars().all()
        
        user_ids = []
        
        if len(existing_users) >= 2:
            print("Users found, creating match from existing users...")
            user_ids = [u.id for u in existing_users]
        else:
            print("Seeding database with new demo users...")
            demo_users = [
                {"name": "Alice", "gender": "female", "age": 24, "bio": "Loves hiking and coffee ☕", "img": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=60"},
                {"name": "Bob", "gender": "male", "age": 28, "bio": "Tech enthusiast and gamer 🎮", "img": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=60"},
                {"name": "Carol", "gender": "female", "age": 22, "bio": "Art student 🎨", "img": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=60"},
                {"name": "David", "gender": "male", "age": 30, "bio": "Chef at a local bistro 🍳", "img": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=60"},
                {"name": "Eva", "gender": "female", "age": 26, "bio": "Traveling the world 🌍", "img": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=60"},
            ]

            for u in demo_users:
                try:
                    # Create User with all profile fields (User and Profile are merged)
                    db_user = models.User(
                        phone=None, 
                        telegram_id=None, 
                        username=u["name"].lower(),
                        name=u["name"],
                        age=u["age"],
                        gender=u["gender"],
                        bio=u["bio"],
                        photos=[u["img"]],
                        interests=["Demo", "Vercel"],
                        is_complete=True,
                        hashed_password="mock_hash"
                    )
                    
                    db.add(db_user)
                    await db.commit()
                    await db.refresh(db_user)
                    user_ids.append(db_user.id)
                    
                except Exception as e:
                    print(f"Skipping user {u['name']}: {e}")
                    await db.rollback()



        # Create a test match 'mock1' for testing chat
        if len(user_ids) >= 2:
            try:
                test_match = models.Match(
                    id=MOCK_MATCH_ID,
                    user1_id=user_ids[0],
                    user2_id=user_ids[1],
                    created_at=datetime.utcnow()
                )
                db.add(test_match)
                await db.commit()
                print("Test match 'mock1' (UUID) created successfully!")
            except Exception as e:
                print(f"Failed to create match: {e}")
                await db.rollback()
    
    # Seed verification requests for demo
    try:
        from backend.models.user_management import VerificationRequest
        
        # Check if verification requests exist
        result = await db.execute(select(VerificationRequest).limit(1))
        if not result.scalars().first():
            print("Seeding verification requests...")
            # Get some users to create verification requests
            result = await db.execute(select(models.User).limit(3))
            users_for_verification = result.scalars().all()
            
            for i, user in enumerate(users_for_verification):
                if not user.is_verified:
                    verification_request = VerificationRequest(
                        user_id=user.id,
                        status="pending",
                        priority=10 - i * 3,  # Varying priorities
                        submitted_photos=user.photos or [],
                        ai_confidence=0.75 + (i * 0.1) if i < 2 else None,
                        created_at=datetime.utcnow()
                    )
                    db.add(verification_request)
            
            await db.commit()
            print("Verification requests seeded!")
    except Exception as e:
        print(f"Failed to seed verification requests: {e}")
        await db.rollback()
    
    # Seed virtual gifts catalog
    try:
        from backend.seed_gifts import seed_gifts
        await seed_gifts(db)
    except Exception as e:
        print(f"Gift seeding error: {e}")
    
    print("Seeding logic complete.")
