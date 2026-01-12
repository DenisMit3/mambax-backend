from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

from backend.models.marketing import MarketingCampaign, PushCampaign, EmailCampaign
from backend.models.notification import PushSubscription


class MarketingService:
    async def create_campaign(self, db: AsyncSession, data: Dict[str, Any]) -> MarketingCampaign:
        campaign = MarketingCampaign(
            name=data["name"],
            type=data["type"],
            status="draft",
            target_segment=data.get("target_segment", {}),
            budget=data.get("budget", 0.0)
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
                subject=data.get("title", ""), # using title as subject
                html_content=data.get("body", "") 
            )
            db.add(email_details)
            
        await db.commit()
        return campaign

    async def send_push_campaign(self, db: AsyncSession, campaign_id: uuid.UUID):
        """
        Execute a push campaign.
        """
        campaign = await db.get(MarketingCampaign, campaign_id)
        if not campaign or campaign.type != "push":
            return
            
        push_details = await db.scalar(select(PushCampaign).where(PushCampaign.campaign_id == campaign_id))
        if not push_details:
            return
            
        # Mock fetching targeted users
        # In real app, query User based on target_segment
        subs = await db.execute(select(PushSubscription))
        subscriptions = subs.scalars().all()
        
        sent = 0
        failed = 0
        
        for sub in subscriptions:
            # logic to call notification_service.send_push
            # Assuming check notification_service signature
            try:
                # Mock send
                sent += 1
            except:
                failed += 1
                
        # Update stats
        push_details.sent_count = sent
        push_details.failure_count = failed
        campaign.status = "completed"
        campaign.end_at = datetime.utcnow()
        
        await db.commit()

marketing_service = MarketingService()
