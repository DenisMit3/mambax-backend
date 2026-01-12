from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, List
import uuid

from backend.models.user_management import FraudScore
from backend.models import User

class FraudDetectionService:
    async def analyze_user(self, db: AsyncSession, user_id: uuid.UUID) -> FraudScore:
        """
        Analyze a user for fraud risk.
        Using dummy logic for now until AI models are integrated.
        """
        user = await db.get(User, user_id)
        if not user:
             raise ValueError("User not found")

        # Mock Scoring Logic
        score = 0.0
        factors = {}
        
        # 1. Profile Completeness
        if not user.bio:
            score += 10
            factors["missing_bio"] = 10
        
        # 2. Photos count
        if len(user.photos) < 2:
            score += 20
            factors["low_photo_count"] = 20
            
        # 3. Email domain check (mock)
        if "tempmail" in (user.email or ""):
            score += 50
            factors["suspicious_email"] = 50
            
        risk_level = "low"
        if score > 30: risk_level = "medium"
        if score > 70: risk_level = "high"
        
        # Save Score
        fraud_score = FraudScore(
            user_id=user_id,
            score=score,
            risk_level=risk_level,
            factors=factors
        )
        db.add(fraud_score)
        await db.commit()
        await db.refresh(fraud_score)
        
        return fraud_score

    async def get_user_risk(self, db: AsyncSession, user_id: uuid.UUID) -> Dict[str, Any]:
        result = await db.scalar(
            select(FraudScore).where(FraudScore.user_id == user_id).order_by(FraudScore.updated_at.desc()).limit(1)
        )
        if result:
            return {
                "score": result.score,
                "risk_level": result.risk_level,
                "factors": result.factors
            }
        return {"score": 0, "risk_level": "unknown", "factors": {}}

fraud_service = FraudDetectionService()
