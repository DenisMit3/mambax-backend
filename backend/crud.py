from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend import models, schemas
from backend.security import hash_password

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
    # Added defaults for non-nullable fields (name, age, gender, hashed_password)
    # per verification comment to prevent DB constraints violation
    db_user = models.User(
        phone=user.phone, 
        telegram_id=user.telegram_id, 
        username=user.username,
        name="Anonymous",
        age=25,
        gender="other",
        hashed_password=hash_password("dummy")
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def create_profile(db: AsyncSession, profile: schemas.ProfileCreate, user_id: str):
    # User IS the profile now
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return None
        
    # Update user fields
    update_data = profile.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    
    user.is_complete = True
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_profiles(db: AsyncSession, skip: int = 0, limit: int = 20, exclude_user_id: str = None):
    query = select(models.User)
    if exclude_user_id:
        # Exclude own profile
        query = query.where(models.User.id != exclude_user_id)
        # TODO: Exclude already liked profiles
        
    query = query.where(models.User.is_complete == True)
        
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
        created_at=datetime.utcnow()
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
            created_at=datetime.utcnow()
        )
        db.add(match)
        await db.commit()
        return {"status": "matched", "match_id": match.id}

    return {"status": "liked"}


async def get_received_likes(db: AsyncSession, user_id: str, is_vip: bool = False):
    """
    Получить список пользователей, которые лайкнули текущего пользователя.
    
    Для VIP: полные профили
    Для бесплатных: количество + размытые превью
    """
    # Найти все лайки, где текущий пользователь - получатель
    # Исключить тех, с кем уже есть матч (взаимный лайк)
    q = select(models.Like).where(models.Like.liked_id == user_id)
    result = await db.execute(q)
    likes = result.scalars().all()
    
    # Получить ID тех, кого текущий пользователь уже лайкнул (они станут матчами)
    q_my_likes = select(models.Like.liked_id).where(models.Like.liker_id == user_id)
    res_my_likes = await db.execute(q_my_likes)
    my_liked_ids = set(str(lid) for lid in res_my_likes.scalars().all())
    
    # Фильтруем только тех, кого мы ещё НЕ лайкнули (иначе это уже матч)
    pending_likes = [like for like in likes if str(like.liker_id) not in my_liked_ids]
    
    total_count = len(pending_likes)
    
    if not is_vip:
        # Для бесплатных пользователей - только количество и размытые превью
        return {
            "total": total_count,
            "is_vip": False,
            "message": "Оформи Premium, чтобы увидеть кто тебя лайкнул!",
            "preview": [
                {
                    "id": "hidden",
                    "name": "???",
                    "age": None,
                    "photo": None,  # Можно добавить размытое фото
                    "is_blurred": True
                }
                for _ in range(min(3, total_count))  # Показываем до 3 превью
            ]
        }
    
    # Для VIP - полные профили
    profiles = []
    for like in pending_likes:
        profile = await get_user_profile(db, str(like.liker_id), use_cache=True)
        if profile:
            profiles.append({
                "id": str(profile.id),
                "name": profile.name,
                "age": profile.age,
                "bio": profile.bio,
                "photos": profile.photos or [],
                "is_super": like.is_super,
                "liked_at": like.created_at,
                "is_verified": getattr(profile, 'is_verified', False)
            })
    
    return {
        "total": total_count,
        "is_vip": True,
        "profiles": profiles
    }


async def get_likes_count(db: AsyncSession, user_id: str) -> int:
    """Получить количество непросмотренных лайков"""
    # Лайки, где я получатель и ещё не лайкнул в ответ
    q = select(models.Like).where(models.Like.liked_id == user_id)
    result = await db.execute(q)
    likes = result.scalars().all()
    
    # Мои лайки
    q_my = select(models.Like.liked_id).where(models.Like.liker_id == user_id)
    res_my = await db.execute(q_my)
    my_liked = set(str(lid) for lid in res_my.scalars().all())
    
    # Считаем только тех, кого я ещё не лайкнул
    return len([l for l in likes if str(l.liker_id) not in my_liked])

async def get_matches(db: AsyncSession, user_id: str):
    # Find matches where user is user1 or user2
    q = select(models.Match).where((models.Match.user1_id == user_id) | (models.Match.user2_id == user_id))
    result = await db.execute(q)
    matches = result.scalars().all()
    
    response = []
    for m in matches:
        # Determine who is the "other" user
        other_id = m.user2_id if m.user1_id == user_id else m.user1_id
        
        # Get their profile (Cached)
        profile = await get_user_profile(db, other_id, use_cache=True)
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
        receiver_id=msg_data.receiver_id,
        text=msg_data.content,
        type="text", # Default as schema doesn't have type
        audio_url=None,
        duration=None,
        created_at=datetime.utcnow()
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg

async def get_messages(db: AsyncSession, match_id: str):
    q = select(models.Message).where(models.Message.match_id == match_id).order_by(models.Message.created_at)
    result = await db.execute(q)
    return result.scalars().all()

async def get_user_profile(db: AsyncSession, user_id: str, use_cache: bool = False):
    """
    Get user profile.
    If use_cache=True, attempts to fetch from Redis first.
    """
    if use_cache:
        try:
            from backend.services.cache import cache_service
            cached = await cache_service.get_user_profile(user_id)
            if cached:
                # Rehydrate model from dict
                # Note: Datetimes will be strings here, Pydantic response models usually handle this validation
                return models.User(**cached)
        except Exception as e:
            print(f"Cache Rehydration Error: {e}")

    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()
    
    if user and use_cache:
        try:
            from backend.services.cache import cache_service
            data = {c.name: getattr(user, c.name) for c in user.__table__.columns}
            await cache_service.set_user_profile(user_id, data)
        except Exception as e:
            print(f"Cache Set Error: {e}")

    return user

async def update_profile(db: AsyncSession, user_id: str, profile_update: schemas.ProfileUpdate):
    # Ensure we get a fresh DB copy for update
    db_profile = await get_user_profile(db, user_id, use_cache=False)
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

    # Invalidate Cache
    try:
        from backend.services.cache import cache_service
        await cache_service.invalidate_user_profile(user_id)
    except Exception:
        pass

    return db_profile

