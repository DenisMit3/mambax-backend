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
from .marketing import MarketingCampaign, PushCampaign, EmailCampaign, Referral, AcquisitionChannel
from .system import AuditLog, FeatureFlag, SecurityAlert, BackupStatus
from .user_management import FraudScore, UserSegment, UserNote, VerificationRequest
from .profile_enrichment import UserPrompt, UserPreference

# New models
from .safety import (
    UserVerificationSelfie, SafetyReport, TrustScore,
    IPBlacklist, DeviceFingerprint, LoginHistory,
)
from .social import (
    Story, StoryView, StoryReaction, SpotlightEntry,
    UserActivity, ProfileView, Conversation,
    MessageReaction, MessageAttachment,
)
from .gamification import (
    Badge, UserBadge, DailyReward, UserDailyRewardClaim,
    Quest, UserQuestProgress, Leaderboard,
)
from .location import (
    GeoZone, UserLocationHistory, DiscoverFilter,
    TravelMode, CompatibilityScore,
)
from .notifications import (
    NotificationTemplate, NotificationLog,
    UserNotificationPreference, InAppNotification,
)
from .content import (
    MediaUpload, PhotoModerationQueue, ContentFilter,
    UserMediaAlbum, AlbumPhoto, AlbumAccessGrant,
)
from .support import (
    SupportTicket, SupportMessage, FeedbackSurvey, AdminActionLog,
)

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
    "Referral",
    "AcquisitionChannel",
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
    # Safety & Trust
    "UserVerificationSelfie",
    "SafetyReport",
    "TrustScore",
    "IPBlacklist",
    "DeviceFingerprint",
    "LoginHistory",
    # Social & Community
    "Story",
    "StoryView",
    "StoryReaction",
    "SpotlightEntry",
    "UserActivity",
    "ProfileView",
    "Conversation",
    "MessageReaction",
    "MessageAttachment",
    # Gamification
    "Badge",
    "UserBadge",
    "DailyReward",
    "UserDailyRewardClaim",
    "Quest",
    "UserQuestProgress",
    "Leaderboard",
    # Location & Discovery
    "GeoZone",
    "UserLocationHistory",
    "DiscoverFilter",
    "TravelMode",
    "CompatibilityScore",
    # Notifications
    "NotificationTemplate",
    "NotificationLog",
    "UserNotificationPreference",
    "InAppNotification",
    # Content & Media
    "MediaUpload",
    "PhotoModerationQueue",
    "ContentFilter",
    "UserMediaAlbum",
    "AlbumPhoto",
    "AlbumAccessGrant",
    # Support & Admin
    "SupportTicket",
    "SupportMessage",
    "FeedbackSurvey",
    "AdminActionLog",
]
