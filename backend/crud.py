from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import models, schemas

async def get_user_by_phone(db: AsyncSession, phone: str):
    result = await db.execute(select(models.User).where(models.User.phone == phone))
    return result.scalars().first()

async def get_user_by_identifier(db: AsyncSession, identifier: str):
    # Check if identifier looks like a phone number or telegram ID
    # For simplicity, we search both columns OR we could use Regex
    # Note: Telegram ID is usually numeric, Phone is also numeric (with +)
    
    # Try finding by telegram_id first
    result = await db.execute(select(models.User).where(models.User.telegram_id == identifier))
    user = result.scalars().first()
    if user: return user
    
    # Try finding by username (case insensitive? for now exact)
    # Remove @ if present
    clean_identifier = identifier.lstrip("@")
    result = await db.execute(select(models.User).where(models.User.username == clean_identifier))
    user = result.scalars().first()
    if user: return user

    # Try finding by phone
    result = await db.execute(select(models.User).where(models.User.phone == identifier))
    return result.scalars().first()

async def get_user_by_telegram_id(db: AsyncSession, telegram_id: str):
    result = await db.execute(select(models.User).where(models.User.telegram_id == str(telegram_id)))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    db_user = models.User(phone=user.phone, telegram_id=user.telegram_id, username=user.username)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def create_profile(db: AsyncSession, profile: schemas.ProfileCreate, user_id: str):
    # Check if profile exists
    result = await db.execute(select(models.Profile).where(models.Profile.user_id == user_id))
    existing = result.scalars().first()
    
    if existing:
        return existing
        
    db_profile = models.Profile(**profile.dict(), user_id=user_id)
    db.add(db_profile)
    await db.commit()
    await db.refresh(db_profile)
    return db_profile

async def get_profiles(db: AsyncSession, skip: int = 0, limit: int = 20, exclude_user_id: str = None):
    query = select(models.Profile)
    if exclude_user_id:
        # Exclude own profile
        query = query.where(models.Profile.user_id != exclude_user_id)
        # TODO: Exclude already liked profiles
        
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create_like(db: AsyncSession, like: schemas.LikeCreate, liker_id: str):
    # Check if already liked
    q = select(models.Like).where(
        models.Like.liker_id == liker_id,
        models.Like.liked_id == like.liked_user_id
    )
    result = await db.execute(q)
    if result.scalars().first():
        return None # Already liked
        
    db_like = models.Like(
        liker_id=liker_id, 
        liked_id=like.liked_user_id,
        is_super=like.is_super,
        created_at=str(datetime.utcnow())
    )
    db.add(db_like)
    await db.commit()
    
    # CHECK FOR MATCH
    # Check if liked_user already liked liker
    q_reverse = select(models.Like).where(
        models.Like.liker_id == like.liked_user_id,
        models.Like.liked_id == liker_id
    )
    res_reverse = await db.execute(q_reverse)
    if res_reverse.scalars().first():
        # IT'S A MATCH!
        match = models.Match(
            user1_id=liker_id,
            user2_id=like.liked_user_id,
            created_at=str(datetime.utcnow())
        )
        db.add(match)
        await db.commit()
        return {"status": "matched", "match_id": match.id}

    return {"status": "liked"}

async def get_matches(db: AsyncSession, user_id: str):
    # Find matches where user is user1 or user2
    q = select(models.Match).where((models.Match.user1_id == user_id) | (models.Match.user2_id == user_id))
    result = await db.execute(q)
    matches = result.scalars().all()
    
    response = []
    for m in matches:
        # Determine who is the "other" user
        other_id = m.user2_id if m.user1_id == user_id else m.user1_id
        
        # Get their profile
        profile = await get_user_profile(db, other_id)
        if profile:
            # Simple conversion to schema-friendly dict
            # In real app, optimize queries
            response.append({
                "id": m.id,
                "user": profile
            })
    return response

async def create_message(db: AsyncSession, match_id: str, sender_id: str, msg_data: schemas.MessageCreate):
    msg = models.Message(
        match_id=match_id,
        sender_id=sender_id,
        text=msg_data.text,
        type=msg_data.type,
        audio_url=msg_data.audio_url,
        duration=msg_data.duration,
        created_at=str(datetime.utcnow())
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg

async def get_messages(db: AsyncSession, match_id: str):
    q = select(models.Message).where(models.Message.match_id == match_id).order_by(models.Message.created_at)
    result = await db.execute(q)
    return result.scalars().all()

async def get_user_profile(db: AsyncSession, user_id: str):
    result = await db.execute(select(models.Profile).where(models.Profile.user_id == user_id))
    return result.scalars().first()

async def update_profile(db: AsyncSession, user_id: str, profile_update: schemas.ProfileUpdate):
    db_profile = await get_user_profile(db, user_id)
    if not db_profile:
        return None
    
    update_data = profile_update.dict(exclude_unset=True)
    if not update_data:
        return db_profile

    for key, value in update_data.items():
        setattr(db_profile, key, value)
    
    db.add(db_profile)
    await db.commit()
    await db.refresh(db_profile)
    return db_profile

from datetime import datetime

