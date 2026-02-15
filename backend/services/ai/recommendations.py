"""
AI Recommendations - Daily picks, smart filters, compatibility scoring
"""

import uuid
from typing import List, Dict, Any
from collections import Counter

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from backend.models.interaction import Swipe, Match
from backend.models.user import User
from backend.models.chat import Message


def calculate_compatibility(user_profile: Any, candidate_profile: Any) -> float:
    """Calculate compatibility score between two profiles."""
    def get_val(obj, attr, default=None):
        if isinstance(obj, dict):
            return obj.get(attr, default)
        return getattr(obj, attr, default)

    score = 0.0
    
    # Интересы (40%)
    user_interests = set(get_val(user_profile, 'interests') or [])
    cand_interests = set(get_val(candidate_profile, 'interests') or [])
    common_interests = user_interests & cand_interests
    interests_score = (len(common_interests) / max(len(user_interests), 1)) * 0.4
    
    # Демография (30%): возраст, рост
    u_age = get_val(user_profile, 'age', 25)
    c_age = get_val(candidate_profile, 'age', 25)
    age_diff = abs(u_age - c_age)
    age_score = max(0, 1 - age_diff / 20) * 0.15
    
    u_height = get_val(user_profile, 'height')
    c_height = get_val(candidate_profile, 'height')
    height_score = 0
    if u_height and c_height:
        height_diff = abs(u_height - c_height)
        height_score = max(0, 1 - height_diff / 30) * 0.15
    
    # Привычки (30%): smoking, drinking, education, looking_for
    matches = 0
    attrs = ['smoking', 'drinking', 'education', 'looking_for']
    for attr in attrs:
        if get_val(user_profile, attr) == get_val(candidate_profile, attr):
            matches += 1
    habits_match = (matches / 4) * 0.3
    
    return (interests_score + age_score + height_score + habits_match) * 100


