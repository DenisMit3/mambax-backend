"""
AI Providers - LLM integration (Groq, Gemini, DeepSeek, OpenAI)
"""

import os
import random
import asyncio
from typing import List, Optional, Dict, Any, Tuple


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
        
    async def generate_content(self, content_type: str, context: Optional[str] = None, tone: str = "friendly", count: int = 5) -> Tuple[List[str], dict]:
        if self.provider == "gemini":
             return await self._call_gemini(content_type, context, tone, count)
        elif self.provider in ["openai", "deepseek", "groq"]:
            return await self._call_llm(content_type, context, tone, count)
        else:
            return await self._simulate_response(content_type, count)
            
    async def _call_gemini(self, content_type: str, context: str, tone: str, count: int) -> Tuple[List[str], dict]:
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

    async def _call_llm(self, content_type: str, context: str, tone: str, count: int) -> Tuple[List[str], dict]:
        try:
            import openai
            
            client_kwargs = {}
            model = "gpt-4"
            
            if self.provider == "groq":
                client_kwargs = {
                    "api_key": self.groq_key,
                    "base_url": "https://api.groq.com/openai/v1"
                }
                model = "llama-3.1-8b-instant"
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

    async def _simulate_response(self, content_type: str, count: int) -> Tuple[List[str], dict]:
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
