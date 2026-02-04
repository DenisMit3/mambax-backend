from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from uuid import UUID
from enum import Enum

# --- Enums ---

class Currency(str, Enum):
    XTR = "XTR" # Telegram Stars
    USD = "USD"
    EUR = "EUR"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PlanTier(str, Enum):
    FREE = "free"
    GOLD = "gold"
    PLATINUM = "platinum"

# --- Models ---

class TelegramPaymentRequest(BaseModel):
    plan_id: UUID
    currency: Currency = Currency.XTR

class TelegramStarsInvoice(BaseModel):
    invoice_link: str
    amount: int
    currency: str
    transaction_id: UUID

class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    amount: float
    currency: str
    status: PaymentStatus
    created_at: datetime
    metadata: Dict

class SubscriptionPlanBase(BaseModel):
    name: str
    tier: PlanTier
    price: float
    currency: str = "XTR"
    duration_days: int
    features: Dict

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    tier: Optional[PlanTier] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    duration_days: Optional[int] = None
    features: Optional[Dict] = None
    is_active: Optional[bool] = None
    is_popular: Optional[bool] = None

class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: UUID
    is_active: bool
    is_popular: bool


# ============================================
# VIRTUAL GIFTS SCHEMAS
# ============================================

class GiftCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0


class GiftCategoryCreate(GiftCategoryBase):
    pass


class GiftCategoryResponse(GiftCategoryBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class VirtualGiftBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: str
    animation_url: Optional[str] = None
    price: float
    currency: str = "XTR"
    is_animated: bool = False
    is_premium: bool = False


class VirtualGiftCreate(VirtualGiftBase):
    category_id: Optional[UUID] = None
    is_limited: bool = False
    available_until: Optional[datetime] = None
    max_quantity: Optional[int] = None


class VirtualGiftResponse(VirtualGiftBase):
    id: UUID
    category_id: Optional[UUID] = None
    is_limited: bool
    times_sent: int
    is_active: bool
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class VirtualGiftWithCategory(VirtualGiftResponse):
    category: Optional[GiftCategoryResponse] = None


class SendGiftRequest(BaseModel):
    gift_id: UUID
    receiver_id: UUID
    message: Optional[str] = Field(None, max_length=500)
    is_anonymous: bool = False


class GiftTransactionResponse(BaseModel):
    id: UUID
    sender_id: UUID
    receiver_id: UUID
    gift_id: UUID
    price_paid: float
    currency: str
    message: Optional[str] = None
    status: str
    is_anonymous: bool
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    # Enriched fields (optional, populated on request)
    gift: Optional[VirtualGiftResponse] = None
    sender_name: Optional[str] = None
    sender_photo: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_photo: Optional[str] = None

    class Config:
        from_attributes = True


class GiftCatalogResponse(BaseModel):
    categories: List[GiftCategoryResponse]
    gifts: List[VirtualGiftResponse]
    total_gifts: int


class ReceivedGiftsResponse(BaseModel):
    gifts: List[GiftTransactionResponse]
    total: int
    unread_count: int


class SentGiftsResponse(BaseModel):
    gifts: List[GiftTransactionResponse]
    total: int
    total_spent: float


class MarkGiftReadRequest(BaseModel):
    transaction_id: UUID


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    size: int


class RefundRequest(BaseModel):
    reason: str


class CategoryResponse(BaseModel):
    id: Optional[UUID]
    name: str
    description: Optional[str] = None
    gifts: List[VirtualGiftResponse]
