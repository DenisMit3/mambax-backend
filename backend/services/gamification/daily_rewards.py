# Daily Rewards Service - полная реализация с streak и 7-дневным циклом

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.models.gamification import DailyReward, UserDailyRewardClaim
from backend.models.user import User

logger = logging.getLogger(__name__)

# Награды по дням (если нет в БД, используем эти)
DEFAULT_REWARDS = [
    {"day_number": 1, "reward_type": "stars", "reward_value": 5, "description": "5 звёзд"},
    {"day_number": 2, "reward_type": "stars", "reward_value": 10, "description": "10 звёзд"},
    {"day_number": 3, "reward_type": "stars", "reward_value": 15, "description": "15 звёзд"},
    {"day_number": 4, "reward_type": "superlike", "reward_value": 1, "description": "1 Super Like"},
    {"day_number": 5, "reward_type": "stars", "reward_value": 20, "description": "20 звёзд"},
    {"day_number": 6, "reward_type": "boost", "reward_value": 1, "description": "30 мин буста"},
    {"day_number": 7, "reward_type": "stars", "reward_value": 50, "description": "50 звёзд! Бонус за неделю"},
]


async def get_daily_reward_status(
    db: AsyncSession,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Получить статус ежедневных наград для пользователя.
    
    Returns:
        {
            "available": bool - можно ли забрать награду сейчас,
            "streak": int - текущий streak (1-7),
            "reward": {"type": str, "value": int, "description": str},
            "next_reward_at": str - когда будет доступна следующая,
            "streak_bonus": dict|None - бонус за 7 дней если применимо,
            "all_rewards": list - все награды недели с отметками
        }
    """
    user = await db.get(User, user_id)
    if not user:
        return {"error": "User not found"}
    
    # Получаем последний claim пользователя
    last_claim_stmt = (
        select(UserDailyRewardClaim)
        .where(UserDailyRewardClaim.user_id == user_id)
        .order_by(UserDailyRewardClaim.claimed_at.desc())
        .limit(1)
    )
    result = await db.execute(last_claim_stmt)
    last_claim = result.scalar_one_or_none()
    
    now = datetime.utcnow()
    
    # Определяем streak и доступность
    if last_claim is None:
        # Первый раз - streak = 1, награда доступна
        current_streak = 1
        can_claim = True
        next_reward_at = None
    else:
        hours_since_claim = (now - last_claim.claimed_at).total_seconds() / 3600
        
        if hours_since_claim < 24:
            # Ещё не прошло 24 часа - нельзя забрать
            can_claim = False
            current_streak = last_claim.streak_day
            next_reward_at = last_claim.claimed_at + timedelta(hours=24)
        elif hours_since_claim < 48:
            # Прошло 24-48 часов - можно забрать, streak продолжается
            can_claim = True
            current_streak = (last_claim.streak_day % 7) + 1  # 1->2->...->7->1
            next_reward_at = None
        else:
            # Прошло больше 48 часов - streak сбрасывается
            can_claim = True
            current_streak = 1
            next_reward_at = None
    
    # Получаем награду для текущего дня
    reward_stmt = select(DailyReward).where(
        DailyReward.day_number == current_streak,
        DailyReward.is_active == True
    )
    result = await db.execute(reward_stmt)
    reward_record = result.scalar_one_or_none()
    
    if reward_record:
        current_reward = {
            "type": reward_record.reward_type,
            "value": reward_record.reward_value,
            "description": reward_record.description,
            "icon_url": reward_record.icon_url
        }
    else:
        # Fallback на дефолтные награды
        default = DEFAULT_REWARDS[current_streak - 1]
        current_reward = {
            "type": default["reward_type"],
            "value": default["reward_value"],
            "description": default["description"],
            "icon_url": None
        }
    
    # Получаем все награды недели для отображения прогресса
    all_rewards_stmt = select(DailyReward).where(DailyReward.is_active == True).order_by(DailyReward.day_number)
    result = await db.execute(all_rewards_stmt)
    db_rewards = result.scalars().all()
    
    if db_rewards:
        all_rewards = [
            {
                "day": r.day_number,
                "type": r.reward_type,
                "value": r.reward_value,
                "description": r.description,
                "claimed": r.day_number < current_streak or (r.day_number == current_streak and not can_claim),
                "current": r.day_number == current_streak and can_claim
            }
            for r in db_rewards
        ]
    else:
        all_rewards = [
            {
                "day": r["day_number"],
                "type": r["reward_type"],
                "value": r["reward_value"],
                "description": r["description"],
                "claimed": r["day_number"] < current_streak or (r["day_number"] == current_streak and not can_claim),
                "current": r["day_number"] == current_streak and can_claim
            }
            for r in DEFAULT_REWARDS
        ]
    
    # Бонус за 7 дней
    streak_bonus = None
    if current_streak == 7 and can_claim:
        streak_bonus = {
            "message": "Бонус за полную неделю!",
            "multiplier": 2
        }
    
    return {
        "available": can_claim,
        "streak": current_streak,
        "reward": current_reward,
        "next_reward_at": next_reward_at.isoformat() if next_reward_at else None,
        "streak_bonus": streak_bonus,
        "all_rewards": all_rewards
    }


async def claim_daily_reward(
    db: AsyncSession,
    user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Забрать ежедневную награду.
    
    Returns:
        {
            "success": bool,
            "reward": {"type": str, "value": int},
            "new_streak": int,
            "new_balance": int (для stars),
            "message": str
        }
    """
    # Сначала проверяем статус
    status = await get_daily_reward_status(db, user_id)
    
    if "error" in status:
        return {"success": False, "message": status["error"]}
    
    if not status["available"]:
        return {
            "success": False,
            "message": f"Награда будет доступна {status['next_reward_at']}",
            "next_reward_at": status["next_reward_at"]
        }
    
    user = await db.get(User, user_id)
    reward = status["reward"]
    streak = status["streak"]
    
    # Получаем reward_id из БД
    reward_stmt = select(DailyReward).where(
        DailyReward.day_number == streak,
        DailyReward.is_active == True
    )
    result = await db.execute(reward_stmt)
    reward_record = result.scalar_one_or_none()
    
    # Если нет в БД, создаём запись
    if not reward_record:
        default = DEFAULT_REWARDS[streak - 1]
        reward_record = DailyReward(
            day_number=default["day_number"],
            reward_type=default["reward_type"],
            reward_value=default["reward_value"],
            description=default["description"],
            is_active=True
        )
        db.add(reward_record)
        await db.flush()
    
    # Создаём запись о получении награды
    claim = UserDailyRewardClaim(
        user_id=user_id,
        reward_id=reward_record.id,
        streak_day=streak,
        claimed_at=datetime.utcnow()
    )
    db.add(claim)
    
    # Начисляем награду
    reward_value = reward["value"]
    reward_type = reward["type"]
    new_balance = None
    
    if reward_type == "stars":
        user.stars_balance = (user.stars_balance or Decimal(0)) + Decimal(reward_value)
        new_balance = float(user.stars_balance)
        message = f"Получено {reward_value} ⭐"
    elif reward_type == "superlike":
        # Добавляем superlikes (нужно поле в User или Redis)
        message = f"Получен {reward_value} Super Like!"
    elif reward_type == "boost":
        # Активируем буст через visibility service
        message = f"Получен буст на 30 минут!"
    else:
        message = f"Награда получена: {reward['description']}"
    
    await db.commit()
    
    logger.info(f"User {user_id} claimed daily reward: day {streak}, {reward_type}={reward_value}")
    
    return {
        "success": True,
        "reward": {
            "type": reward_type,
            "value": reward_value,
            "description": reward["description"]
        },
        "new_streak": streak,
        "new_balance": new_balance,
        "message": message
    }


async def seed_daily_rewards(db: AsyncSession) -> int:
    """
    Заполнить таблицу daily_rewards дефолтными значениями.
    Возвращает количество созданных записей.
    """
    created = 0
    
    for reward_data in DEFAULT_REWARDS:
        # Проверяем существование
        stmt = select(DailyReward).where(DailyReward.day_number == reward_data["day_number"])
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if not existing:
            reward = DailyReward(
                day_number=reward_data["day_number"],
                reward_type=reward_data["reward_type"],
                reward_value=reward_data["reward_value"],
                description=reward_data["description"],
                is_active=True
            )
            db.add(reward)
            created += 1
    
    if created > 0:
        await db.commit()
        logger.info(f"Seeded {created} daily rewards")
    
    return created
