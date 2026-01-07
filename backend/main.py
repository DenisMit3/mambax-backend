from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MambaX API",
    description="Backend API for MambaX Dating Platform",
    version="0.1.0"
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
from fastapi.staticfiles import StaticFiles
from fastapi import File, UploadFile
import shutil
from pathlib import Path
import os
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"message": "Welcome to MambaX API", "status": "running"}

# --- Routes ---
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException
import crud, schemas, auth, database

@app.post("/auth/login", response_model=schemas.Token)
async def login(user_data: schemas.UserLogin, db: AsyncSession = Depends(database.get_db)):
    # 1. Verify OTP
    if not auth.verify_otp(user_data.identifier, user_data.otp):
         raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # 2. Get or Create User
    user = await crud.get_user_by_identifier(db, user_data.identifier)
    
    # For login, user must exist OR we auto-create if it looks like a phone? 
    # Logic pivot: if entering TG ID, user MUST exist. If Phone, maybe new?
    # For now, simplistic: if verify_otp passed, we trust CRUD found or we deal with it.
    
    if not user:
        # If passed OTP verification but user not found (rare edge case if using in-memory OTP)
        # We try to create if it looks like a phone. 
        # But crud.get_user_by_identifier handles lookup.
        # Let's assume if they verified OTP, we must have known them or created a temp record?
        # Simpler: Auto-create if phone. Fail if TG ID and not found?
        if user_data.identifier.startswith("+") or user_data.identifier.isdigit() and len(user_data.identifier) > 7:
             user = await crud.create_user(db, schemas.UserCreate(phone=user_data.identifier))
        else:
             raise HTTPException(status_code=400, detail="User not found")

    
    # 3. Generate Token
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/request-otp")
async def request_otp(data: schemas.OTPRequest, db: AsyncSession = Depends(database.get_db)):
    # 1. Check if user exists to get Telegram ID
    # data.identifier can be Phone or Telegram ID
    
    user = await crud.get_user_by_identifier(db, data.identifier)
    
    # If user not found by identifier, and identifier looks like a phone number, we can proceed (OTP via SMS mock)
    # If identifier is TG ID and user not found -> cannot send message.
    
    otp = auth.generate_otp()
    auth.save_otp(data.identifier, otp)
    
    if user and user.telegram_id:
        # Send via Telegram
        success = await auth.send_otp_via_telegram(user.telegram_id, otp)
        if success:
            return {"message": "OTP sent via Telegram"}
        else:
             return {"message": "Failed to send to Telegram, check bot status."}
    else:
        # User not found OR no TG ID linked.
        print(f"DEMO OTP for {data.identifier}: {otp}")
        return {"message": "OTP generated (Demo mode)"}

@app.post("/auth/telegram", response_model=schemas.Token)
async def telegram_login(login_data: schemas.TelegramLogin, db: AsyncSession = Depends(database.get_db)):
    # 1. Validate Data
    user_data = auth.validate_telegram_data(login_data.init_data)
    if not user_data:
        raise HTTPException(status_code=400, detail="Invalid Telegram Data")
    
    tg_id = str(user_data["id"])
    username = user_data.get("username")
    
    # 2. Get or Create User
    user = await crud.get_user_by_telegram_id(db, tg_id)
    if not user:
        # Create new user
        user = await crud.create_user(db, schemas.UserCreate(phone=None, telegram_id=tg_id, username=username))
    elif username and user.username != username:
        # Update username if changed (implementation detail: requires update method in crud, or direct here)
        user.username = username
        await db.commit()
    
    # 3. Generate Token
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/profile", response_model=schemas.ProfileResponse)
async def create_profile(
    profile: schemas.ProfileCreate, 
    user_id: str, # In real app, extract from JWT
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.create_profile(db, profile, user_id)

@app.get("/profiles", response_model=list[schemas.ProfileResponse])
async def get_profiles(
    skip: int = 0, 
    limit: int = 20, 
    current_user: str = Depends(auth.get_current_user), # We need to know who is asking to exclude them
    db: AsyncSession = Depends(database.get_db)
):
    return await crud.get_profiles(db, skip, limit, exclude_user_id=current_user)

@app.get("/me", response_model=schemas.ProfileResponse)
async def get_my_profile(
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    profile = await crud.get_user_profile(db, current_user)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.post("/location")
async def update_location(
    loc: dict, # {lat: flutter, lon: float}
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    profile = await crud.get_user_profile(db, current_user)
    if profile:
        profile.latitude = loc.get("lat")
        profile.longitude = loc.get("lon")
        await db.commit()
    return {"status": "ok"}

@app.put("/profile", response_model=schemas.ProfileResponse)
async def update_profile(
    profile_update: schemas.ProfileUpdate,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    updated = await crud.update_profile(db, current_user, profile_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Profile not found")
    return updated

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: str = Depends(auth.get_current_user)
):
    # Create static/uploads directory if not exists
    upload_dir = Path("static/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Secure filename
    import time
    file_extension = Path(file.filename).suffix
    file_name = f"{int(time.time())}_{current_user}{file_extension}"
    file_path = upload_dir / file_name
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/static/uploads/{file_name}"}

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
    # TODO: Verify user is part of match
    return await crud.get_messages(db, match_id)

@app.post("/matches/{match_id}/messages", response_model=schemas.MessageResponse)
async def send_message(
    match_id: str,
    msg: schemas.MessageCreate,
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
):
    # TODO: Verify user is part of match
    return await crud.create_message(db, match_id, current_user, msg.text)

from fastapi import File, UploadFile
import shutil
import uuid

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Simple local upload
    file_ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = f"static/uploads/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return URL (assuming localhost for now, in prod use env var)
    # user will preprend API_URL or we return full path
    return {"url": f"http://localhost:8000/{file_path}"}

@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.create_all)
