"""
Chat REST endpoints: icebreakers, conversation prompts, question of the day.
"""

from uuid import UUID
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.redis import redis_manager
from backend.services.chat import manager
from backend.db.session import async_session_maker
from backend import database, auth

from .schemas import QOTDAnswerRequest

router = APIRouter(tags=["Chat"])


@router.get("/chat/icebreakers")
async def get_icebreakers(
    match_id: str = Query(..., description="Match ID"),
    refresh: bool = Query(False, description="Bypass cache"),
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Get AI-generated icebreakers for a match (cached 24h)."""
    from backend.models.interaction import Match
    from backend.services.ai import ai_service

    match_obj = await db.get(Match, UUID(match_id))
    if not match_obj:
        raise HTTPException(status_code=404, detail="Match not found")
    u1, u2 = str(match_obj.user1_id), str(match_obj.user2_id)
    if current_user not in (u1, u2):
        raise HTTPException(status_code=403, detail="Access denied")

    cache_key = f"icebreakers:{match_id}"
    if not refresh:
        cached = await redis_manager.get_json(cache_key)
        if cached and isinstance(cached, list) and len(cached) > 0:
            return {"icebreakers": cached}

    icebreakers = await ai_service.generate_icebreakers(u1, u2, db, count=3)
    await redis_manager.set_json(cache_key, icebreakers, expire=86400)
    return {"icebreakers": icebreakers}


@router.post("/chat/icebreakers/used")
async def record_icebreaker_used(
    match_id: str = Query(..., description="Match ID"),
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Record that user used an icebreaker (for badge progress)."""
    from backend.models.interaction import Match
    from backend.services.gamification import check_and_award_badge

    match_obj = await db.get(Match, UUID(match_id))
    if not match_obj:
        raise HTTPException(status_code=404, detail="Match not found")
    if current_user not in (str(match_obj.user1_id), str(match_obj.user2_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    r = await redis_manager.get_redis()
    if r:
        key = f"icebreaker_used_count:{current_user}"
        try:
            await r.incr(key)
            await r.expire(key, 86400 * 365)
        except Exception:
            pass
    await check_and_award_badge(current_user, "icebreaker_master", db)
    return {"status": "ok"}


@router.get("/chat/conversation-prompts")
async def get_conversation_prompts(
    match_id: str = Query(..., description="Match ID"),
    current_user: str = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db),
):
    """Get prompts to restart a stalled conversation (if last message > 24h)."""
    from backend.models.interaction import Match
    from backend.models.chat import Message
    from backend.services.ai import ai_service

    match_obj = await db.get(Match, UUID(match_id))
    if not match_obj:
        raise HTTPException(status_code=404, detail="Match not found")
    if current_user not in (str(match_obj.user1_id), str(match_obj.user2_id)):
        raise HTTPException(status_code=403, detail="Access denied")

    stmt = (
        select(Message)
        .where(Message.match_id == match_obj.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    last_msg = result.scalar_one_or_none()
    threshold = datetime.utcnow() - timedelta(hours=24)
    stalled = last_msg is None or (last_msg.created_at.replace(tzinfo=None) < threshold)

    if not stalled:
        return {"prompts": [], "stalled": False}

    cache_key = f"conversation_prompts:{match_id}"
    cached = await redis_manager.get_json(cache_key)
    if cached and isinstance(cached, list) and len(cached) > 0:
        return {"prompts": cached, "stalled": True}

    prompts = await ai_service.generate_conversation_prompts(match_id, db, count=3)
    await redis_manager.set_json(cache_key, prompts, expire=3600)
    return {"prompts": prompts, "stalled": True}


@router.get("/chat/question-of-day")
async def get_question_of_day(current_user: str = Depends(auth.get_current_user)):
    """Get today's question of the day (cached 24h globally)."""
    from backend.services.ai import ai_service
    from datetime import date
    question = await ai_service.get_question_of_the_day()
    return {"question": question, "date": date.today().isoformat()}


@router.post("/chat/question-of-day/answer")
async def post_question_of_day_answer(
    req: QOTDAnswerRequest,
    current_user: str = Depends(auth.get_current_user),
):
    """Save QOTD answer and notify if both partners answered."""
    from backend.models.interaction import Match
    from datetime import date

    today = date.today().isoformat()
    async with async_session_maker() as db:
        match_obj = await db.get(Match, UUID(req.match_id))
        if not match_obj:
            raise HTTPException(status_code=404, detail="Match not found")
        u1, u2 = str(match_obj.user1_id), str(match_obj.user2_id)
        if current_user not in (u1, u2):
            raise HTTPException(status_code=403, detail="Access denied")
        partner_id = u2 if current_user == u1 else u1

    key_me = f"qotd_answer:{req.match_id}:{current_user}:{today}"
    key_partner = f"qotd_answer:{req.match_id}:{partner_id}:{today}"
    await redis_manager.set_json(key_me, {"answer": req.answer}, expire=86400)
    partner_answered = await redis_manager.get_json(key_partner) is not None

    r = await redis_manager.get_redis()
    if r:
        count_key = f"qotd_answer_count:{current_user}"
        try:
            await r.incr(count_key)
            await r.expire(count_key, 86400 * 365)
        except Exception:
            pass
    from backend.services.gamification import check_and_award_badge
    async with async_session_maker() as db:
        await check_and_award_badge(current_user, "daily_questioner", db)

    if partner_answered:
        await manager.send_personal(current_user, {"type": "qotd_both_answered", "match_id": req.match_id})
        await manager.send_personal(partner_id, {"type": "qotd_both_answered", "match_id": req.match_id})

    return {"status": "saved", "partner_answered": partner_answered}
