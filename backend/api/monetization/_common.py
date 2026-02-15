"""
Common imports and helpers for monetization submodules.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, extract, select, update, delete, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import os
import logging
import httpx

from backend.db.session import get_db
from backend.auth import get_current_user_from_token, get_current_admin
from backend.models.user import User
from backend.models.monetization import (
    SubscriptionPlan, UserSubscription, RevenueTransaction,
    PromoCode, PromoRedemption, Refund, PricingTest, PaymentGatewayLog,
    VirtualGift, GiftCategory, BoostPurchase, SuperLikePurchase, AffiliatePartner,
    GiftTransaction,
)
from backend.schemas.monetization import (
    SubscriptionPlanCreate, SubscriptionPlanResponse,
    TelegramPaymentRequest, TelegramStarsInvoice, TransactionResponse,
    TransactionListResponse, RefundRequest, SendGiftRequest,
    SubscriptionPlanUpdate,
    GiftCategoryResponse, VirtualGiftResponse, GiftTransactionResponse,
    GiftCatalogResponse, ReceivedGiftsResponse,
    SentGiftsResponse, MarkGiftReadRequest, VirtualGiftCreate, GiftCategoryCreate,
)
from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)

# Admin router shared across admin submodules
router = APIRouter(prefix="/admin/monetization", tags=["monetization"])
