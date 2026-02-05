from uuid import UUID
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.chat import Message

async def create_message(
    db: AsyncSession,
    match_id: UUID,
    sender_id: UUID,
    msg_data: dict
) -> Message:
    msg = Message(
        match_id=match_id,
        sender_id=sender_id,
        receiver_id=msg_data.get("receiver_id"),
        text=msg_data.get("text"),
        type=msg_data.get("type", "text"),
        audio_url=msg_data.get("audio_url"),
        photo_url=msg_data.get("photo_url"),
        duration=str(msg_data.get("duration")) if msg_data.get("duration") else None,
        created_at=datetime.utcnow()
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg

async def get_messages(db: AsyncSession, match_id: UUID) -> list[Message]:
    stmt = select(Message).where(Message.match_id == match_id).order_by(Message.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

async def mark_messages_as_read(
    db: AsyncSession,
    message_ids: list[UUID],
    reader_id: UUID
) -> int:
    from sqlalchemy import update
    stmt = (
        update(Message)
        .where(Message.id.in_(message_ids))
        .where(Message.receiver_id == reader_id)
        .where(Message.is_read == False)
        .values(is_read=True)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount
