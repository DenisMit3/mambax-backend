"""
Monetization Models for Dating Platform Admin Dashboard

Database models for:
- Subscription Plans
- User Subscriptions  
- Revenue Transactions
- Promo Codes
- Promo Redemptions
- Refunds
- Pricing A/B Tests
- Payment Gateway Logs
"""

import uuid
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import (
    String, Integer, Boolean, Float, Text, DateTime, 
    JSON, Uuid, Numeric, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from backend.db.base import Base


class SubscriptionTier(str, enum.Enum):
    """Subscription tier levels"""
    FREE = "free"
    GOLD = "gold"
    PLATINUM = "platinum"


class PaymentStatus(str, enum.Enum):
    """Payment transaction status"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class RefundStatus(str, enum.Enum):
    """Refund request status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSED = "processed"


class PromoCodeType(str, enum.Enum):
    """Types of promo codes"""
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    FREE_TRIAL = "free_trial"
    FEATURE_UNLOCK = "feature_unlock"


class SubscriptionPlan(Base):
    """
    Subscription plan definitions
    
    Defines available subscription tiers with pricing and features.
    """
    __tablename__ = "subscription_plans"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tier: Mapped[str] = mapped_column(
        String(20), nullable=False, default="free"
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="USD"
    )
    duration_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30
    )
    trial_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    
    # Feature flags
    unlimited_swipes: Mapped[bool] = mapped_column(Boolean, default=False)
    see_who_likes_you: Mapped[bool] = mapped_column(Boolean, default=False)
    boosts_per_month: Mapped[int] = mapped_column(Integer, default=0)
    super_likes_per_day: Mapped[int] = mapped_column(Integer, default=0)
    rewind_unlimited: Mapped[bool] = mapped_column(Boolean, default=False)
    incognito_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    advanced_filters: Mapped[bool] = mapped_column(Boolean, default=False)
    priority_listing: Mapped[bool] = mapped_column(Boolean, default=False)
    message_before_match: Mapped[bool] = mapped_column(Boolean, default=False)
    read_receipts: Mapped[bool] = mapped_column(Boolean, default=False)
    profile_boost: Mapped[bool] = mapped_column(Boolean, default=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    def __repr__(self) -> str:
        return f"<SubscriptionPlan {self.name} ({self.tier})>"


class UserSubscription(Base):
    """
    Active user subscriptions
    
    Tracks which users have which subscription plans.
    """
    __tablename__ = "user_subscriptions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("subscription_plans.id"), nullable=False
    )
    
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )
    
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Payment gateway reference
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class RevenueTransaction(Base):
    """
    All revenue transactions
    
    Records every payment, refund, and subscription transaction.
    """
    __tablename__ = "revenue_transactions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    
    # Transaction details
    transaction_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="subscription, boost, superlike, gift, feature"
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="USD"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )
    
    # Payment details
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_gateway: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    gateway_transaction_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telegram_charge_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment="Explicit Telegram payment charge ID")
    
    # Subscription reference
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("user_subscriptions.id"), nullable=True
    )
    
    # Promo code applied
    promo_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("promo_codes.id"), nullable=True
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0
    )
    
    # Attribution
    acquisition_channel: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    affiliate_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Metadata
    custom_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class PromoCode(Base):
    """
    Promo code definitions
    
    Discount codes for marketing campaigns.
    """
    __tablename__ = "promo_codes"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Discount configuration
    discount_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="percentage"
    )
    discount_value: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    min_purchase: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0
    )
    max_discount: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    
    # Usage limits
    max_uses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_uses_per_user: Mapped[int] = mapped_column(Integer, default=1)
    current_uses: Mapped[int] = mapped_column(Integer, default=0)
    
    # Validity
    valid_from: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    valid_until: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    # Targeting
    applicable_plans: Mapped[List[str]] = mapped_column(JSON, default=list)
    target_segments: Mapped[List[str]] = mapped_column(JSON, default=list)
    first_purchase_only: Mapped[bool] = mapped_column(Boolean, default=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Analytics
    total_revenue_generated: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)


