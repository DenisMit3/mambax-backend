"""
Chat - Call management (placeholders + WebRTC signaling)
"""

import uuid
from typing import Optional

from backend.services.chat.models import CallInfo
from backend.services.chat.connections import manager


async def initiate_call(match_id: str, caller_id: str, callee_id: str, call_type: str = "video") -> CallInfo:
    """Initiate a call"""
    call = CallInfo(
        id=str(uuid.uuid4()),
        match_id=match_id,
        caller_id=caller_id,
        callee_id=callee_id,
        call_type=call_type
    )
    # Notify callee via WS
    await manager.send_personal(callee_id, {
        "type": "incoming_call",
        "call_id": call.id,
        "caller_id": caller_id,
        "call_type": call_type,
        "match_id": match_id
    })
    return call


async def answer_call(call_id: str, user_id: str, accept: bool) -> dict:
    """Answer or reject a call"""
    return {"call_id": call_id, "accepted": accept, "status": "answered" if accept else "rejected"}


async def end_call(call_id: str, user_id: str) -> dict:
    """End an active call"""
    return {"call_id": call_id, "status": "ended"}


async def send_webrtc_signal(call_id: str, from_user: str, to_user: str, signal_type: str, signal_data: dict) -> dict:
    """Relay WebRTC signaling data"""
    await manager.send_personal(to_user, {
        "type": signal_type,
        "call_id": call_id,
        "from_user": from_user,
        "signal_data": signal_data
    })
    return {"status": "sent"}
