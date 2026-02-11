"""
Debug logging endpoint for receiving remote logs from frontend
Logs are saved to a file for monitoring
"""

from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import List, Any, Optional
from datetime import datetime
import json
import os
import uuid
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from backend import database, models
from backend.config.settings import settings

router = APIRouter(prefix="/debug", tags=["debug"])

# Log file path
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "frontend_logs.txt")

# Const for mock match
MOCK_MATCH_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")

class LogEntry(BaseModel):
    level: str
    message: str
    args: Optional[List[Any]] = None
    timestamp: str
    url: str
    userAgent: str

class LogBatch(BaseModel):
    logs: List[LogEntry]

def format_log_entry(entry: LogEntry) -> str:
    """Format a log entry for file output"""
    level_icons = {
        'log': '📝',
        'info': 'ℹ️',
        'warn': '⚠️',
        'error': '❌',
        'debug': '🔍'
    }
    icon = level_icons.get(entry.level, '📝')
    
    # Parse timestamp
    try:
        dt = datetime.fromisoformat(entry.timestamp.replace('Z', '+00:00'))
        time_str = dt.strftime('%H:%M:%S.%f')[:-3]
    except:
        time_str = entry.timestamp
    
    # Detect device type
    is_mobile = 'Mobile' in entry.userAgent or 'Android' in entry.userAgent or 'iPhone' in entry.userAgent
    device = '📱' if is_mobile else '💻'
    
    return f"{device} [{time_str}] {icon} [{entry.level.upper()}] {entry.message}"

@router.post("/logs")
async def receive_logs(batch: LogBatch, request: Request):
    """
    Receive logs from frontend and save to file
    """
    try:
        # Use utf-8 explicitly and ensure newline
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            for entry in batch.logs:
                formatted = format_log_entry(entry)
                f.write(formatted + "\n")
                # Also print to console for immediate visibility
                try:
                    print(formatted)
                except UnicodeEncodeError:
                    print(formatted.encode('utf-8'))
        
        return {"status": "ok", "received": len(batch.logs)}
    except Exception as e:
        print(f"Error saving logs: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/logs")
async def get_logs(lines: int = 50):
    """
    Get the last N lines of logs
    """
    try:
        if not os.path.exists(LOG_FILE):
            return {"logs": [], "message": "No logs yet"}
        
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            last_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {"logs": [line.strip() for line in last_lines]}
    except Exception as e:
        return {"logs": [], "error": str(e)}

