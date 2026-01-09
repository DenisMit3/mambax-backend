# Database Base - Декларативный базовый класс для SQLAlchemy ORM

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Базовый класс для всех SQLAlchemy ORM моделей.
    
    Все модели должны наследоваться от этого класса.
    """
    pass
