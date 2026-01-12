import os
import random
import asyncio
from typing import List, Optional

class AIService:
    """
    Service for AI content generation.
    Supports switching between real providers (OpenAI) and simulation.
    """
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.provider = "openai" if self.api_key else "simulation"
        
    async def generate_content(self, content_type: str, context: Optional[str] = None, tone: str = "friendly", count: int = 5) -> tuple[List[str], dict]:
        if self.provider == "openai":
            return await self._call_openai(content_type, context, tone, count)
        else:
            return await self._simulate_response(content_type, count)
            
    async def _call_openai(self, content_type: str, context: str, tone: str, count: int) -> tuple[List[str], dict]:
        # Placeholder for real OpenAI call to avoid dependency issues if openai package not installed
        # In a real scenario, use `openai` library here.
        # Check if we can import openai
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=self.api_key)
            
            prompt = f"Generate {count} {tone} {content_type} suggestions."
            if context:
                prompt += f" Context: {context}"
                
            response = await client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150 * count
            )
            # Naive parsing
            content = response.choices[0].message.content
            suggestions = [line.strip("- *") for line in content.split("\n") if line.strip()][:count]
            usage = {
                "tokens": response.usage.total_tokens,
                "cost": (response.usage.prompt_tokens * 0.03 + response.usage.completion_tokens * 0.06) / 1000 # Rough estimate
            }
            return suggestions, usage
            
        except ImportError:
            print("OpenAI library not found, falling back to simulation.")
            return await self._simulate_response(content_type, count)
        except Exception as e:
            print(f"AI Call failed: {e}, falling back to simulation.")
            return await self._simulate_response(content_type, count)

    async def _simulate_response(self, content_type: str, count: int) -> tuple[List[str], dict]:
        # Simulate network latency
        await asyncio.sleep(1.0)
        
        examples = {
            "bio": [
                "Adventure seeker with a passion for sunset hikes.",
                "Coffee enthusiast and amateur photographer.",
                "Looking for someone to share pizza and bad jokes with.",
                "Digital nomad exploring the world one cafe at a time.",
                "Tech geek by day, musician by night.",
                "Just a small town girl living in a lonely world.",
                "I like my coffee how I like myself: dark, bitter, and too hot for you.",
            ],
            "icebreaker": [
                "Two truths and a lie - go!",
                "What's your most controversial opinion?",
                "If you could teleport anywhere right now, where to?",
                "Pineapple on pizza: Masterpiece or Crime?",
                "What's the last song you listened to on repeat?",
            ]
        }
        
        pool = examples.get(content_type, ["Generic AI suggestion 1", "Generic AI suggestion 2"])
        # Extend pool if requests > available
        while len(pool) < count:
            pool.extend([f"AI Generated {content_type} #{i}" for i in range(len(pool), count + 5)])
            
        suggestions = random.sample(pool, min(count, len(pool)))
        
        # Simulate usage
        avg_tokens_per_item = 50
        tokens = count * avg_tokens_per_item
        # Simulate cost ($0.03/1k input, $0.06/1k output) - approx $0.005 for this batch
        cost = (tokens / 1000) * 0.05
        
        return suggestions, {"tokens": tokens, "cost": cost}

ai_service = AIService()