@router.delete("/logs")
async def clear_logs():
    """
    Clear the log file
    """
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write(f"=== Logs cleared at {datetime.now().isoformat()} ===\n")
        return {"status": "ok", "message": "Logs cleared"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ============================================================================
# UTILITIES MOVED FROM MAIN.PY
# ============================================================================

# Initialize database endpoint (for Vercel)
@router.get("/init-db")
async def init_database():
    """Manually initialize database - call this once after deployment"""
    # Security check: Only allow in dev or if explicitly enabled via secret header (omitted for now)
    if settings.ENVIRONMENT == "production":
         return {"status": "error", "message": "Manual DB init disabled in production. Use Alembic."}

    try:
        # Create tables
        async with database.engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
        
        # Seed with demo data
        # Note: We can't easily import seed_db from main if avoiding circular imports.
        # We might need to move seed_db to a separate service if we want to use it here.
        # For now, we will skip the advanced seeding or import it inside the function if possible,
        # but main.py imports debug, so debug cannot import main.
        # Ideally seed_db should be in a separate file.
        
        return {"status": "success", "message": "Database initialized (Tables created). Note: Seeding requires independent script if not running via main startup."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Force fix match endpoint
@router.get("/fix-match")
async def fix_match_endpoint():
    try:
        async with database.async_session() as session:
             # 1. Check if match exists
             match = await session.get(models.Match, MOCK_MATCH_ID)
             if match:
                 return {"status": "ok", "message": f"Match {MOCK_MATCH_ID} already exists"}
             
             # 2. Get any 2 users
             result = await session.execute(select(models.User).limit(2))
             users = result.scalars().all()
             
             if len(users) < 2:
                 return {"status": "error", "message": "Not enough users to create match"}
             
             # 3. Create match
             print(f"Creating match {MOCK_MATCH_ID} between {users[0].id} and {users[1].id}")
             new_match = models.Match(
                 id=MOCK_MATCH_ID,
                 user1_id=users[0].id,
                 user2_id=users[1].id,
                 created_at=datetime.utcnow()
             )
             session.add(new_match)
             await session.commit()
                
        return {"status": "success", "message": f"Match {MOCK_MATCH_ID} created!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/seed-gifts")
async def seed_gifts_endpoint():
    """Manually seed gift catalog"""
    try:
        from backend.seed_gifts import seed_gifts
        async with database.async_session() as session:
            result = await seed_gifts(session)
        return {"status": "success", **result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Initialize/seed test users endpoint
@router.post("/init-users")
async def init_test_users():
    """Create test users for development. Only works in development mode."""
    if settings.ENVIRONMENT != "development":
        return {"status": "error", "message": "Only available in development mode"}
    
    try:
        from backend.seed_users import create_test_users
        count = await create_test_users(50)
        return {"status": "success", "message": f"Created {count} test users"}
    except ImportError:
        return {"status": "error", "message": "Seed module not found"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Database migration endpoint - adds missing columns
@router.get("/migrate")
async def migrate_database():
    """Add missing columns to database tables"""
    if settings.ENVIRONMENT == "production":
         return {"status": "error", "message": "Manual migration disabled in production. Use Alembic."}

    added_columns = []
    try:
        async with database.engine.begin() as conn:
            # Messages table columns
            message_columns = [
                ("duration", "VARCHAR"),
                ("photo_url", "VARCHAR(500)"),
                ("receiver_id", "VARCHAR"),
            ]
            for col_name, col_type in message_columns:
                try:
                    await conn.execute(text(f"ALTER TABLE messages ADD COLUMN {col_name} {col_type}"))
                    added_columns.append(f"messages.{col_name}")
                except Exception:
                    pass
            
            # Users table columns - all columns from User model
            user_columns = [
                ("email", "VARCHAR(255)"),
                ("height", "INTEGER"),
                ("smoking", "VARCHAR(20)"),
                ("drinking", "VARCHAR(20)"),
                ("education", "VARCHAR(50)"),
                ("looking_for", "VARCHAR(30)"),
                ("children", "VARCHAR(30)"),
                ("phone", "VARCHAR(50)"),
                ("telegram_id", "VARCHAR(50)"),
                ("username", "VARCHAR(100)"),
                ("is_complete", "BOOLEAN DEFAULT 0"),
                ("is_verified", "BOOLEAN DEFAULT 0"),
                ("verification_selfie", "VARCHAR(500)"),
                ("verified_at", "DATETIME"),
                ("status", "VARCHAR(20) DEFAULT 'active'"),
                ("subscription_tier", "VARCHAR(20) DEFAULT 'free'"),
                ("role", "VARCHAR(20) DEFAULT 'user'"),
                ("city", "VARCHAR(100)"),
                ("location", "VARCHAR(200)"),
            ]
            for col_name, col_type in user_columns:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    added_columns.append(f"users.{col_name}")
                except Exception:
                    pass
    
            # Matches table columns
            try:
                await conn.execute(text("ALTER TABLE matches ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                added_columns.append("matches.is_active")
            except Exception:
                pass
                
        msg = f"Migration complete. Added columns: {added_columns}" if added_columns else "All columns already exist"
        return {"status": "success", "message": msg, "added": added_columns}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/reset-profile/{telegram_id}")
async def reset_user_profile(telegram_id: str):
    """
    Reset user's is_complete flag to force re-onboarding.
    Use telegram_id to identify the user.
    """
    try:
        async with database.async_session() as session:
            # Find user by telegram_id
            result = await session.execute(
                select(models.User).where(models.User.telegram_id == telegram_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return {"status": "error", "message": f"User with telegram_id {telegram_id} not found"}
            
            # Reset profile completion
            old_status = user.is_complete
            user.is_complete = False
            user.photos = []  # Clear photos to ensure onboarding is required
            
            await session.commit()
            
            return {
                "status": "success",
                "message": f"Profile reset for user {user.name} (telegram_id: {telegram_id})",
                "old_is_complete": old_status,
                "new_is_complete": False
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/reset-all-profiles")
async def reset_all_profiles():
    """
    Reset ALL users' profiles to force re-onboarding.
    Sets is_complete=False, gender='other', and deletes all photos.
    """
    try:
        async with database.async_session() as session:
            # Get all users
            result = await session.execute(select(models.User))
            users = result.scalars().all()
            
            if not users:
                return {"status": "ok", "message": "No users found", "reset_count": 0}
            
            reset_users = []
            for user in users:
                reset_users.append({
                    "telegram_id": user.telegram_id,
                    "name": user.name,
                    "old_is_complete": user.is_complete
                })
                user.is_complete = False
                user.gender = models.Gender.OTHER
            
            # Delete all photos
            await session.execute(text("DELETE FROM user_photos"))
            
            await session.commit()
            
            return {
                "status": "success",
                "message": f"Reset {len(users)} user(s)",
                "reset_count": len(users),
                "users": reset_users
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.delete("/clear-all-users")
async def clear_all_users():
    """
    DANGER: Delete ALL users and related data from database.
    This prepares the database for fresh start with new users.
    """
    try:
        async with database.async_session() as session:
            # Count users before deletion
            result = await session.execute(select(models.User))
            users = result.scalars().all()
            user_count = len(users)
            
            if user_count == 0:
                return {"status": "ok", "message": "Database already empty", "deleted_users": 0}
            
            # Delete in correct order to respect foreign keys
            # 1. Delete messages
            await session.execute(text("DELETE FROM messages"))
            
            # 2. Delete matches
            await session.execute(text("DELETE FROM matches"))
            
            # 3. Delete swipes/interactions
            try:
                await session.execute(text("DELETE FROM swipes"))
            except:
                pass
            
            try:
                await session.execute(text("DELETE FROM interactions"))
            except:
                pass
            
            # 4. Delete user interests
            try:
                await session.execute(text("DELETE FROM user_interests"))
            except:
                pass
            
            # 5. Delete user photos
            try:
                await session.execute(text("DELETE FROM user_photos"))
            except:
                pass
                
            # 6. Delete gift transactions
            try:
                await session.execute(text("DELETE FROM gift_transactions"))
            except:
                pass
            
            # 7. Delete notifications
            try:
                await session.execute(text("DELETE FROM notifications"))
            except:
                pass
            
            # 8. Delete reports
            try:
                await session.execute(text("DELETE FROM reports"))
            except:
                pass
            
            # 9. Finally delete users
            await session.execute(text("DELETE FROM users"))
            
            await session.commit()
            
            return {
                "status": "success",
                "message": f"Database cleared! Deleted {user_count} users and all related data.",
                "deleted_users": user_count
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}
