# Auth API - Эндпоинты регистрации и авторизации с PostgreSQL

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import verify_password, create_access_token, TokenResponse
from crud.user import create_user, get_user_by_email
from db.session import get_db
from schemas.user import UserCreate, UserResponse, Location


router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- Request/Response Schemas ---
class LoginRequest(BaseModel):
    """Схема запроса на вход"""
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    """Ответ при регистрации"""
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


# --- Endpoints ---
@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Регистрация нового пользователя.
    
    - Проверяет, что email не занят
    - Хэширует пароль
    - Сохраняет в PostgreSQL
    - Создаёт JWT токен
    """
    # Check if email already exists
    if user_data.email:
        existing_user = await get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create user in database
    db_user = await create_user(db, user_data)
    
    # Create token
    access_token = create_access_token(db_user.id)
    
    # Build location for response
    location = None
    if db_user.latitude and db_user.longitude:
        location = Location(lat=db_user.latitude, lon=db_user.longitude)
    
    # Build response
    user_response = UserResponse(
        id=db_user.id,
        email=db_user.email,
        name=db_user.name,
        age=db_user.age,
        gender=db_user.gender,
        bio=db_user.bio,
        photos=db_user.photos,
        interests=db_user.interests,
        location=location,
        is_vip=db_user.is_vip,
        created_at=db_user.created_at,
        is_active=db_user.is_active,
    )
    
    return RegisterResponse(
        user=user_response,
        access_token=access_token,
        token_type="bearer"
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Вход в систему.
    
    - Проверяет email и пароль в PostgreSQL
    - Возвращает JWT токен
    """
    # Get user from database
    user = await get_user_by_email(db, credentials.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is disabled"
        )
    
    # Create and return token
    access_token = create_access_token(user.id)
    
    return TokenResponse(access_token=access_token)
