# Security utilities - Хэширование и верификация паролей

from passlib.context import CryptContext

# Password hashing context with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Хэширует пароль с использованием bcrypt.
    
    Args:
        password: Пароль в открытом виде
        
    Returns:
        str: Хэшированный пароль
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверяет соответствие пароля хэшу.
    
    Args:
        plain_password: Пароль в открытом виде
        hashed_password: Хэшированный пароль из БД
        
    Returns:
        bool: True если пароль верный
    """
    return pwd_context.verify(plain_password, hashed_password)
