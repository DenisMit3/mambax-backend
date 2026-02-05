import os
import random
import asyncio
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, text
import uuid
from collections import Counter
from backend.models.interaction import Swipe
from backend.models.user import User

class AIService:
    """
    Service for AI content generation.
    Supports Groq, Gemini (new SDK), DeepSeek, and OpenAI.
    """
    
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        
        # Priority: Groq (confirmed working) > Gemini > DeepSeek > OpenAI
        if self.groq_key:
            self.provider = "groq"
        elif self.gemini_key:
            self.provider = "gemini"
        elif self.deepseek_key:
            self.provider = "deepseek"
        elif self.openai_key:
            self.provider = "openai"
        else:
            self.provider = "simulation"
        print(f"AIService initialized with provider: {self.provider}")
        print(f"Keys loaded: Gemini={'Yes' if self.gemini_key else 'No'}, Groq={'Yes' if self.groq_key else 'No'}, DeepSeek={'Yes' if self.deepseek_key else 'No'}")
        
    async def generate_content(self, content_type: str, context: Optional[str] = None, tone: str = "friendly", count: int = 5) -> tuple[List[str], dict]:
        if self.provider == "gemini":
             return await self._call_gemini(content_type, context, tone, count)
        elif self.provider in ["openai", "deepseek", "groq"]:
            return await self._call_llm(content_type, context, tone, count)
        else:
            return await self._simulate_response(content_type, count)
            
    async def _call_gemini(self, content_type: str, context: str, tone: str, count: int) -> tuple[List[str], dict]:
        try:
            from google import genai
            client = genai.Client(api_key=self.gemini_key)
            
            prompt = f"Generate {count} {tone} {content_type} suggestions for a dating app. Return ONLY the list, separated by newlines."
            if context:
                prompt += f" Context: {context}"
                
            response = await asyncio.to_thread(
                client.models.generate_content,
                model='gemini-1.5-flash',
                contents=prompt
            )
            
            content = response.text
            suggestions = [line.strip("- *").strip() for line in content.split("\n") if line.strip() and len(line.strip()) > 5][:count]
            
            if not suggestions:
                suggestions = [content]
                
            return suggestions, {"tokens": 0, "cost": 0}
            
        except Exception as e:
            print(f"Gemini Call failed: {e}, falling back to simulation.")
            return await self._simulate_response(content_type, count)

    async def _call_llm(self, content_type: str, context: str, tone: str, count: int) -> tuple[List[str], dict]:
        try:
            import openai
            
            client_kwargs = {}
            model = "gpt-4"
            
            if self.provider == "groq":
                client_kwargs = {
                    "api_key": self.groq_key,
                    "base_url": "https://api.groq.com/openai/v1"
                }
                model = "llama-3.1-8b-instant" # Updated to newest working model
            elif self.provider == "deepseek":
                client_kwargs = {
                    "api_key": self.deepseek_key,
                    "base_url": "https://api.deepseek.com"
                }
                model = "deepseek-chat"
            else:
                client_kwargs = {
                    "api_key": self.openai_key
                }
                
            client = openai.AsyncOpenAI(**client_kwargs)
            
            prompt = f"Generate {count} {tone} {content_type} suggestions. Return ONLY the list or text, separated by newlines."
            if context:
                prompt += f" Context: {context}"
                
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a creative assistant for a dating app. Be concise."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150 * count
            )
            
            content = response.choices[0].message.content
            suggestions = [line.strip("- *").strip() for line in content.split("\n") if line.strip() and len(line.strip()) > 5][:count]
            
            if not suggestions:
                suggestions = [content]
                
            return suggestions, {"tokens": response.usage.total_tokens, "cost": 0}
            
        except Exception as e:
            print(f"AI Call failed ({self.provider}): {e}, falling back to simulation.")
            return await self._simulate_response(content_type, count)

    async def _simulate_response(self, content_type: str, count: int) -> tuple[List[str], dict]:
        await asyncio.sleep(0.1)
        examples = {
            "bio": ["Adventure seeker.", "Coffee enthusiast.", "Digital nomad."],
            "icebreaker": ["Two truths and a lie.", "Most controversial opinion?", "Teleport where?"]
        }
        pool = examples.get(content_type, ["AI suggestion"])
        while len(pool) < count:
            pool.append(f"AI Generated {content_type} #{len(pool)}")
        suggestions = random.sample(pool, min(count, len(pool)))
        return suggestions, {"tokens": 0, "cost": 0}


    async def generate_daily_picks(
        self, 
        user_id: str, 
        db: AsyncSession, 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate personalized daily picks using collaborative and content-based filtering.
        """
        try:
            # Convert user_id to UUID if it's a string
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
                
                # Optionally backfill Redis if empty? Let's keep it simple for now as per instructions.

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
                    # Profiles liked by "similar users" but not yet seen by current user
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
                score = self.calculate_compatibility(current_user, candidate)
                common = list(set(current_user.interests) & set(candidate.interests))
                
                # Reasoning
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

            # Sort by score and take top limit
            picks.sort(key=lambda x: x["compatibility_score"], reverse=True)
            return picks[:limit]

        except Exception as e:
            print(f"Error generating daily picks: {e}")
            return []

    def calculate_compatibility(self, user_profile: Any, candidate_profile: Any) -> float:
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

    async def suggest_smart_filters(
        self, 
        user_id: str, 
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Analyze user's like history to suggest smart filters.
        """
        try:
            u_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            
            # Analyze last 30 likes
            from backend.core.redis import redis_manager
            history_key = f"interactions:{u_id}:liked"
            liked_user_ids = []
            
            # Try Redis first
            redis_history = await redis_manager.client.lrange(history_key, 0, 29)
            if redis_history:
                liked_user_ids = [uuid.UUID(uid) for uid in redis_history]
            else:
                # Fallback to DB
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

            # Age range
            ages = [u.age for u in liked_users]
            min_age = max(18, min(ages) - 2)
            max_age = min(100, max(ages) + 2)
            
            # Common interests
            all_interests = []
            for u in liked_users:
                all_interests.extend(u.interests)
            
            from collections import Counter
            common_interests = [item for item, _ in Counter(all_interests).most_common(5)]
            
            # Popular education
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

ai_service = AIService()
