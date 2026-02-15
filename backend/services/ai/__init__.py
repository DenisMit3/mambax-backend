"""
AI Service Package
==================
Реэкспорт всех публичных символов для обратной совместимости.
"""

from backend.services.ai.providers import AIService
from backend.services.ai.recommendations import (
    calculate_compatibility,
    generate_daily_picks,
    generate_icebreakers,
    generate_conversation_prompts,
    get_question_of_the_day,
    suggest_smart_filters,
)

# Singleton — сохраняем обратную совместимость
ai_service = AIService()

# Привязываем методы-обёртки к экземпляру для обратной совместимости
# (вызывающий код использует ai_service.generate_daily_picks(...))
import types

async def _generate_daily_picks(self, user_id, db, limit=5):
    return await generate_daily_picks(self, user_id, db, limit)

async def _generate_icebreakers(self, user1_id, user2_id, db, count=3):
    return await generate_icebreakers(self, user1_id, user2_id, db, count)

async def _generate_conversation_prompts(self, match_id, db, count=3):
    return await generate_conversation_prompts(self, match_id, db, count)

async def _get_question_of_the_day(self):
    return await get_question_of_the_day(self)

async def _suggest_smart_filters(self, user_id, db):
    return await suggest_smart_filters(self, user_id, db)

ai_service.generate_daily_picks = types.MethodType(_generate_daily_picks, ai_service)
ai_service.generate_icebreakers = types.MethodType(_generate_icebreakers, ai_service)
ai_service.generate_conversation_prompts = types.MethodType(_generate_conversation_prompts, ai_service)
ai_service.get_question_of_the_day = types.MethodType(_get_question_of_the_day, ai_service)
ai_service.suggest_smart_filters = types.MethodType(_suggest_smart_filters, ai_service)
ai_service.calculate_compatibility = staticmethod(calculate_compatibility)

__all__ = [
    "AIService",
    "ai_service",
    "calculate_compatibility",
    "generate_daily_picks",
    "generate_icebreakers",
    "generate_conversation_prompts",
    "get_question_of_the_day",
    "suggest_smart_filters",
]
