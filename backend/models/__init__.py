# Models package - SQLAlchemy ORM модели для PostgreSQL

from .user import User
from .interaction import Swipe, Match, Like, Report, Block
from .chat import Message
from .notification import PushSubscription
from .advanced import AlgorithmSettings, Icebreaker, DatingEvent, Partner, CustomReport, AIUsageLog
from .moderation import ModerationLog, BannedUser, ModerationQueueItem, NSFWDetection, Appeal
from .monetization import (
    SubscriptionPlan, UserSubscription, RevenueTransaction, 
    PromoCode, PromoRedemption, PaymentGatewayLog,
    BoostPurchase, SuperLikePurchase,
    GiftCategory, VirtualGift, GiftTransaction
)
from .analytics import DailyMetric, RetentionCohort, AnalyticsEvent
from .marketing import MarketingCampaign, PushCampaign, EmailCampaign
from .system import AuditLog, FeatureFlag, SecurityAlert, BackupStatus
from .user_management import FraudScore, UserSegment, UserNote, VerificationRequest
from .profile_enrichment import UserPrompt, UserPreference

__all__ = [
    "User",
    "Swipe",
    "Match",
    "Like",
    "Report",
    "Block",
    "Message",
    "PushSubscription",
    "AlgorithmSettings",
    "Icebreaker",
    "DatingEvent",
    "Partner",
    "CustomReport",
    "AIUsageLog",
    "ModerationLog",
    "BannedUser",
    "ModerationQueueItem",
    "NSFWDetection",
    "Appeal",
    "SubscriptionPlan", 
    "UserSubscription", 
    "RevenueTransaction", 
    "PromoCode", 
    "PromoRedemption", 
    "PaymentGatewayLog",
    "BoostPurchase", 
    "SuperLikePurchase",
    "GiftCategory",
    "VirtualGift",
    "GiftTransaction",
    "DailyMetric",
    "RetentionCohort",
    "AnalyticsEvent",
    "MarketingCampaign",
    "PushCampaign",
    "EmailCampaign",
    "AuditLog",
    "FeatureFlag",
    "SecurityAlert",
    "BackupStatus",
    "FraudScore",
    "UserSegment",
    "UserNote",
    "VerificationRequest",
    "UserPrompt",
    "UserPreference",
]

