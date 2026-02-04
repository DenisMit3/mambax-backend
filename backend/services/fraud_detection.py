from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timedelta

from backend.models.user_management import FraudScore
from backend.models import User, Report, Message


class FraudDetectionService:
    """
    Professional fraud detection service for user risk assessment.
    Calculates fraud scores based on multiple behavioral and profile factors.
    """
    
    # Risk factor weights (sum to 100)
    WEIGHTS = {
        'profile_completeness': 15,
        'photo_quality': 20,
        'verification_status': 15,
        'email_reputation': 10,
        'activity_pattern': 15,
        'report_history': 25,
    }
    
    # Suspicious email domains
    SUSPICIOUS_DOMAINS = [
        'tempmail', 'guerrillamail', 'mailinator', '10minutemail',
        'throwaway', 'fakeinbox', 'trashmail', 'yopmail'
    ]
    
    async def analyze_user(self, db: AsyncSession, user_id: uuid.UUID) -> FraudScore:
        """
        Analyze a user for fraud risk and create/update their FraudScore.
        Uses comprehensive multi-factor analysis.
        """
        user = await db.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        
        factors = {}
        
        # 1. Profile Completeness (0-15 points)
        profile_score = 0
        if not user.bio or len(user.bio) < 20:
            profile_score += 5
            factors['sparse_bio'] = 5
        if not user.age:
            profile_score += 3
            factors['missing_age'] = 3
        if not user.city and not user.location:
            profile_score += 4
            factors['no_location'] = 4
        if not user.gender:
            profile_score += 3
            factors['no_gender'] = 3
        factors['profile_completeness_penalty'] = min(profile_score, self.WEIGHTS['profile_completeness'])
        
        # 2. Photo Quality (0-20 points)
        photo_score = 0
        photo_count = len(user.photos) if user.photos else 0
        if photo_count == 0:
            photo_score = 20
            factors['no_photos'] = 20
        elif photo_count == 1:
            photo_score = 10
            factors['single_photo'] = 10
        elif photo_count < 3:
            photo_score = 5
            factors['few_photos'] = 5
        factors['photo_quality_penalty'] = min(photo_score, self.WEIGHTS['photo_quality'])
        
        # 3. Verification Status (0-15 points)
        verification_score = 0
        if not user.is_verified:
            verification_score = 15
            factors['not_verified'] = 15
        factors['verification_penalty'] = min(verification_score, self.WEIGHTS['verification_status'])
        
        # 4. Email Reputation (0-10 points)
        email_score = 0
        email = (user.email or '').lower()
        for domain in self.SUSPICIOUS_DOMAINS:
            if domain in email:
                email_score = 10
                factors['suspicious_email_domain'] = 10
                break
        if not email or '@' not in email:
            email_score = max(email_score, 5)
            factors['invalid_email'] = 5
        factors['email_reputation_penalty'] = min(email_score, self.WEIGHTS['email_reputation'])
        
        # 5. Activity Pattern (0-15 points)
        activity_score = 0
        if user.updated_at:
            days_inactive = (datetime.utcnow() - user.updated_at).days
            if days_inactive > 30:
                activity_score = 15
                factors['long_inactive'] = 15
            elif days_inactive > 14:
                activity_score = 8
                factors['inactive_2_weeks'] = 8
            elif days_inactive > 7:
                activity_score = 3
                factors['inactive_week'] = 3
        # Check for suspicious activity patterns (mass messaging)
        recent_messages = await db.scalar(
            select(func.count(Message.id))
            .where(Message.sender_id == user_id)
            .where(Message.created_at > datetime.utcnow() - timedelta(hours=24))
        )
        if recent_messages and recent_messages > 100:
            activity_score = max(activity_score, 15)
            factors['mass_messaging'] = 15
        factors['activity_pattern_penalty'] = min(activity_score, self.WEIGHTS['activity_pattern'])
        
        # 6. Report History (0-25 points) - Most important factor
        report_score = 0
        reports_against = await db.scalar(
            select(func.count(Report.id))
            .where(Report.reported_user_id == user_id)
        )
        if reports_against:
            if reports_against >= 5:
                report_score = 25
                factors['many_reports'] = 25
            elif reports_against >= 3:
                report_score = 15
                factors['multiple_reports'] = 15
            elif reports_against >= 1:
                report_score = 8
                factors['has_reports'] = 8
        factors['report_history_penalty'] = min(report_score, self.WEIGHTS['report_history'])
        
        # Calculate total score (0-100)
        total_score = sum([
            factors.get('profile_completeness_penalty', 0),
            factors.get('photo_quality_penalty', 0),
            factors.get('verification_penalty', 0),
            factors.get('email_reputation_penalty', 0),
            factors.get('activity_pattern_penalty', 0),
            factors.get('report_history_penalty', 0),
        ])
        
        # Determine risk level
        if total_score >= 70:
            risk_level = 'critical'
        elif total_score >= 50:
            risk_level = 'high'
        elif total_score >= 30:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        # Upsert FraudScore
        existing = await db.scalar(
            select(FraudScore).where(FraudScore.user_id == user_id)
        )
        
        if existing:
            existing.score = total_score
            existing.risk_level = risk_level
            existing.factors = factors
            existing.updated_at = datetime.utcnow()
            fraud_score = existing
        else:
            fraud_score = FraudScore(
                user_id=user_id,
                score=total_score,
                risk_level=risk_level,
                factors=factors
            )
            db.add(fraud_score)
        
        await db.commit()
        await db.refresh(fraud_score)
        
        return fraud_score
    
    async def batch_recalculate(
        self, 
        db: AsyncSession, 
        limit: int = 100,
        only_missing: bool = False
    ) -> Dict[str, Any]:
        """
        Recalculate fraud scores for multiple users.
        
        Args:
            limit: Maximum number of users to process
            only_missing: If True, only process users without existing FraudScore
        
        Returns:
            Stats about the batch operation
        """
        if only_missing:
            # Get users without FraudScore
            subq = select(FraudScore.user_id)
            query = select(User.id).where(User.id.notin_(subq)).limit(limit)
        else:
            # Get users ordered by oldest fraud score update
            query = (
                select(User.id)
                .outerjoin(FraudScore, User.id == FraudScore.user_id)
                .order_by(FraudScore.updated_at.asc().nullsfirst())
                .limit(limit)
            )
        
        result = await db.execute(query)
        user_ids = [row[0] for row in result.all()]
        
        processed = 0
        errors = 0
        
        for user_id in user_ids:
            try:
                await self.analyze_user(db, user_id)
                processed += 1
            except Exception as e:
                errors += 1
                print(f"Error analyzing user {user_id}: {e}")
        
        return {
            'processed': processed,
            'errors': errors,
            'total_queued': len(user_ids)
        }
    
    async def get_user_risk(self, db: AsyncSession, user_id: uuid.UUID) -> Dict[str, Any]:
        """Get the latest fraud risk assessment for a user."""
        result = await db.scalar(
            select(FraudScore)
            .where(FraudScore.user_id == user_id)
        )
        if result:
            return {
                'score': result.score,
                'risk_level': result.risk_level,
                'factors': result.factors,
                'last_updated': result.updated_at.isoformat() if result.updated_at else None
            }
        return {'score': 0, 'risk_level': 'unknown', 'factors': {}}
    
    async def get_high_risk_users(
        self, 
        db: AsyncSession, 
        min_score: int = 50,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get users with high fraud risk scores."""
        query = (
            select(FraudScore, User)
            .join(User, FraudScore.user_id == User.id)
            .where(FraudScore.score >= min_score)
            .order_by(FraudScore.score.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()
        
        return [
            {
                'user_id': str(row.FraudScore.user_id),
                'user_name': row.User.name,
                'score': row.FraudScore.score,
                'risk_level': row.FraudScore.risk_level,
                'factors': row.FraudScore.factors
            }
            for row in rows
        ]


fraud_service = FraudDetectionService()

