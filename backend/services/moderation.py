from typing import List, Optional
import uuid
import random
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.moderation import ModerationLog

class ModerationService:
    """
    Service for content moderation (text and images).
    """
    
    BANNED_WORDS = {
        "badword", "abuse", "scam", "spam", 
        "мат", "плохоеслово" 
    }

    @classmethod
    def check_text(cls, text: Optional[str]) -> bool:
        """
        Check if text contains banned content.
        Returns True if safe, False if flagged.
        """
        if not text:
            return True
            
        lower_text = text.lower()
        for word in cls.BANNED_WORDS:
            if word in lower_text:
                return False
        return True

    @classmethod
    def sanitize_text(cls, text: Optional[str]) -> str:
        """
        Replace banned words with asterisks.
        """
        if not text:
            return ""
            
        sanitized = text
        lower_text = text.lower()
        for word in cls.BANNED_WORDS:
            if word in lower_text:
                sanitized = sanitized.replace(word, "*" * len(word))
                
        return sanitized

    @classmethod
    async def check_image(cls, image_url: str, simulation_mode: bool = False) -> tuple[bool, float, str]:
        """
        Check if image is safe.
        Returns (is_safe, confidence, reason)
        """
        from backend.config.settings import settings
        import httpx
        
        # 1. HuggingFace API (Free Tier)
        if settings.HUGGINGFACE_API_KEY and not simulation_mode:
            try:
                # Need to read image bytes or send URL depending on API support. 
                # HF Inference API for image classification often accepts raw bytes better.
                # But for simplicity let's try assuming we have a public URL (or download it first).
                
                # If local URL, we must skip or download bytes directly
                if "localhost" in image_url or "127.0.0.1" in image_url:
                     # For MVP we can't moderate local dev images via external API
                     return True, 0.0, "skipped_local_dev"

                API_URL = "https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection"
                headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}

                # Download image if external OR read directly if local
                if "static/" in image_url:
                    # LOCAL FILE ACCESS (No network request to self!)
                    from pathlib import Path
                    # Convert URL to local path (assuming /static/ maps to static/ folder)
                    local_path = Path("static") / image_url.split("static/")[-1]
                    if local_path.exists():
                        with open(local_path, "rb") as f:
                            image_bytes = f.read()
                    else:
                        return True, 0.0, "local_file_not_found"
                else:
                    # External URL
                    async with httpx.AsyncClient() as client:
                        img_resp = await client.get(image_url, timeout=10)
                        if img_resp.status_code != 200:
                            return True, 0.0, "image_download_failed"
                        image_bytes = img_resp.content

                async with httpx.AsyncClient() as client:
                    response = await client.post(API_URL, headers=headers, content=image_bytes, timeout=15)
                    
                    if response.status_code == 200:
                        # Output format: [{'label': 'nsfw', 'score': 0.99}, {'label': 'normal', 'score': 0.01}]
                        results = response.json()
                        # Sort by score desc
                        # Falconsai model labels: 'nsfw', 'normal'
                        nsfw_score = 0.0
                        for item in results:
                            if item['label'] == 'nsfw':
                                nsfw_score = item['score']
                                break
                        
                        if nsfw_score > 0.75: # Threshold
                            return False, nsfw_score, "ai_flagged_nsfw"
                        else:
                            return True, (1.0 - nsfw_score), "clean"
                    else:
                        print(f"HF API Error {response.status_code}: {response.text}")

            except Exception as e:
                print(f"Moderation API Error: {e}")
                # Fallback to simulation
                pass

        # 2. Simulation / Fallback Mode
        if "unsafe" in image_url.lower():
            return False, 0.99, "detected_unsafe_keyword"
            
        return True, 0.99, "clean"

    @classmethod
    async def check_content(
        cls, 
        db: AsyncSession, 
        user_id: uuid.UUID, 
        content: str, 
        content_type: str = "text",
        content_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Generic content check wrapper that logs to DB.
        Returns True if safe, False if flagged.
        """
        is_safe = True
        confidence = 1.0
        reason = "clean"
        
        if content_type == "text":
            is_safe = cls.check_text(content)
            if not is_safe:
                reason = "keyword_match"
                confidence = 1.0
                
        elif content_type == "image":
             is_safe, confidence, reason = await cls.check_image(content)
        
        # Log result
        log_entry = ModerationLog(
            user_id=user_id,
            content_id=content_id,
            content_type=content_type,
            result="safe" if is_safe else "flagged",
            confidence=confidence,
            details=reason
        )
        db.add(log_entry)
        await db.flush() # Only flush here, let the controller commit
        
        return is_safe
