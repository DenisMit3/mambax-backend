"""
NSFW Detection Service
======================
Detects NSFW content in images using local ML model.
Uses Falconsai/nsfw_image_detection from HuggingFace (runs locally, no API costs).
Falls back to rule-based detection if model unavailable.
"""

import asyncio
import logging
import io
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Lazy-loaded model to avoid startup delay
_model = None
_processor = None
_model_loading = False
_model_load_attempted = False


async def _load_model():
    """Lazy load the NSFW detection model."""
    global _model, _processor, _model_loading, _model_load_attempted
    
    if _model is not None or _model_load_attempted:
        return
    
    if _model_loading:
        # Wait for another coroutine to finish loading
        while _model_loading:
            await asyncio.sleep(0.1)
        return
    
    _model_loading = True
    _model_load_attempted = True
    
    try:
        def _load_sync():
            global _model, _processor
            try:
                from transformers import pipeline
                # Use a lightweight NSFW classifier
                # Model: Falconsai/nsfw_image_detection (~100MB)
                _model = pipeline(
                    "image-classification",
                    model="Falconsai/nsfw_image_detection",
                    device=-1  # CPU only (use 0 for GPU)
                )
                logger.info("NSFW detection model loaded successfully")
                return True
            except ImportError:
                logger.warning("transformers not installed. NSFW detection will use rule-based fallback.")
                return False
            except Exception as e:
                logger.warning(f"Failed to load NSFW model: {e}. Using rule-based fallback.")
                return False
        
        await asyncio.to_thread(_load_sync)
    finally:
        _model_loading = False


class NSFWDetectionService:
    """
    Service to detect NSFW content using ML models.
    Primary: HuggingFace Falconsai/nsfw_image_detection (local, free)
    Fallback: Rule-based keyword detection
    """
    
    # NSFW score threshold (0.0 - 1.0)
    NSFW_THRESHOLD = 0.7
    
    # Bad words for text toxicity detection
    TOXIC_WORDS = {
        "hate", "kill", "spam", "nazi", "porn", "xxx", 
        "fuck", "shit", "bitch", "whore", "slut",
        "nigger", "faggot", "retard"
    }
    
    TOXIC_PATTERNS = [
        r"(?i)kill\s+(yourself|urself|u)",
        r"(?i)go\s+die",
        r"(?i)kys\b",
    ]
    
    async def analyze_image(self, image_input: Any) -> Tuple[float, str, Dict[str, float]]:
        """
        Analyze an image for NSFW content.
        
        Args:
            image_input: Can be URL string, file path, or PIL Image, or bytes
            
        Returns: 
            (nsfw_score, label, detailed_scores)
            - nsfw_score: 0.0 (safe) to 1.0 (explicit)
            - label: "safe", "nsfw", "porn", etc.
            - detailed_scores: dict with category scores
        """
        await _load_model()
        
        if _model is None:
            # Fallback to rule-based detection
            return self._rule_based_image_check(image_input)
        
        try:
            result = await asyncio.to_thread(self._analyze_image_sync, image_input)
            return result
        except Exception as e:
            logger.error(f"NSFW analysis error: {e}")
            return self._rule_based_image_check(image_input)
    
    def _analyze_image_sync(self, image_input: Any) -> Tuple[float, str, Dict[str, float]]:
        """Synchronous image analysis."""
        from PIL import Image
        
        # Convert input to PIL Image if needed
        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, str):
            if image_input.startswith(('http://', 'https://')):
                import requests
                response = requests.get(image_input, timeout=10)
                image = Image.open(io.BytesIO(response.content))
            else:
                image = Image.open(image_input)
        elif hasattr(image_input, 'read'):
            image = Image.open(image_input)
        else:
            image = image_input  # Assume PIL Image
        
        # Run model
        results = _model(image)
        
        # Parse results
        scores = {r['label'].lower(): r['score'] for r in results}
        
        # Determine primary label and score
        nsfw_score = scores.get('nsfw', 0.0)
        safe_score = scores.get('normal', scores.get('safe', 0.0))
        
        if nsfw_score > self.NSFW_THRESHOLD:
            label = "nsfw"
        elif nsfw_score > 0.5:
            label = "suggestive"
        else:
            label = "safe"
        
        return nsfw_score, label, scores
    
    def _rule_based_image_check(self, image_input: Any) -> Tuple[float, str, Dict[str, float]]:
        """Fallback rule-based check when ML model unavailable."""
        # Check URL for suspicious keywords
        if isinstance(image_input, str):
            url_lower = image_input.lower()
            suspicious_keywords = ['nsfw', 'xxx', 'porn', 'nude', 'naked', 'sex', 'adult', 'explicit']
            for keyword in suspicious_keywords:
                if keyword in url_lower:
                    return 0.9, "nsfw", {"nsfw": 0.9, "safe": 0.1}
        
        # Default: assume safe (can't analyze without model)
        return 0.05, "safe", {"nsfw": 0.05, "safe": 0.95}
    
    async def analyze_image_bytes(self, image_bytes: bytes) -> Tuple[float, str, Dict[str, float]]:
        """
        Analyze image from bytes directly.
        More efficient for uploaded files.
        """
        return await self.analyze_image(image_bytes)

    async def analyze_text(self, text: str) -> Tuple[bool, str]:
        """
        Analyze text for toxicity.
        Returns: (is_toxic, category)
        """
        import re
        
        text_lower = text.lower()
        
        # Check toxic words
        for word in self.TOXIC_WORDS:
            if word in text_lower:
                return True, "toxicity"
        
        # Check toxic patterns
        for pattern in self.TOXIC_PATTERNS:
            if re.search(pattern, text):
                return True, "harassment"
        
        # Check for excessive caps (shouting)
        if len(text) > 10:
            caps_ratio = sum(1 for c in text if c.isupper()) / len(text)
            if caps_ratio > 0.7:
                return True, "spam"
        
        # Check for repeated characters (spam)
        if re.search(r'(.)\1{5,}', text):
            return True, "spam"
        
        return False, "safe"
    
    async def is_safe_for_profile(self, image_input: Any) -> bool:
        """
        Quick check if image is safe for profile photo.
        Returns True if safe, False if NSFW.
        """
        score, label, _ = await self.analyze_image(image_input)
        return score < self.NSFW_THRESHOLD


nsfw_service = NSFWDetectionService()
