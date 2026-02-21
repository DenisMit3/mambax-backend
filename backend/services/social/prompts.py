# Profile Prompts Service - вопросы профиля в стиле Hinge

import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from backend.models.profile_enrichment import UserPrompt

logger = logging.getLogger(__name__)

# Статические вопросы для профиля
AVAILABLE_PROMPTS = [
    {"id": "about_me", "text": "Обо мне в двух словах...", "category": "basic"},
    {"id": "looking_for", "text": "Я ищу...", "category": "basic"},
    {"id": "fun_fact", "text": "Забавный факт обо мне...", "category": "personality"},
    {"id": "ideal_date", "text": "Идеальное свидание - это...", "category": "dating"},
    {"id": "unpopular_opinion", "text": "Моё непопулярное мнение...", "category": "personality"},
    {"id": "superpower", "text": "Моя суперспособность - это...", "category": "personality"},
    {"id": "two_truths_lie", "text": "Две правды и одна ложь...", "category": "fun"},
    {"id": "pet_peeve", "text": "Что меня бесит...", "category": "personality"},
    {"id": "best_travel", "text": "Лучшее путешествие в моей жизни...", "category": "lifestyle"},
    {"id": "weekend_plans", "text": "Идеальные выходные - это...", "category": "lifestyle"},
    {"id": "guilty_pleasure", "text": "Моё guilty pleasure...", "category": "fun"},
    {"id": "life_goal", "text": "Моя главная цель в жизни...", "category": "values"},
    {"id": "love_language", "text": "Мой язык любви - это...", "category": "dating"},
    {"id": "deal_breaker", "text": "Для меня неприемлемо...", "category": "dating"},
    {"id": "first_impression", "text": "Люди обычно думают обо мне...", "category": "personality"},
]

MAX_PROMPTS_PER_USER = 6  # Максимум ответов на профиле


def get_available_prompts() -> List[Dict[str, Any]]:
    """Получить список всех доступных вопросов."""
    return AVAILABLE_PROMPTS


def get_prompt_by_id(prompt_id: str) -> Optional[Dict[str, Any]]:
    """Найти вопрос по ID."""
    for prompt in AVAILABLE_PROMPTS:
        if prompt["id"] == prompt_id:
            return prompt
    return None


