from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from pathlib import Path
import shutil
import os
import uuid
import time
import random
import httpx

import crud, schemas, auth, database, models
from api.health import router as health_router
from api.auth import router as auth_router
from api.interaction import router as interaction_router
from api.chat import router as chat_router
from api.users import router as users_router

# --- Seeding Logic ---
async def seed_db(db: AsyncSession):
    # Check if test match exists
    result = await db.execute(select(models.Match).where(models.Match.id == "mock1"))
    if result.scalars().first():
        print("Test match already exists, skipping seed.")
        return 

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
                # Create User
                db_user = models.User(phone=None, telegram_id=None, username=u["name"].lower())
                db.add(db_user)
                await db.commit()
                await db.refresh(db_user)
                user_ids.append(db_user.id)
                
                # Create Profile
                profile = models.Profile(
                    user_id=db_user.id,
                    name=u["name"],
                    age=u["age"],
                    gender=u["gender"],
                    bio=u["bio"],
                    photos=[u["img"]],
                    interests=["Demo", "Vercel"],
                    is_complete=True
                )
                db.add(profile)
                await db.commit()
            except Exception as e:
                print(f"Skipping user {u['name']}: {e}")
                await db.rollback()

    # Create a test match 'mock1' for testing chat
    if len(user_ids) >= 2:
        try:
            test_match = models.Match(
                id="mock1",
                user1_id=user_ids[0],
                user2_id=user_ids[1],
                created_at=str(time.time())
            )
            db.add(test_match)
            await db.commit()
            print("Test match 'mock1' created successfully!")
        except Exception as e:
            print(f"Failed to create match: {e}")
            await db.rollback()
    
    print("Seeding logic complete.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    try:
        print("Starting up: Creating database tables...")
        async with database.engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
        print("Database tables created/verified.")
        
        # Seed DB
        async with database.async_session() as session:
             async with session.begin():
                 await seed_db(session)
                 
    except Exception as e:
        print(f"Startup error: {e}")
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title="MambaX API",
    description="Backend API for MambaX Dating Platform",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow ALL origins to fix Vercel dynamic URL issues
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.traycer import router as traycer_router

# Include routers
app.include_router(health_router, tags=["Health"])
app.include_router(auth_router)
app.include_router(interaction_router)
app.include_router(chat_router)
app.include_router(users_router)
app.include_router(traycer_router)

# Mount static files
# Mount static files
static_dir = Path(__file__).parent / "static"
if not static_dir.exists():
    static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

# Initialize database endpoint (for Vercel)
@app.get("/init")
async def init_database():
    """Manually initialize database - call this once after deployment"""
    try:
        # Create tables
        async with database.engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
        
        # Seed with demo data
        async with database.async_session() as session:
            async with session.begin():
                await seed_db(session)
        
        return {"status": "success", "message": "Database initialized"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Force fix match endpoint
@app.get("/fix-match")
async def fix_match_endpoint():
    try:
        async with database.async_session() as session:
            async with session.begin():
                # 1. Check if match exists
                match = await session.get(models.Match, "mock1")
                if match:
                    return {"status": "ok", "message": "Match mock1 already exists"}
                
                # 2. Get any 2 users
                result = await session.execute(select(models.User).limit(2))
                users = result.scalars().all()
                
                if len(users) < 2:
                    return {"status": "error", "message": "Not enough users to create match"}
                
                # 3. Create match
                print(f"Creating match mock1 between {users[0].id} and {users[1].id}")
                new_match = models.Match(
                    id="mock1",
                    user1_id=users[0].id,
                    user2_id=users[1].id,
                    created_at=str(time.time())
                )
                session.add(new_match)
                # Commit happens automatically with session.begin() context
                
        return {"status": "success", "message": "Match mock1 created!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Database migration endpoint - adds missing columns
@app.get("/migrate")
async def migrate_database():
    """Add missing columns to database tables"""
    try:
        async with database.engine.begin() as conn:
            # Add duration column to messages table if it doesn't exist
            await conn.execute(text(
                "ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration VARCHAR"
            ))
        return {"status": "success", "message": "Migration complete: duration column added"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Routes ---

# In-memory mock store for local development
MOCK_USER_STORE = {
    "00000000-0000-0000-0000-000000000000": {
        "id": "00000000-0000-0000-0000-000000000000",
        "user_id": "00000000-0000-0000-0000-000000000000",
        "name": "Local Demo User",
        "age": 25,
        "gender": "robot",
        "photos": [],
        "interests": ["Coding", "Debugging"],
        "bio": "I am a local simulation."
    }
}

@app.post("/auth/login", response_model=schemas.Token)
async def login(user_data: schemas.UserLogin, db: AsyncSession = Depends(database.get_db)):
    if not auth.verify_otp(user_data.identifier, user_data.otp):
         raise HTTPException(status_code=400, detail="Invalid OTP")
    
    user = await crud.get_user_by_identifier(db, user_data.identifier)
    
    if not user:
        if user_data.identifier.startswith("+") or user_data.identifier.isdigit() and len(user_data.identifier) > 7:
             user = await crud.create_user(db, schemas.UserCreate(phone=user_data.identifier))
        else:
             raise HTTPException(status_code=400, detail="User not found")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/request-otp")
async def request_otp(data: schemas.OTPRequest, db: AsyncSession = Depends(database.get_db)):
    user = await crud.get_user_by_identifier(db, data.identifier)
    
    otp = auth.generate_otp()
    auth.save_otp(data.identifier, otp)
    
    if user and user.telegram_id:
        success = await auth.send_otp_via_telegram(user.telegram_id, otp)
        if success:
            return {"message": "OTP sent via Telegram"}
        else:
             return {"message": "Failed to send to Telegram, check bot status."}
    else:
        print(f"DEMO OTP for {data.identifier}: {otp}")
        return {"message": "OTP generated (Demo mode)"}

@app.post("/auth/telegram", response_model=schemas.Token)
async def telegram_login(login_data: schemas.TelegramLogin, db: AsyncSession = Depends(database.get_db)):
    user_data = auth.validate_telegram_data(login_data.init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram Data")
    
    tg_id = str(user_data["id"])
    username = user_data.get("username")
    
    user = await crud.get_user_by_telegram_id(db, tg_id)
    if not user:
        user = await crud.create_user(db, schemas.UserCreate(phone=None, telegram_id=tg_id, username=username))
    elif username and user.username != username:
        user.username = username
        await db.commit()
    
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/profile", response_model=schemas.ProfileResponse)
async def create_profile(
    profile: schemas.ProfileCreate, 
    user_id: str, 
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.create_profile(db, profile, user_id)

@app.get("/profiles", response_model=list[schemas.ProfileResponse])
async def get_profiles(
    skip: int = 0, 
    limit: int = 20, 
    current_user: str = Depends(auth.get_current_user), 
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.get_profiles(db, skip, limit, exclude_user_id=current_user)

@app.get("/me", response_model=schemas.ProfileResponse)
async def get_my_profile(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    if current_user == "00000000-0000-0000-0000-000000000000":
        return schemas.ProfileResponse(**MOCK_USER_STORE[current_user])

    profile = await crud.get_user_profile(db, current_user)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.put("/profile", response_model=schemas.ProfileResponse)
async def update_profile(
    profile_update: schemas.ProfileUpdate,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    if current_user == "00000000-0000-0000-0000-000000000000":
        data = MOCK_USER_STORE[current_user]
        if profile_update.name: data["name"] = profile_update.name
        if profile_update.bio: data["bio"] = profile_update.bio
        if profile_update.gender: data["gender"] = profile_update.gender
        if profile_update.interests: data["interests"] = profile_update.interests
        if profile_update.photos: data["photos"] = profile_update.photos
        if profile_update.age: data["age"] = profile_update.age
        
        return schemas.ProfileResponse(**data)

    updated_profile = await crud.update_profile(db, current_user, profile_update)
    if not updated_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return updated_profile

@app.post("/location")
async def update_location(
    loc: dict, 
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    profile = await crud.get_user_profile(db, current_user)
    if profile:
        profile.latitude = loc.get("lat")
        profile.longitude = loc.get("lon")
        await db.commit()
    return {"status": "ok"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Vercel Blob Storage API endpoint
        blob_token = os.getenv("BLOB_READ_WRITE_TOKEN")
        
        if not blob_token:
            # Если токен не настроен, возвращаем mock
            print("BLOB_READ_WRITE_TOKEN not configured. Using mock avatar.")
            mock_id = str(uuid.uuid4())[:8]
            return {"url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={mock_id}"}
        
        # Читаем файл
        contents = await file.read()
        filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
        
        # Загружаем в Vercel Blob через REST API
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"https://blob.vercel-storage.com/{filename}",
                headers={
                    "Authorization": f"Bearer {blob_token}",
                    "x-content-type": file.content_type or "application/octet-stream",
                },
                content=contents,
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Blob upload failed: {response.status_code}")
            
            result = response.json()
            return {"url": result["url"]}
        
    except Exception as e:
        print(f"Upload failed: {e}. Returning mock avatar.")
        mock_id = str(uuid.uuid4())[:8]
        return {"url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={mock_id}"}

@app.post("/likes")
async def like_user(
    like_data: schemas.LikeCreate,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    result = await crud.create_like(db, like_data, current_user)
    return result

@app.get("/matches", response_model=list[schemas.MatchResponse])
async def get_matches(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.get_matches(db, current_user)

@app.get("/matches/{match_id}/messages", response_model=list[schemas.MessageResponse])
async def get_messages(
    match_id: str,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.get_messages(db, match_id)

@app.post("/matches/{match_id}/messages", response_model=schemas.MessageResponse)
async def send_message(
    match_id: str,
    msg: schemas.MessageCreate,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # AUTO-FIX: If sending to 'mock1' and it doesn't exist, create it on the fly
    if match_id == "mock1":
        match = await db.get(models.Match, "mock1")
        if not match:
            print("Match 'mock1' missing. Auto-creating...")
            
            # 1. Ensure we have users
            result = await db.execute(select(models.User).limit(2))
            users = list(result.scalars().all()) # Convert to list to append
            print(f"Found {len(users)} users.")
            
            if len(users) < 2:
                print("Not enough users. Creating temporary users...")
                needed = 2 - len(users)
                for i in range(needed):
                    try:
                        temp_user = models.User(
                            username=f"auto_user_{int(time.time())}_{i}",
                            phone=None,
                            telegram_id=None
                        )
                        db.add(temp_user)
                        await db.commit()
                        await db.refresh(temp_user)
                        users.append(temp_user)
                    except Exception as e:
                        print(f"Error creating temp user: {e}")
                        await db.rollback()
            
            # 2. Create Match
            if len(users) >= 2:
                try:
                    new_match = models.Match(
                        id="mock1",
                        user1_id=users[0].id,
                        user2_id=users[1].id,
                        created_at=str(time.time())
                    )
                    db.add(new_match)
                    await db.commit()
                    print("Auto-created match 'mock1' successfully")
                except Exception as e:
                    print(f"Failed to auto-create match (maybe verification race): {e}")
                    await db.rollback()
            else:
                 print("CRITICAL: Could not ensure 2 users exist.")
    
    # FIX: Ensure the Guest User (0000...) exists in the DB so we can use it
    if current_user == "00000000-0000-0000-0000-000000000000":
        guest_user = await db.get(models.User, current_user)
        if not guest_user:
            print("Guest user missing. Creating '00000000-0000-0000-0000-000000000000'...")
            try:
                new_guest = models.User(
                    id="00000000-0000-0000-0000-000000000000",
                    username="guest_user",
                    phone=None,
                    telegram_id=None,
                    is_active=True
                )
                db.add(new_guest)
                await db.commit()
                print("Guest user created successfully via send_message trigger.")
            except Exception as e:
                print(f"Failed to create guest user: {e}")
                await db.rollback()
        
        # Don't swap ID, use the valid zero-ID now
        pass

    return await crud.create_message(db, match_id, current_user, msg)

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: str = Depends(auth.get_current_user)
):
    """Upload file to Vercel Blob Storage"""
    
    # Read file content
    content = await file.read()
    filename = f"{uuid.uuid4()}-{file.filename}"
    
    # Get Vercel Blob token from environment
    blob_token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    
    if not blob_token:
        raise HTTPException(status_code=500, detail="Blob storage not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"https://blob.vercel-storage.com/{filename}",
                content=content,
                headers={
                    "Authorization": f"Bearer {blob_token}",
                    "x-api-version": "7",
                    "Content-Type": file.content_type or "application/octet-stream"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Blob upload failed: {response.text}"
                )
            
            result = response.json()
            return {"url": result.get("url")}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Режим HTTPS (используем сгенерированные вручную сертификаты)
    cert = "cert.pem"
    key = "key.pem"
    
    if os.path.exists(cert) and os.path.exists(key):
        print("Starting in HTTPS mode...")
        uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True, 
                    ssl_keyfile=key, ssl_certfile=cert)
    else:
        print("Certificates not found. Starting in HTTP mode...")
        uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
