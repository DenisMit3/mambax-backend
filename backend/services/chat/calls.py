"""
Chat - Call management with WebRTC signaling
============================================
Full implementation of video/audio calls between matched users.
Uses WebSocket for signaling, WebRTC for media.
"""

import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from enum import Enum

from backend.services.chat.models import CallInfo
from backend.services.chat.connections import manager
from backend.core.redis import redis_manager

logger = logging.getLogger(__name__)


class CallStatus(str, Enum):
    INITIATING = "initiating"
    RINGING = "ringing"
    CONNECTING = "connecting"
    ACTIVE = "active"
    ENDED = "ended"
    MISSED = "missed"
    REJECTED = "rejected"
    FAILED = "failed"


# In-memory call storage (for single-server deployment)
# For multi-server, use Redis
_active_calls: Dict[str, Dict[str, Any]] = {}

# Call timeout settings
RING_TIMEOUT_SECONDS = 30
CALL_MAX_DURATION_SECONDS = 3600  # 1 hour max


async def _get_call(call_id: str) -> Optional[Dict[str, Any]]:
    """Get call data from Redis or memory."""
    # Try Redis first
    call_data = await redis_manager.get_json(f"call:{call_id}")
    if call_data:
        return call_data
    # Fallback to memory
    return _active_calls.get(call_id)


async def _save_call(call_id: str, call_data: Dict[str, Any]):
    """Save call data to Redis and memory."""
    _active_calls[call_id] = call_data
    await redis_manager.set_json(f"call:{call_id}", call_data, expire=CALL_MAX_DURATION_SECONDS)


async def _delete_call(call_id: str):
    """Remove call from storage."""
    _active_calls.pop(call_id, None)
    await redis_manager.delete(f"call:{call_id}")


async def initiate_call(
    match_id: str, 
    caller_id: str, 
    callee_id: str, 
    call_type: str = "video"
) -> CallInfo:
    """
    Initiate a call between two matched users.
    
    Args:
        match_id: The match ID (ensures users are matched)
        caller_id: User initiating the call
        callee_id: User receiving the call
        call_type: "video" or "audio"
    
    Returns:
        CallInfo with call details
    """
    call_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    call_data = {
        "id": call_id,
        "match_id": match_id,
        "caller_id": caller_id,
        "callee_id": callee_id,
        "call_type": call_type,
        "status": CallStatus.RINGING.value,
        "started_at": now.isoformat(),
        "answered_at": None,
        "ended_at": None,
        "end_reason": None,
        "duration_seconds": 0,
        # ICE candidates storage
        "caller_candidates": [],
        "callee_candidates": [],
    }
    
    await _save_call(call_id, call_data)
    
    # Notify callee via WebSocket
    await manager.send_personal(callee_id, {
        "type": "incoming_call",
        "call_id": call_id,
        "caller_id": caller_id,
        "call_type": call_type,
        "match_id": match_id,
        "timestamp": now.isoformat()
    })
    
    # Schedule ring timeout
    asyncio.create_task(_handle_ring_timeout(call_id, callee_id))
    
    logger.info(f"Call initiated: {call_id} from {caller_id} to {callee_id} ({call_type})")
    
    return CallInfo(
        id=call_id,
        match_id=match_id,
        caller_id=caller_id,
        callee_id=callee_id,
        call_type=call_type
    )


async def _handle_ring_timeout(call_id: str, callee_id: str):
    """Handle call timeout if not answered."""
    await asyncio.sleep(RING_TIMEOUT_SECONDS)
    
    call_data = await _get_call(call_id)
    if call_data and call_data.get("status") == CallStatus.RINGING.value:
        # Call was not answered - mark as missed
        call_data["status"] = CallStatus.MISSED.value
        call_data["ended_at"] = datetime.utcnow().isoformat()
        call_data["end_reason"] = "timeout"
        await _save_call(call_id, call_data)
        
        # Notify both parties
        await manager.send_personal(call_data["caller_id"], {
            "type": "call_missed",
            "call_id": call_id,
            "reason": "no_answer"
        })
        await manager.send_personal(callee_id, {
            "type": "call_missed",
            "call_id": call_id,
            "reason": "timeout"
        })
        
        logger.info(f"Call {call_id} missed (timeout)")


async def answer_call(call_id: str, user_id: str, accept: bool) -> dict:
    """
    Answer or reject an incoming call.
    
    Args:
        call_id: The call to answer
        user_id: User answering (must be callee)
        accept: True to accept, False to reject
    
    Returns:
        Call status dict
    """
    call_data = await _get_call(call_id)
    
    if not call_data:
        return {"error": "Call not found", "call_id": call_id}
    
    if call_data["callee_id"] != user_id:
        return {"error": "Not authorized to answer this call", "call_id": call_id}
    
    if call_data["status"] != CallStatus.RINGING.value:
        return {"error": f"Call is not ringing (status: {call_data['status']})", "call_id": call_id}
    
    now = datetime.utcnow()
    
    if accept:
        call_data["status"] = CallStatus.CONNECTING.value
        call_data["answered_at"] = now.isoformat()
        await _save_call(call_id, call_data)
        
        # Notify caller that call was accepted
        await manager.send_personal(call_data["caller_id"], {
            "type": "call_accepted",
            "call_id": call_id,
            "callee_id": user_id
        })
        
        logger.info(f"Call {call_id} accepted by {user_id}")
        return {"call_id": call_id, "accepted": True, "status": "connecting"}
    else:
        call_data["status"] = CallStatus.REJECTED.value
        call_data["ended_at"] = now.isoformat()
        call_data["end_reason"] = "rejected"
        await _save_call(call_id, call_data)
        
        # Notify caller that call was rejected
        await manager.send_personal(call_data["caller_id"], {
            "type": "call_rejected",
            "call_id": call_id,
            "callee_id": user_id
        })
        
        logger.info(f"Call {call_id} rejected by {user_id}")
        return {"call_id": call_id, "accepted": False, "status": "rejected"}


