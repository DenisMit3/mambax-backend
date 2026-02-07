# MambaX API Reference

## Authentication
MambaX uses Bearer Token authentication. All requests to protected endpoints must include the `Authorization` header.

```http
Authorization: Bearer <access_token>
```

The standard flow is:
1.  **Phone Login**: POST `/auth/phone/login` -> Request OTP
2.  **Verify OTP**: POST `/auth/phone/verify` -> Receive `access_token` and `refresh_token`

## Global System

### Feature Flags & Configuration
The system uses Feature Flags to toggle functionality dynamically.

*   `GET /admin/system/config`: Get global system configuration (limits, contact info).
*   `GET /admin/system/feature-flags`: List all feature flags (Admin only).
*   `GET /ux/incognito/status`: Check status of VIP Incognito mode (User facing).

**Common Feature Keys:**
*   `incognito_mode`: Enables visibility controls.
*   `undo_swipe`: Allows undoing the last left swipe.
*   `boost_profile`: Enables profile boosting mechanism.
*   `notifications`: Global toggle for push notifications.
*   `voice_messages`: Enables voice messages in chat.

## UX Features (User Experience)

### Discovery & Radar
*   `POST /discovery/discover`: Main endpoint for finding profiles with filters.
    *   Parameters: `age_min`, `age_max`, `distance_km`, `gender`, `interests`.
*   Note: **Radar** functionality is accessed via the standard discovery API with specific frontend visualization.

### Interactions
*   `POST /interact/swipe`: Swipe right (like), left (pass), or superlike.
*   `GET /users/me/likes-received`: List users who liked you (VIP sees clear photos).

### VIP Features
Access to these endpoints requires VIP subscription and the feature flag enabled.
*   `POST /ux/incognito/enable`: Turn on Incognito.
*   `POST /ux/undo`: Refund last swipe.
*   `POST /ux/boost/activate`: Activate profile boost (costs stars).

## Chat & Realtime

### WebSocket
The primary realtime channel is via WebSocket:
`ws://<host>/api/chat/ws/{token}`

**Events:**
*   `message`: Standard text/media message.
*   `typing`: Typing indicator status.
*   `read`: Read receipt acknowledgment.
*   `call`: WebRTC signaling.
*   `qotd_both_answered`: Both partners answered Question of the Day (payload: `match_id`).
*   `badge_earned`: User earned a gamification badge (payload: `badge`, `title`).

### Chat REST Endpoints

#### Icebreakers & Prompts
*   **GET /chat/icebreakers** — AI-generated icebreakers for a match (cached 24h).
    *   Query: `match_id` (required), `refresh` (optional, bypass cache).
    *   Response: `{"icebreakers": ["...", "...", "..."]}`

*   **POST /chat/icebreakers/used** — Record that user used an icebreaker (for badge progress).
    *   Query: `match_id` (required).
    *   Response: `{"status": "ok"}`

*   **GET /chat/conversation-prompts** — Prompts to restart a stalled conversation (if last message > 24h).
    *   Query: `match_id` (required).
    *   Response: `{"prompts": ["...", "...", "..."], "stalled": true|false}`

#### Question of the Day
*   **GET /chat/question-of-day** — Today's question (cached 24h globally).
    *   Response: `{"question": "...", "date": "YYYY-MM-DD"}`

*   **POST /chat/question-of-day/answer** — Save QOTD answer; notifies both users if partner also answered.
    *   Body: `{"match_id": "...", "answer": "..."}`.
    *   Response: `{"status": "saved", "partner_answered": true|false}`

### Media Upload
*   `POST /chat/upload`: Upload media for chat (photos/voice).

## Security & Moderation
*   All user content is automatically moderated via **AutoMod Service**.
*   Rate Limits are enforced:
    *   Global API: 60-120 req/min
    *   Auth: 5 req/min
    *   Swipes: 100/day (Free tier)
*   User data deletion is GDPR compliant via `POST /ux/account/delete`.
