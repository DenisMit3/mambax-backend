"""
Admin User Management: list, create, delete, actions, bulk, fraud, segments.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, or_, select, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid as uuid_module
import logging

logger = logging.getLogger(__name__)

from backend.database import get_db
from backend.models.user import User, UserRole, UserStatus, SubscriptionTier, UserPhoto
from backend.models.interaction import Report, Match
from backend.models.moderation import BannedUser
from backend.models.monetization import RevenueTransaction
from backend.models.chat import Message
from backend.models.system import AuditLog
from backend.models.user_management import FraudScore
from backend.services.fraud_detection import fraud_service
from backend.core.redis import redis_manager
from .deps import get_current_admin

router = APIRouter()


class ManageStarsRequest(BaseModel):
    amount: int
    reason: str
    action: str  # "add" or "remove"


class AdminCreateUserRequest(BaseModel):
    """Schema for admin to create a user manually"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    age: int = 18
    gender: str = "other"
    password: Optional[str] = None
    role: str = "user"
    status: str = "active"
    subscription_tier: str = "free"
    bio: Optional[str] = None
    city: Optional[str] = None


@router.get("/users")
async def get_users_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    subscription: Optional[str] = None,
    verified: Optional[bool] = None,
    verification_pending: Optional[bool] = None,
    search: Optional[str] = None,
    fraud_risk: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get paginated list of users with filters including real fraud scores and activity counts"""
    
    try:
        return await _get_users_list_impl(
            page, page_size, status, subscription, verified,
            verification_pending, search, fraud_risk, sort_by, sort_order, db
        )
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"_get_users_list_impl failed, using fallback: {e}", exc_info=True)
        await db.rollback()
        try:
            fallback_conditions = []
            if status and status != 'all':
                try:
                    fallback_conditions.append(User.status == UserStatus(status))
                except ValueError:
                    pass
            if subscription and subscription != 'all':
                try:
                    fallback_conditions.append(User.subscription_tier == SubscriptionTier(subscription))
                except ValueError:
                    pass
            if verified is not None:
                fallback_conditions.append(User.is_verified == verified)
            if search:
                safe_search = search.replace("%", "\\%").replace("_", "\\_")
                fallback_conditions.append(
                    or_(
                        User.name.ilike(f"%{safe_search}%"),
                        User.email.ilike(f"%{safe_search}%"),
                        User.phone.ilike(f"%{safe_search}%")
                    )
                )

            count_q = select(func.count()).select_from(User)
            if fallback_conditions:
                count_q = count_q.where(and_(*fallback_conditions))
            result = await db.execute(count_q)
            total = result.scalar() or 0
            
            simple_q = select(User).order_by(desc(User.created_at))
            if fallback_conditions:
                simple_q = simple_q.where(and_(*fallback_conditions))
            simple_q = simple_q.offset((page - 1) * page_size).limit(page_size)
            result = await db.execute(simple_q)
            rows = result.scalars().all()

            # Подтянем фото для fallback
            user_ids = [u.id for u in rows]
            photo_map = {}
            if user_ids:
                from backend.models.user import UserPhoto
                photo_q = (
                    select(UserPhoto.user_id, func.min(UserPhoto.url).label('photo_url'))
                    .where(UserPhoto.user_id.in_(user_ids))
                    .group_by(UserPhoto.user_id)
                )
                photo_result = await db.execute(photo_q)
                for pr in photo_result:
                    photo_map[pr.user_id] = pr.photo_url

            return {
                "users": [
                    {
                        "id": str(u.id),
                        "name": u.name,
                        "email": u.email,
                        "age": u.age,
                        "gender": u.gender.value if u.gender else None,
                        "location": u.location or u.city,
                        "status": u.status.value if u.status else "active",
                        "subscription": u.subscription_tier.value if u.subscription_tier else "free",
                        "verified": u.is_verified,
                        "fraud_score": 0,
                        "registered_at": u.created_at.isoformat(),
                        "last_active": u.updated_at.isoformat() if u.updated_at else None,
                        "matches": 0,
                        "messages": 0,
                        "photo_url": photo_map.get(u.id),
                        "is_online": False
                    }
                    for u in rows
                ],
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
        except Exception as fallback_err:
            logger.error(f"Fallback also failed: {fallback_err}", exc_info=True)
            raise HTTPException(status_code=500, detail="Ошибка загрузки пользователей")


async def _get_users_list_impl(
    page, page_size, status, subscription, verified,
    verification_pending, search, fraud_risk, sort_by, sort_order, db
):
    """Internal implementation of users list with full JOINs"""
    matches_subq = (
        select(
            Match.user1_id.label('user_id'),
            func.count(Match.id).label('match_count')
        )
        .group_by(Match.user1_id)
        .subquery()
    )
    
    matches_subq2 = (
        select(
            Match.user2_id.label('user_id'),
            func.count(Match.id).label('match_count')
        )
        .group_by(Match.user2_id)
        .subquery()
    )
    
    messages_subq = (
        select(
            Message.sender_id.label('user_id'),
            func.count(Message.id).label('message_count')
        )
        .group_by(Message.sender_id)
        .subquery()
    )
    
    # Subquery for first photo URL
    first_photo_subq = (
        select(
            UserPhoto.user_id,
            func.min(UserPhoto.url).label('photo_url')
        )
        .group_by(UserPhoto.user_id)
        .subquery()
    )
    
    query = (
        select(
            User,
            FraudScore.score.label('fraud_score_value'),
            FraudScore.risk_level.label('fraud_risk_level'),
            func.coalesce(matches_subq.c.match_count, 0).label('matches_as_user1'),
            func.coalesce(matches_subq2.c.match_count, 0).label('matches_as_user2'),
            func.coalesce(messages_subq.c.message_count, 0).label('messages_count'),
            first_photo_subq.c.photo_url.label('photo_url')
        )
        .outerjoin(FraudScore, User.id == FraudScore.user_id)
        .outerjoin(matches_subq, User.id == matches_subq.c.user_id)
        .outerjoin(matches_subq2, User.id == matches_subq2.c.user_id)
        .outerjoin(messages_subq, User.id == messages_subq.c.user_id)
        .outerjoin(first_photo_subq, User.id == first_photo_subq.c.user_id)
    )
    
    conditions = []
    if status and status != 'all':
        try:
            conditions.append(User.status == UserStatus(status))
        except ValueError:
            pass  # Неизвестный статус — игнорируем фильтр
    if subscription and subscription != 'all':
        try:
            conditions.append(User.subscription_tier == SubscriptionTier(subscription))
        except ValueError:
            pass
    if verified is not None:
        conditions.append(User.is_verified == verified)
        
    if verification_pending:
        conditions.append(User.verification_selfie != None)
        conditions.append(User.is_verified == False)

    if search:
        safe_search = search.replace("%", "\\%").replace("_", "\\_")
        conditions.append(
            or_(
                User.name.ilike(f"%{safe_search}%"),
                User.email.ilike(f"%{safe_search}%"),
                User.phone.ilike(f"%{safe_search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    if fraud_risk and fraud_risk != 'all':
        if fraud_risk == 'high':
            query = query.where(FraudScore.risk_level == 'high')
        elif fraud_risk == 'medium':
            query = query.where(FraudScore.risk_level == 'medium')
        elif fraud_risk == 'low':
            query = query.where(FraudScore.risk_level == 'low')
        elif fraud_risk == 'safe':
            query = query.where(or_(FraudScore.risk_level == 'low', FraudScore.risk_level == None))
    
    count_query = select(func.count()).select_from(User)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    if fraud_risk and fraud_risk != 'all':
        count_query = count_query.outerjoin(FraudScore, User.id == FraudScore.user_id)
        if fraud_risk == 'high':
            count_query = count_query.where(FraudScore.risk_level == 'high')
        elif fraud_risk == 'medium':
            count_query = count_query.where(FraudScore.risk_level == 'medium')
        elif fraud_risk == 'low':
            count_query = count_query.where(FraudScore.risk_level == 'low')
        elif fraud_risk == 'safe':
            count_query = count_query.where(or_(FraudScore.risk_level == 'low', FraudScore.risk_level == None))
    
    result = await db.execute(count_query)
    total = result.scalar() or 0
    
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()
    
    # Check online status via Redis
    online_statuses = {}
    try:
        r = await redis_manager.get_redis()
        if r:
            for row in rows:
                uid_str = str(row.User.id)
                is_online = await r.get(f"user:online:{uid_str}")
                online_statuses[uid_str] = is_online == "true"
    except Exception:
        pass
    
    return {
        "users": [
            {
                "id": str(row.User.id),
                "name": row.User.name,
                "email": row.User.email,
                "age": row.User.age,
                "gender": row.User.gender.value if row.User.gender else None,
                "location": row.User.location or row.User.city,
                "status": row.User.status.value if row.User.status else "active",
                "subscription": row.User.subscription_tier.value if row.User.subscription_tier else "free",
                "verified": row.User.is_verified,
                "fraud_score": int(row.fraud_score_value or 0),
                "registered_at": row.User.created_at.isoformat(),
                "last_active": row.User.updated_at.isoformat() if row.User.updated_at else None,
                "matches": (row.matches_as_user1 or 0) + (row.matches_as_user2 or 0),
                "messages": row.messages_count or 0,
                "photo_url": row.photo_url,
                "is_online": online_statuses.get(str(row.User.id), False)
            }
            for row in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.post("/users")
async def admin_create_user(
    data: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new user manually by admin"""
    from backend.core.security import hash_password
    from backend.models.user import Gender, UserStatus, SubscriptionTier, UserRole
    
    try:
        if data.email:
            existing = await db.execute(select(User).where(User.email == data.email))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
        
        if data.phone:
            existing = await db.execute(select(User).where(User.phone == data.phone))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже существует")
        
        gender_map = {"male": Gender.MALE, "female": Gender.FEMALE, "other": Gender.OTHER}
        gender = gender_map.get(data.gender, Gender.OTHER)
        
        status_map = {
            "active": UserStatus.ACTIVE, "suspended": UserStatus.SUSPENDED,
            "banned": UserStatus.BANNED, "pending": UserStatus.PENDING
        }
        user_status = status_map.get(data.status, UserStatus.ACTIVE)
        
        sub_map = {
            "free": SubscriptionTier.FREE, "vip": SubscriptionTier.VIP,
            "gold": SubscriptionTier.GOLD, "platinum": SubscriptionTier.PLATINUM
        }
        subscription = sub_map.get(data.subscription_tier, SubscriptionTier.FREE)
        
        role_map = {"user": UserRole.USER, "admin": UserRole.ADMIN, "moderator": UserRole.MODERATOR}
        role = role_map.get(data.role, UserRole.USER)
        
        password = data.password or uuid_module.uuid4().hex[:16]
        new_user = User(
            email=data.email,
            phone=data.phone,
            hashed_password=hash_password(password),
            name=data.name,
            age=data.age,
            gender=gender,
            bio=data.bio,
            city=data.city,
            status=user_status,
            subscription_tier=subscription,
            role=role,
            is_active=True,
            is_complete=False,
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return {
            "status": "success",
            "message": f"Пользователь {data.name} создан",
            "user_id": str(new_user.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка создания пользователя: {str(e)}")


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Permanently delete a user from the database"""
    from backend.crud.user import delete_user
    from uuid import UUID
    
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный ID пользователя")
    
    if uid == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    
    try:
        deleted = await delete_user(db, uid)
        if not deleted:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        return {
            "status": "success",
            "message": "Пользователь полностью удален из базы данных"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка удаления: {str(e)}")


@router.get("/users/segments")
async def get_user_segments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get list of user segments"""
    return {
        "segments": [
            {"id": "new_users", "name": "Новые пользователи", "count": 145, "description": "Зарегистрированы за последние 7 дней"},
            {"id": "power_users", "name": "Активные пользователи", "count": 56, "description": "Ежедневно активны, >100 сообщений"},
            {"id": "at_risk", "name": "В зоне риска", "count": 230, "description": "Нет активности 14 дней"},
            {"id": "whales", "name": "Киты", "count": 12, "description": "Потратили >$100 в этом месяце"}
        ]
    }


@router.post("/users/fraud-scores/recalculate")
async def recalculate_fraud_scores(
    limit: int = Query(100, ge=1, le=1000),
    only_missing: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Batch recalculate fraud scores for users."""
    result = await fraud_service.batch_recalculate(db, limit=limit, only_missing=only_missing)
    return {
        "success": True,
        "processed": result['processed'],
        "errors": result['errors'],
        "total_queued": result['total_queued']
    }


@router.get("/users/fraud-scores/high-risk")
async def get_high_risk_users(
    min_score: int = Query(50, ge=0, le=100),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get users with high fraud risk scores."""
    users = await fraud_service.get_high_risk_users(db, min_score=min_score, limit=limit)
    return {
        "users": users,
        "total": len(users)
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get detailed user information"""
    _step = "init"
    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный формат ID пользователя")
    
    try:
        _step = "query_user"
        result = await db.execute(
            select(User)
            .options(selectinload(User.photos_rel), selectinload(User.interests_rel))
            .where(User.id == uid)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # === Eagerly cache ALL user attributes to prevent lazy loading after rollback ===
        _step = "cache_attrs"
        _id = str(user.id)
        _name = user.name
        _email = user.email
        _phone = user.phone
        _age = user.age
        _gender = user.gender.value if user.gender else None
        _bio = user.bio
        _location = user.location
        _city = user.city
        _status = user.status.value if user.status else "active"
        _sub_tier = user.subscription_tier.value if user.subscription_tier else "free"
        _stars = user.stars_balance or 0
        _verified = user.is_verified
        _created = user.created_at.isoformat()
        _updated = user.updated_at.isoformat() if user.updated_at else None

        _step = "cache_photos"
        try:
            photos_list = [p.url for p in user.photos_rel]
        except Exception:
            photos_list = []

        _step = "query_fraud"
        fraud_score = 0
        fraud_factors = {}
        try:
            result = await db.execute(select(FraudScore).where(FraudScore.user_id == uid))
            fraud = result.scalar_one_or_none()
            if fraud:
                fraud_score = fraud.score
                fraud_factors = fraud.factors
        except Exception as e:
            logger.warning("FraudScore query failed for %s: %s", user_id, e)
            await db.rollback()
        
        _step = "query_matches"
        matches_count = 0
        try:
            result = await db.execute(
                select(func.count(Match.id)).where(
                    or_(Match.user1_id == uid, Match.user2_id == uid)
                )
            )
            matches_count = result.scalar() or 0
        except Exception as e:
            logger.warning("Match count query failed for %s: %s", user_id, e)
            await db.rollback()
        
        _step = "query_messages"
        messages_count = 0
        try:
            result = await db.execute(
                select(func.count(Message.id)).where(
                    or_(Message.sender_id == uid, Message.receiver_id == uid)
                )
            )
            messages_count = result.scalar() or 0
        except Exception as e:
            logger.warning("Message count query failed for %s: %s", user_id, e)
            await db.rollback()
        
        _step = "query_reports"
        reports_received = 0
        reports_sent = 0
        try:
            result = await db.execute(
                select(func.count(Report.id)).where(Report.reported_id == uid)
            )
            reports_received = result.scalar() or 0
            result = await db.execute(
                select(func.count(Report.id)).where(Report.reporter_id == uid)
            )
            reports_sent = result.scalar() or 0
        except Exception as e:
            logger.warning("Report count query failed for %s: %s", user_id, e)
            await db.rollback()
        
        _step = "build_response"
        return {
            "id": _id,
            "name": _name,
            "email": _email,
            "phone": _phone,
            "age": _age,
            "gender": _gender,
            "bio": _bio,
            "photos": photos_list,
            "location": _location,
            "city": _city,
            "status": _status,
            "subscription_tier": _sub_tier,
            "stars_balance": _stars,
            "is_verified": _verified,
            "created_at": _created,
            "updated_at": _updated,
            "last_active": _updated,
            "matches_count": matches_count,
            "messages_count": messages_count,
            "reports_received": reports_received,
            "reports_sent": reports_sent,
            "fraud_score": fraud_score,
            "fraud_factors": fraud_factors
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error loading user %s at step %s: %s", user_id, _step, e)
        raise HTTPException(status_code=500, detail=f"[step={_step}] {type(e).__name__}: {e}")


@router.post("/users/{user_id}/stars")
async def manage_user_stars(
    user_id: str,
    request: ManageStarsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Manage user stars balance (add or remove)"""
    
    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный формат ID пользователя")
    
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    current_balance = user.stars_balance or 0
    
    if request.amount < 0:
        raise HTTPException(status_code=400, detail="Сумма должна быть положительной")

    if request.action == "add":
        new_balance = current_balance + request.amount
        user.stars_balance = new_balance
    elif request.action == "remove":
        new_balance = max(0, current_balance - request.amount)
        user.stars_balance = new_balance
    else:
        raise HTTPException(status_code=400, detail="Недопустимое действие")
        
    audit_log = AuditLog(
        admin_id=current_user.id,
        action=f"stars_{request.action}",
        target_resource=f"user:{user_id}",
        changes={
            "amount": request.amount, 
            "reason": request.reason,
            "old_balance": current_balance,
            "new_balance": new_balance
        }
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "status": "success", 
        "new_balance": new_balance,
        "message": f"Успешно {request.action}: {request.amount} звёзд"
    }


class UserActionRequest(BaseModel):
    action: str
    reason: Optional[str] = None


@router.post("/users/{user_id}/action")
async def perform_user_action(
    user_id: str,
    data: UserActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Perform action on user (verify, suspend, ban, activate)"""
    
    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный формат ID пользователя")
    
    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    action = data.action
    reason = data.reason
    
    if action == "verify":
        user.is_verified = True
        user.verified_at = datetime.utcnow()
    elif action == "unverify":
        user.is_verified = False
        user.verified_at = None
    elif action == "suspend":
        user.status = UserStatus.SUSPENDED
    elif action == "ban":
        user.status = UserStatus.BANNED
        # Удалить старую запись бана (unique constraint на user_id)
        await db.execute(
            delete(BannedUser).where(BannedUser.user_id == uid)
        )
        ban = BannedUser(
            user_id=uid,
            reason=reason or "Действие администратора",
            banned_by=current_user.id
        )
        db.add(ban)
    elif action == "shadowban":
        user.status = UserStatus.SHADOWBAN
    elif action == "activate":
        user.status = UserStatus.ACTIVE
    else:
        raise HTTPException(status_code=400, detail=f"Неизвестное действие: {action}")
    
    audit_log = AuditLog(
        admin_id=current_user.id,
        action=f"user_{action}",
        target_resource=f"user:{user_id}",
        changes={"action": action, "reason": reason}
    )
    db.add(audit_log)
    
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Действие '{action}' выполнено"
    }


class BulkActionRequest(BaseModel):
    user_ids: List[str]
    action: str
    reason: Optional[str] = None


@router.post("/users/bulk-action")
async def perform_bulk_user_action(
    data: BulkActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Perform action on multiple users"""
    
    success_count = 0
    for user_id in data.user_ids:
        try:
            uid = uuid_module.UUID(user_id)
            result = await db.execute(select(User).where(User.id == uid))
            user = result.scalar_one_or_none()
            if user:
                if data.action == "verify":
                    user.is_verified = True
                elif data.action == "suspend":
                    user.status = UserStatus.SUSPENDED
                elif data.action == "ban":
                    user.status = UserStatus.BANNED
                elif data.action == "activate":
                    user.status = UserStatus.ACTIVE
                success_count += 1
        except Exception:
            continue
    
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Действие выполнено для {success_count} пользователей"
    }