class PromoRedemption(Base):
    """
    Promo code redemption tracking
    """
    __tablename__ = "promo_redemptions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    promo_code_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("promo_codes.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("revenue_transactions.id"), nullable=False
    )
    
    discount_applied: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    
    redeemed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class Refund(Base):
    """
    Refund requests and processing
    """
    __tablename__ = "refunds"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("revenue_transactions.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )
    
    # Admin handling
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Gateway processing
    gateway_refund_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class PricingTest(Base):
    """
    A/B pricing test configurations
    """
    __tablename__ = "pricing_tests"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Test configuration
    variants: Mapped[List[dict]] = mapped_column(
        JSON, nullable=False,
        comment="Array of price variants with name, price, features"
    )
    target_segment: Mapped[str] = mapped_column(
        String(50), nullable=False, default="all"
    )
    traffic_split: Mapped[List[int]] = mapped_column(
        JSON, default=list,
        comment="Percentage split for each variant"
    )
    
    # Timeline
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft",
        comment="draft, running, completed, cancelled"
    )
    
    # Results
    results: Mapped[dict] = mapped_column(
        JSON, default=dict,
        comment="Metrics for each variant: conversions, revenue, rate"
    )
    winner_variant: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)


class PaymentGatewayLog(Base):
    """
    Payment gateway event logging
    """
    __tablename__ = "payment_gateway_logs"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    
    gateway: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="payment_initiated, payment_completed, payment_failed, refund, etc."
    )
    
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("revenue_transactions.id"), nullable=True
    )
    
    # Response details
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    response_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Request/Response data (sanitized)
    request_data: Mapped[dict] = mapped_column(JSON, default=dict)
    response_data: Mapped[dict] = mapped_column(JSON, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )


class BoostPurchase(Base):
    """
    Profile boost purchases and usage
    """
    __tablename__ = "boost_purchases"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("revenue_transactions.id"), nullable=False
    )
    
    boost_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="standard, super, mega"
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Usage
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Analytics
    views_during_boost: Mapped[int] = mapped_column(Integer, default=0)
    likes_during_boost: Mapped[int] = mapped_column(Integer, default=0)
    matches_during_boost: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class SuperLikePurchase(Base):
    """
    Super like purchases and usage
    """
    __tablename__ = "superlike_purchases"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("revenue_transactions.id"), nullable=True
    )
    
    quantity_purchased: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # From subscription or purchase
    source: Mapped[str] = mapped_column(
        String(20), nullable=False,
        comment="subscription, purchase"
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class AffiliatePartner(Base):
    """
    Affiliate program partners
    """
    __tablename__ = "affiliate_partners"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Commission settings
    commission_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=10,
        comment="Percentage commission"
    )
    commission_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="percentage",
        comment="percentage, fixed"
    )
    
    # Stats
    total_referrals: Mapped[int] = mapped_column(Integer, default=0)
    total_conversions: Mapped[int] = mapped_column(Integer, default=0)
    total_revenue_generated: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0
    )
    total_commission_paid: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0
    )
    pending_commission: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0
    )
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class GiftCategory(Base):
    """
    Gift categories for organizing virtual gifts
    
    Examples: Romantic, Fun, Premium, Seasonal
    """
    __tablename__ = "gift_categories"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    
    def __repr__(self) -> str:
        return f"<GiftCategory {self.name}>"


class VirtualGift(Base):
    """
    Virtual gift definitions
    
    Defines available gifts users can send to each other.
    """
    __tablename__ = "virtual_gifts"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("gift_categories.id"), nullable=True
    )
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Visual assets
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    animation_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Pricing in Telegram Stars (XTR)
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=10
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="XTR"
    )
    
    # Gift properties
    is_animated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    is_limited: Mapped[bool] = mapped_column(Boolean, default=False)
    available_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    max_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Stats
    times_sent: Mapped[int] = mapped_column(Integer, default=0)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    def __repr__(self) -> str:
        return f"<VirtualGift {self.name} ({self.price} {self.currency})>"


class GiftTransaction(Base):
    """
    Gift sending transactions
    
    Records every gift sent between users.
    """
    __tablename__ = "gift_transactions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    
    # Participants
    sender_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    receiver_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False, index=True
    )
    gift_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("virtual_gifts.id"), nullable=False
    )
    
    # Transaction details
    price_paid: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="XTR"
    )
    
    # Optional message
    message: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Status
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="completed",
        comment="pending, completed, refunded"
    )
    
    # Visibility flags
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Reference to payment transaction
    payment_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("revenue_transactions.id"), nullable=True
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    
    def __repr__(self) -> str:
        return f"<GiftTransaction {self.sender_id} -> {self.receiver_id}>"
