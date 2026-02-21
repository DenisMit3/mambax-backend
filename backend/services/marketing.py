from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any, List, Optional
import uuid
import logging
from datetime import datetime, timedelta

from backend.models.marketing import MarketingCampaign, PushCampaign, EmailCampaign
from backend.models.notification import PushSubscription
from backend.models.user import User

logger = logging.getLogger(__name__)


class MarketingService:
    async def create_campaign(self, db: AsyncSession, data: Dict[str, Any]) -> MarketingCampaign:
        campaign = MarketingCampaign(
            name=data["name"],
            campaign_type=data["type"],
            status="draft",
            target_segment=data.get("target_segment", "all"),
            sent_count=0,
            open_count=0,
            click_count=0,
            conversion_count=0
        )
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        
        if data["type"] == "push":
            push_details = PushCampaign(
                campaign_id=campaign.id,
                title=data.get("title", ""),
                body=data.get("body", ""),
                action_url=data.get("action_url")
            )
            db.add(push_details)
        elif data["type"] == "email":
            email_details = EmailCampaign(
                campaign_id=campaign.id,
                subject=data.get("title", ""),
                html_content=data.get("body", "") 
            )
            db.add(email_details)
            
        await db.commit()
        return campaign

    async def send_push_campaign(self, db: AsyncSession, campaign_id: uuid.UUID) -> Dict[str, Any]:
        """
        Execute a push campaign - sends real push notifications.
        """
        from backend.services.notification import send_push_notification
        
        campaign = await db.get(MarketingCampaign, campaign_id)
        if not campaign or campaign.campaign_type != "push":
            return {"error": "Campaign not found or not a push campaign"}
            
        push_details = await db.scalar(select(PushCampaign).where(PushCampaign.campaign_id == campaign_id))
        if not push_details:
            return {"error": "Push details not found"}
        
        # Update status to sending
        campaign.status = "sending"
        await db.commit()
        
        # Get target users based on segment
        target_users = await self._get_target_users(db, campaign.target_segment)
        
        sent = 0
        failed = 0
        
        for user_id in target_users:
            try:
                await send_push_notification(
                    db=db,
                    user_id=str(user_id),
                    title=push_details.title,
                    body=push_details.body,
                    url=push_details.action_url or "/",
                    tag=f"campaign_{campaign_id}"
                )
                sent += 1
            except Exception as e:
                logger.error(f"Push send failed for user {user_id}: {e}")
                failed += 1
                
        # Update stats
        campaign.sent_count = sent
        campaign.status = "completed"
        await db.commit()
        
        logger.info(f"Campaign {campaign_id} completed: {sent} sent, {failed} failed")
        return {"sent": sent, "failed": failed, "status": "completed"}

    async def _get_target_users(self, db: AsyncSession, segment: str) -> List[uuid.UUID]:
        """
        Get user IDs based on target segment.
        Segments: all, active, vip, new_users, inactive, churning
        """
        query = select(User.id).where(User.is_active == True)
        
        if segment == "all":
            pass  # No additional filter
        elif segment == "active":
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.where(User.last_seen >= week_ago)
        elif segment == "vip":
            query = query.where(User.is_vip == True)
        elif segment == "new_users":
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.where(User.created_at >= week_ago)
        elif segment == "inactive":
            month_ago = datetime.utcnow() - timedelta(days=30)
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.where(User.last_seen < week_ago, User.last_seen >= month_ago)
        elif segment == "churning":
            month_ago = datetime.utcnow() - timedelta(days=30)
            query = query.where(User.last_seen < month_ago)
        
        # Only users with push subscriptions
        query = query.where(
            User.id.in_(select(PushSubscription.user_id).distinct())
        )
        
        result = await db.execute(query)
        return [row[0] for row in result.fetchall()]

    async def get_campaign_stats(self, db: AsyncSession, campaign_id: uuid.UUID) -> Dict[str, Any]:
        """Get campaign statistics."""
        campaign = await db.get(MarketingCampaign, campaign_id)
        if not campaign:
            return {"error": "Campaign not found"}
        
        return {
            "id": str(campaign.id),
            "name": campaign.name,
            "status": campaign.status,
            "sent_count": campaign.sent_count or 0,
            "open_count": campaign.open_count or 0,
            "click_count": campaign.click_count or 0,
            "conversion_count": campaign.conversion_count or 0,
            "open_rate": round((campaign.open_count or 0) / max(1, campaign.sent_count or 1) * 100, 2),
            "click_rate": round((campaign.click_count or 0) / max(1, campaign.sent_count or 1) * 100, 2),
            "conversion_rate": round((campaign.conversion_count or 0) / max(1, campaign.sent_count or 1) * 100, 2)
        }

    async def track_open(self, db: AsyncSession, campaign_id: uuid.UUID):
        """Track campaign open event."""
        campaign = await db.get(MarketingCampaign, campaign_id)
        if campaign:
            campaign.open_count = (campaign.open_count or 0) + 1
            await db.commit()

    async def track_click(self, db: AsyncSession, campaign_id: uuid.UUID):
        """Track campaign click event."""
        campaign = await db.get(MarketingCampaign, campaign_id)
        if campaign:
            campaign.click_count = (campaign.click_count or 0) + 1
            await db.commit()

    async def track_conversion(self, db: AsyncSession, campaign_id: uuid.UUID):
        """Track campaign conversion event."""
        campaign = await db.get(MarketingCampaign, campaign_id)
        if campaign:
            campaign.conversion_count = (campaign.conversion_count or 0) + 1
            await db.commit()


marketing_service = MarketingService()
