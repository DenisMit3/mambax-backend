"""
Search Filters - Schemas & Constants
=====================================
Pydantic модели и опции фильтров для UI.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class SearchFilters(BaseModel):
    """Фильтры поиска профилей"""
    
    # Базовые фильтры (бесплатно)
    age_min: Optional[int] = Field(18, ge=18, le=100, description="Минимальный возраст")
    age_max: Optional[int] = Field(100, ge=18, le=100, description="Максимальный возраст")
    gender: Optional[str] = Field(None, description="Пол: male, female, other")
    distance_km: Optional[int] = Field(50, ge=1, le=500, description="Радиус поиска в км")
    
    # Расширенные фильтры (Premium)
    height_min: Optional[int] = Field(None, ge=100, le=250, description="Минимальный рост (см)")
    height_max: Optional[int] = Field(None, ge=100, le=250, description="Максимальный рост (см)")
    interests: Optional[List[str]] = Field(None, description="Интересы для совпадения")
    smoking: Optional[List[str]] = Field(None, description="Курение: never, sometimes, regularly")
    drinking: Optional[List[str]] = Field(None, description="Алкоголь: never, socially, regularly")
    education: Optional[List[str]] = Field(None, description="Образование: high_school, bachelor, master, phd")
    looking_for: Optional[List[str]] = Field(None, description="Цель: relationship, friendship, casual, not_sure")
    children: Optional[List[str]] = Field(None, description="Дети: have, want, dont_want, maybe")
    verified_only: Optional[bool] = Field(False, description="Только верифицированные профили")
    with_photos_only: Optional[bool] = Field(True, description="Только с фото")
    online_recently: Optional[bool] = Field(False, description="Был онлайн недавно (24ч)")


class FilterOption(BaseModel):
    """Опция фильтра для UI"""
    value: str
    label: str
    emoji: Optional[str] = None


# ============================================================================
# FILTER OPTIONS (для отображения в UI)
# ============================================================================

GENDER_OPTIONS = [
    FilterOption(value="male", label="Мужчина", emoji="👨"),
    FilterOption(value="female", label="Женщина", emoji="👩"),
    FilterOption(value="other", label="Другое", emoji="🧑"),
]

SMOKING_OPTIONS = [
    FilterOption(value="never", label="Не курю", emoji="🚭"),
    FilterOption(value="sometimes", label="Иногда", emoji="🚬"),
    FilterOption(value="regularly", label="Регулярно", emoji="🚬"),
]

DRINKING_OPTIONS = [
    FilterOption(value="never", label="Не пью", emoji="🚫"),
    FilterOption(value="socially", label="По праздникам", emoji="🍷"),
    FilterOption(value="regularly", label="Регулярно", emoji="🍺"),
]

EDUCATION_OPTIONS = [
    FilterOption(value="high_school", label="Среднее", emoji="🏫"),
    FilterOption(value="bachelor", label="Бакалавр", emoji="🎓"),
    FilterOption(value="master", label="Магистр", emoji="📚"),
    FilterOption(value="phd", label="Аспирантура/PhD", emoji="🎯"),
]

LOOKING_FOR_OPTIONS = [
    FilterOption(value="relationship", label="Серьёзные отношения", emoji="💑"),
    FilterOption(value="friendship", label="Дружба", emoji="🤝"),
    FilterOption(value="casual", label="Свидания", emoji="☕"),
    FilterOption(value="not_sure", label="Не определился", emoji="🤷"),
]

CHILDREN_OPTIONS = [
    FilterOption(value="have", label="Есть дети", emoji="👶"),
    FilterOption(value="want", label="Хочу детей", emoji="🍼"),
    FilterOption(value="dont_want", label="Не хочу детей", emoji="🚫"),
    FilterOption(value="maybe", label="Может быть", emoji="🤔"),
]

INTEREST_SUGGESTIONS = [
    "Путешествия", "Спорт", "Музыка", "Кино", "Книги", "Фотография",
    "Кулинария", "Йога", "Танцы", "Искусство", "Технологии", "Природа",
    "Животные", "Игры", "Фитнес", "Походы", "Велосипед", "Бег",
    "Плавание", "Горы", "Море", "Кофе", "Вино", "Рестораны"
]