async def get_user_prompts(
    db: AsyncSession,
    user_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Получить все ответы пользователя на вопросы.
    
    Returns:
        List of {
            "id": str (record id),
            "prompt_id": str,
            "question": str,
            "answer": str,
            "type": str,
            "media_url": str|None,
            "sort_order": int,
            "created_at": str
        }
    """
    stmt = (
        select(UserPrompt)
        .where(UserPrompt.user_id == user_id)
        .order_by(UserPrompt.sort_order)
    )
    result = await db.execute(stmt)
    prompts = result.scalars().all()
    
    return [
        {
            "id": str(p.id),
            "prompt_id": _extract_prompt_id(p.question),
            "question": p.question,
            "answer": p.answer,
            "type": p.type,
            "media_url": p.media_url,
            "sort_order": p.sort_order,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in prompts
    ]


def _extract_prompt_id(question: str) -> str:
    """Извлечь prompt_id из текста вопроса."""
    for prompt in AVAILABLE_PROMPTS:
        if prompt["text"] == question:
            return prompt["id"]
    return "custom"


async def save_prompt_answer(
    db: AsyncSession,
    user_id: uuid.UUID,
    prompt_id: str,
    answer: str,
    answer_type: str = "text",
    media_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Сохранить или обновить ответ на вопрос.
    
    Args:
        prompt_id: ID вопроса из AVAILABLE_PROMPTS
        answer: Текст ответа
        answer_type: "text", "audio", "image"
        media_url: URL медиа для audio/image типов
    
    Returns:
        {"success": bool, "prompt": dict, "message": str}
    """
    # Валидация prompt_id
    prompt_data = get_prompt_by_id(prompt_id)
    if not prompt_data:
        return {"success": False, "message": "Неизвестный вопрос"}
    
    # Валидация ответа
    answer = answer.strip()
    if len(answer) < 3:
        return {"success": False, "message": "Ответ слишком короткий (минимум 3 символа)"}
    if len(answer) > 500:
        return {"success": False, "message": "Ответ слишком длинный (максимум 500 символов)"}
    
    question_text = prompt_data["text"]
    
    # Проверяем, есть ли уже ответ на этот вопрос
    existing_stmt = select(UserPrompt).where(
        UserPrompt.user_id == user_id,
        UserPrompt.question == question_text
    )
    result = await db.execute(existing_stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        # Обновляем существующий ответ
        existing.answer = answer
        existing.type = answer_type
        existing.media_url = media_url
        prompt_record = existing
        action = "updated"
    else:
        # Проверяем лимит
        count_stmt = select(UserPrompt).where(UserPrompt.user_id == user_id)
        result = await db.execute(count_stmt)
        current_count = len(result.scalars().all())
        
        if current_count >= MAX_PROMPTS_PER_USER:
            return {
                "success": False,
                "message": f"Достигнут лимит ({MAX_PROMPTS_PER_USER} ответов). Удали один из существующих."
            }
        
        # Создаём новый ответ
        prompt_record = UserPrompt(
            user_id=user_id,
            question=question_text,
            answer=answer,
            type=answer_type,
            media_url=media_url,
            sort_order=current_count
        )
        db.add(prompt_record)
        action = "created"
    
    await db.commit()
    await db.refresh(prompt_record)
    
    logger.info(f"User {user_id} {action} prompt answer: {prompt_id}")
    
    return {
        "success": True,
        "prompt": {
            "id": str(prompt_record.id),
            "prompt_id": prompt_id,
            "question": prompt_record.question,
            "answer": prompt_record.answer,
            "type": prompt_record.type,
            "media_url": prompt_record.media_url
        },
        "message": "Ответ сохранён" if action == "created" else "Ответ обновлён"
    }


async def delete_prompt_answer(
    db: AsyncSession,
    user_id: uuid.UUID,
    prompt_record_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Удалить ответ на вопрос.
    
    Args:
        prompt_record_id: ID записи UserPrompt
    
    Returns:
        {"success": bool, "message": str}
    """
    # Находим запись
    prompt = await db.get(UserPrompt, prompt_record_id)
    
    if not prompt:
        return {"success": False, "message": "Ответ не найден"}
    
    if prompt.user_id != user_id:
        return {"success": False, "message": "Нет доступа"}
    
    await db.delete(prompt)
    await db.commit()
    
    # Пересчитываем sort_order для оставшихся
    remaining_stmt = (
        select(UserPrompt)
        .where(UserPrompt.user_id == user_id)
        .order_by(UserPrompt.sort_order)
    )
    result = await db.execute(remaining_stmt)
    remaining = result.scalars().all()
    
    for i, p in enumerate(remaining):
        p.sort_order = i
    
    await db.commit()
    
    logger.info(f"User {user_id} deleted prompt answer {prompt_record_id}")
    
    return {"success": True, "message": "Ответ удалён"}


async def reorder_prompts(
    db: AsyncSession,
    user_id: uuid.UUID,
    prompt_ids: List[str]
) -> Dict[str, Any]:
    """
    Изменить порядок отображения ответов.
    
    Args:
        prompt_ids: Список ID записей в новом порядке
    
    Returns:
        {"success": bool, "message": str}
    """
    for i, pid in enumerate(prompt_ids):
        try:
            prompt_uuid = uuid.UUID(pid)
        except ValueError:
            continue
        
        prompt = await db.get(UserPrompt, prompt_uuid)
        if prompt and prompt.user_id == user_id:
            prompt.sort_order = i
    
    await db.commit()
    
    return {"success": True, "message": "Порядок обновлён"}


async def get_prompts_for_profile(
    db: AsyncSession,
    user_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Получить ответы пользователя для отображения на профиле.
    Формат оптимизирован для фронтенда.
    """
    prompts = await get_user_prompts(db, user_id)
    
    return [
        {
            "question": p["question"],
            "answer": p["answer"],
            "type": p["type"],
            "media_url": p["media_url"]
        }
        for p in prompts
    ]
