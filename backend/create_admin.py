"""
Create Admin User Script
Creates an admin user with email/password auth for the admin panel
"""

import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from backend.models.user import User, UserRole, Gender, UserStatus, SubscriptionTier
from backend.core.security import hash_password

# Default admin credentials (change in production!)
ADMIN_EMAIL = "admin@mambax.app"
ADMIN_PASSWORD = "Admin123!"  # Change this in production!
ADMIN_NAME = "Admin"


async def create_admin_user():
    """Create or update admin user in the database."""
    
    # Get database URL from environment or use default SQLite
    database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///backend/mambax.db")
    
    print(f"Connecting to database: {database_url}")
    
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where(User.email == ADMIN_EMAIL)
        )
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            print(f"Admin user already exists: {ADMIN_EMAIL}")
            print(f"  - ID: {existing_admin.id}")
            print(f"  - Role: {existing_admin.role}")
            
            # Update role to admin if not already
            if existing_admin.role != UserRole.ADMIN:
                existing_admin.role = UserRole.ADMIN
                await session.commit()
                print("  - Updated role to ADMIN")
            
            # Update password
            existing_admin.hashed_password = hash_password(ADMIN_PASSWORD)
            await session.commit()
            print(f"  - Password updated to: {ADMIN_PASSWORD}")
            return existing_admin
        
        # Create new admin user
        admin_user = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            name=ADMIN_NAME,
            age=30,
            gender=Gender.MALE,
            bio="Platform Administrator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            subscription_tier=SubscriptionTier.PLATINUM,
            is_active=True,
            is_complete=True,
            is_verified=True,
        )
        
        session.add(admin_user)
        await session.commit()
        await session.refresh(admin_user)
        
        print("\n" + "=" * 50)
        print("✅ Admin user created successfully!")
        print("=" * 50)
        print(f"Email:    {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD}")
        print(f"Role:     {admin_user.role}")
        print(f"ID:       {admin_user.id}")
        print("=" * 50)
        print("\n⚠️  IMPORTANT: Change these credentials in production!")
        
        return admin_user


if __name__ == "__main__":
    asyncio.run(create_admin_user())