async def end_call(call_id: str, user_id: str, reason: str = "hangup") -> dict:
    """
    End an active call.
    
    Args:
        call_id: The call to end
        user_id: User ending the call
        reason: Why the call ended (hangup, error, etc.)
    
    Returns:
        Call summary dict
    """
    call_data = await _get_call(call_id)
    
    if not call_data:
        return {"error": "Call not found", "call_id": call_id}
    
    # Verify user is part of the call
    if user_id not in [call_data["caller_id"], call_data["callee_id"]]:
        return {"error": "Not authorized to end this call", "call_id": call_id}
    
    now = datetime.utcnow()
    call_data["status"] = CallStatus.ENDED.value
    call_data["ended_at"] = now.isoformat()
    call_data["end_reason"] = reason
    
    # Calculate duration if call was answered
    if call_data.get("answered_at"):
        answered = datetime.fromisoformat(call_data["answered_at"])
        call_data["duration_seconds"] = int((now - answered).total_seconds())
    
    await _save_call(call_id, call_data)
    
    # Notify the other party
    other_user = call_data["callee_id"] if user_id == call_data["caller_id"] else call_data["caller_id"]
    await manager.send_personal(other_user, {
        "type": "call_ended",
        "call_id": call_id,
        "ended_by": user_id,
        "reason": reason,
        "duration_seconds": call_data["duration_seconds"]
    })
    
    logger.info(f"Call {call_id} ended by {user_id}, duration: {call_data['duration_seconds']}s")
    
    return {
        "call_id": call_id, 
        "status": "ended",
        "duration_seconds": call_data["duration_seconds"],
        "ended_by": user_id
    }


async def send_webrtc_signal(
    call_id: str, 
    from_user: str, 
    to_user: str, 
    signal_type: str, 
    signal_data: dict
) -> dict:
    """
    Relay WebRTC signaling data between peers.
    
    Signal types:
    - offer: SDP offer from caller
    - answer: SDP answer from callee
    - ice-candidate: ICE candidate for NAT traversal
    - renegotiate: Request to renegotiate connection
    
    Args:
        call_id: The call this signal belongs to
        from_user: User sending the signal
        to_user: User receiving the signal
        signal_type: Type of WebRTC signal
        signal_data: The actual signal payload
    
    Returns:
        Status dict
    """
    call_data = await _get_call(call_id)
    
    if not call_data:
        return {"error": "Call not found", "status": "failed"}
    
    # Verify users are part of the call
    if from_user not in [call_data["caller_id"], call_data["callee_id"]]:
        return {"error": "Not authorized", "status": "failed"}
    
    if to_user not in [call_data["caller_id"], call_data["callee_id"]]:
        return {"error": "Invalid recipient", "status": "failed"}
    
    # Store ICE candidates for late-joining/reconnection
    if signal_type == "ice-candidate":
        if from_user == call_data["caller_id"]:
            call_data["caller_candidates"].append(signal_data)
        else:
            call_data["callee_candidates"].append(signal_data)
        await _save_call(call_id, call_data)
    
    # Update call status on offer/answer
    if signal_type == "offer":
        call_data["status"] = CallStatus.CONNECTING.value
        await _save_call(call_id, call_data)
    elif signal_type == "answer":
        call_data["status"] = CallStatus.ACTIVE.value
        await _save_call(call_id, call_data)
    
    # Relay signal to recipient
    await manager.send_personal(to_user, {
        "type": f"webrtc_{signal_type}",
        "call_id": call_id,
        "from_user": from_user,
        "signal_data": signal_data,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    logger.debug(f"WebRTC signal {signal_type} relayed: {from_user} -> {to_user}")
    return {"status": "sent", "signal_type": signal_type}


async def get_call_status(call_id: str) -> Optional[dict]:
    """Get current status of a call."""
    call_data = await _get_call(call_id)
    if not call_data:
        return None
    
    return {
        "call_id": call_data["id"],
        "status": call_data["status"],
        "call_type": call_data["call_type"],
        "caller_id": call_data["caller_id"],
        "callee_id": call_data["callee_id"],
        "started_at": call_data["started_at"],
        "answered_at": call_data.get("answered_at"),
        "duration_seconds": call_data.get("duration_seconds", 0)
    }


async def get_ice_candidates(call_id: str, for_user: str) -> list:
    """
    Get stored ICE candidates for a user.
    Useful when reconnecting or joining late.
    """
    call_data = await _get_call(call_id)
    if not call_data:
        return []
    
    # Return the OTHER user's candidates
    if for_user == call_data["caller_id"]:
        return call_data.get("callee_candidates", [])
    else:
        return call_data.get("caller_candidates", [])