async def generate_daily_picks(
    ai_service,
    user_id: str, 
    db: AsyncSession, 
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Generate personalized daily picks using collaborative and content-based filtering.
    """
    try:
        u_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        
        # 1. Get current user profile
        stmt = select(User).where(User.id == u_id)
        result = await db.execute(stmt)
        current_user = result.scalar_one_or_none()
        if not current_user:
            return []

        # 2. Get history of user's likes
        from backend.core.redis import redis_manager
        history_key = f"interactions:{u_id}:liked"
        liked_user_ids = []
        
        # Try Redis first
        redis_history = await redis_manager.client.lrange(history_key, 0, 49)
        if redis_history:
            liked_user_ids = [uuid.UUID(uid) for uid in redis_history]
        else:
            # Fallback to DB
            likes_stmt = select(Swipe.to_user_id).where(
                and_(Swipe.from_user_id == u_id, Swipe.action.in_(["like", "superlike"]))
            ).order_by(desc(Swipe.timestamp)).limit(50)
            likes_result = await db.execute(likes_stmt)
            liked_user_ids = [r[0] for r in likes_result.all()]

        # 3. Collaborative filtering: find users who liked the same people
        candidate_ids = []
        if liked_user_ids:
            similar_users_stmt = select(Swipe.from_user_id).where(
                and_(
                    Swipe.to_user_id.in_(liked_user_ids),
                    Swipe.from_user_id != u_id
                )
            ).group_by(Swipe.from_user_id).order_by(desc(func.count(Swipe.id))).limit(20)
            similar_users_result = await db.execute(similar_users_stmt)
            similar_user_ids = [r[0] for r in similar_users_result.all()]

            if similar_user_ids:
                seen_stmt = select(Swipe.to_user_id).where(Swipe.from_user_id == u_id)
                seen_result = await db.execute(seen_stmt)
                seen_ids = [r[0] for r in seen_result.all()]

                exclusion_ids = list(set(seen_ids) | set(liked_user_ids))
                
                filters = [
                    User.id.in_(
                        select(Swipe.to_user_id).where(
                            and_(
                                Swipe.from_user_id.in_(similar_user_ids),
                                Swipe.action.in_(["like", "superlike"])
                            )
                        )
                    ),
                    User.id != u_id
                ]
                
                if exclusion_ids:
                    filters.append(~User.id.in_(exclusion_ids))

                candidates_stmt = select(User).where(and_(*filters)).limit(50)
                cand_res = await db.execute(candidates_stmt)
                candidates = cand_res.scalars().all()
            else:
                candidates = []
        else:
            # Fallback to general discovery if no likes yet
            discovery_stmt = select(User).where(
                and_(User.id != u_id, User.gender != current_user.gender)
            ).limit(50)
            cand_res = await db.execute(discovery_stmt)
            candidates = cand_res.scalars().all()

        # 4. Calculate compatibility scores
        picks = []
        for candidate in candidates:
            score = calculate_compatibility(current_user, candidate)
            common = list(set(current_user.interests) & set(candidate.interests))
            
            reasoning = f"Вам может понравиться, потому что вы оба любите {', '.join(common[:2])}" if common else "У вас отличная совместимость по интересам!"
            
            picks.append({
                "id": str(candidate.id),
                "name": candidate.name,
                "age": candidate.age,
                "photos": candidate.photos,
                "compatibility_score": score,
                "common_interests": common,
                "ai_reasoning": reasoning
            })

        picks.sort(key=lambda x: x["compatibility_score"], reverse=True)
        return picks[:limit]

    except Exception as e:
        print(f"Error generating daily picks: {e}")
        return []


async def generate_icebreakers(
    ai_service,
    user1_id: str,
    user2_id: str,
    db: AsyncSession,
    count: int = 3,
) -> List[str]:
    """Generate contextual icebreakers for a pair based on their profiles."""
    try:
        u1 = uuid.UUID(user1_id) if isinstance(user1_id, str) else user1_id
        u2 = uuid.UUID(user2_id) if isinstance(user2_id, str) else user2_id
        stmt1 = select(User).where(User.id == u1)
        stmt2 = select(User).where(User.id == u2)
        r1, r2 = await db.execute(stmt1), await db.execute(stmt2)
        user1, user2 = r1.scalar_one_or_none(), r2.scalar_one_or_none()
        if not user1 or not user2:
            result, _ = await ai_service._simulate_response("icebreaker", count)
            return result[:count]

        interests1 = getattr(user1, "interests", None) or (user1.interests if hasattr(user1, "interests") else [])
        interests2 = getattr(user2, "interests", None) or (user2.interests if hasattr(user2, "interests") else [])
        if hasattr(user1, "interests_rel"):
            interests1 = [i.tag for i in user1.interests_rel] if user1.interests_rel else interests1
        if hasattr(user2, "interests_rel"):
            interests2 = [i.tag for i in user2.interests_rel] if user2.interests_rel else interests2
        bio1 = getattr(user1, "bio", "") or ""
        bio2 = getattr(user2, "bio", "") or ""
        common = list(set(interests1) & set(interests2)) if interests1 and interests2 else []
        ctx = (
            f"User1: interests={interests1[:10]}, bio={bio1[:200]}. "
            f"User2: interests={interests2[:10]}, bio={bio2[:200]}. "
            f"Common: {common[:5]}."
        )
        suggestions, _ = await ai_service.generate_content("icebreaker", context=ctx, tone="friendly", count=count)
        return suggestions[:count] if isinstance(suggestions, list) else [str(suggestions)]
    except Exception as e:
        print(f"Error generating icebreakers: {e}")
        result, _ = await ai_service._simulate_response("icebreaker", count)
        return result[:count]


async def generate_conversation_prompts(
    ai_service,
    match_id: str,
    db: AsyncSession,
    count: int = 3,
) -> List[str]:
    """Suggest ways to restart a stalled conversation from last messages."""
    try:
        mid = uuid.UUID(match_id) if isinstance(match_id, str) else match_id
        stmt = (
            select(Message)
            .where(Message.match_id == mid)
            .order_by(Message.created_at.desc())
            .limit(5)
        )
        result = await db.execute(stmt)
        messages = result.scalars().all()
        if not messages:
            return []
        messages_text = "\n".join([f"{m.sender_id}: {m.text or '(media)'}" for m in reversed(messages)])
        ctx = f"Conversation has stalled. Last messages:\n{messages_text}\nSuggest {count} ways to restart the conversation."
        suggestions, _ = await ai_service.generate_content("conversation_prompts", context=ctx, tone="friendly", count=count)
        return suggestions[:count] if isinstance(suggestions, list) else [str(suggestions)]
    except Exception as e:
        print(f"Error generating conversation prompts: {e}")
        return []


async def get_question_of_the_day(ai_service) -> str:
    """Get today's question (cached in Redis 24h)."""
    from backend.core.redis import redis_manager
    from datetime import date
    today = date.today().isoformat()
    key = f"qotd:{today}"
    cached = await redis_manager.get_json(key)
    if cached and isinstance(cached, str):
        return cached
    if isinstance(cached, dict) and cached.get("question"):
        return cached["question"]
    suggestions, _ = await ai_service.generate_content(
        "question",
        context="Generate 1 fun, thought-provoking question for dating app users. Keep it light and engaging.",
        tone="friendly",
        count=1,
    )
    question = suggestions[0] if suggestions else "What's one thing that always makes you smile?"
    await redis_manager.set_json(key, question, expire=86400)
    return question


async def suggest_smart_filters(
    ai_service, 
    user_id: str, 
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Analyze user's like history to suggest smart filters.
    """
    try:
        u_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        
        from backend.core.redis import redis_manager
        history_key = f"interactions:{u_id}:liked"
        liked_user_ids = []
        
        redis_history = await redis_manager.client.lrange(history_key, 0, 29)
        if redis_history:
            liked_user_ids = [uuid.UUID(uid) for uid in redis_history]
        else:
            likes_q = select(Swipe.to_user_id).where(
                and_(Swipe.from_user_id == u_id, Swipe.action.in_(["like", "superlike"]))
            ).order_by(desc(Swipe.timestamp)).limit(30)
            likes_res = await db.execute(likes_q)
            liked_user_ids = [r[0] for r in likes_res.all()]

        if not liked_user_ids:
            return {}

        stmt = select(User).where(User.id.in_(liked_user_ids))
        result = await db.execute(stmt)
        liked_users = result.scalars().all()
        
        if not liked_users:
            return {}

        ages = [u.age for u in liked_users]
        min_age = max(18, min(ages) - 2)
        max_age = min(100, max(ages) + 2)
        
        all_interests = []
        for u in liked_users:
            all_interests.extend(u.interests)
        
        common_interests = [item for item, _ in Counter(all_interests).most_common(5)]
        
        edu_counts = Counter([u.education for u in liked_users if u.education])
        most_common_edu = edu_counts.most_common(1)[0][0] if edu_counts else None

        return {
            "age_range": [min_age, max_age],
            "interests": common_interests,
            "education": most_common_edu
        }
    except Exception as e:
        print(f"Error suggesting smart filters: {e}")
        return {}
