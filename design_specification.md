# Dating Platform Design Specification

## 1. Product Model

### 1.1 Mission
To create a safe, intelligent, and respectful dating ecosystem where AI helps bridge the gap between digital matching and real-world connection, minimizing "dating fatigue" and maximizing compatibility.

### 1.2 Target Audience (5 Segments)
| Segment | Age | Characteristics | Needs |
| :--- | :--- | :--- | :--- |
| **Young Professionals** | 25-35 | Career-focused, limited time, high standards. | Efficiency, verify profiles, quality over quantity. |
| **Relation-Seekers** | 30-45 | Looking for long-term commitment, potentially post-divorce. | Deep compatibility info, safety, privacy. |
| **Gen Z "Vibes"** | 18-24 | Visual-first, values authenticity and shared interests. | Gamification, video snippets, non-cringe interaction. |
| **Relocators / Expats** | 20-40 | New in town, looking for locals or other expats. | Geo-features, language exchange filters, "guide" mode. |
| **Introverts** | All | Find initiating conversation difficult. | AI icebreakers, guided flows, low-pressure matching. |

### 1.3 User Journey (Core)
1.  **Onboarding**: Sign up via OTP -> AI Chatbot Interview (instead of boring forms) to build profile -> Face Verification (Liveness check).
2.  **Discovery**: View AI-curated "Daily Picks" + Explore Feed (Swipe/Scroll) -> Apply Constraints (Filters).
3.  **Matching**: Mutual Like -> "Match" Screen with immediate Action Call (e.g., "Ask about their trip to Bali").
4.  **Connection**: Chat initiated -> AI suggests topic -> Voice Note / Video Call -> Date arranged.
5.  **Retention/Monetization**: Run out of likes -> Purchase Boost/Premium for better matches -> Success.

### 1.4 Feature Map
| Feature | MVP | Phase 2 | Phase 3 |
| :--- | :---: | :---: | :---: |
| **Registration** | Phone, Google/Apple, Basic Photos | Instagram Integration, Spotify Sync | Behavioral Verification |
| **Matching** | Geo + Age + Basic Tags, Swipes | Collaborative Filtering, Compatibility % | AI "Dating Concierge" |
| **Communication** | Text Chat, Image Sending | Voice Messages, Video Calls, Reactions | Real-time translation, AI Scheduling |
| **Profile** | Bio, Photos, Details | Video Avatars, Personality Quiz | AR Effects, Profile Verification History |
| **Monetization** | Subscriptions (Gold), Boosts | Virtual Gifts, "Super DM" | Offline Event Tickets, Merch |

---

## 2. Functionality Specifications

### 2.1 Registration & Authorization
*   **Methods**: Mobile Phone (SMS/WhatsApp OTP), Google, Apple ID. *No email-only registration to reduce spam.*
*   **Anti-Bot**: 
    *   ReCAPTCHA v3 (invisible).
    *   Device Fingerprinting (prevent multi-account farms).
*   **Verification**: Mandatory "Selfie with gesture" (AI analyzed) to get a "Verified" badge. Unverified profiles have limited visibility.

### 2.2 User Profile
*   **Media**: Max 6 photos, 1 video loop (15s). Automated NSFW detection on upload.
*   **Deep Profile**: "Tags" for interests. "Prompts" (e.g., "My Sunday looks like...") instead of just a bio text box.
*   **Privacy**: 
    *   *Default*: Visible to matching algorithm.
    *   *Incognito*: Only visible to people I like.
    *   *Blur Photos*: Photos blurred until match (opt-in feature).

### 2.3 Search & Recommendations
*   **Discovery Engines**:
    1.  *Near Me*: Geolocation radius.
    2.  *Compatible*: Weighted score based on interests, behavioral data, and "lookalike" preferences.
*   **Filters**: Height, Education, Habits (Smoking/Drinking), Kids, Religion, Politics.

### 2.4 Interaction
*   **Mechanics**: Vertical Scroll (TikTok style) or Card Swipe (Tinder style).
*   **Messaging**:
    *   Text, Gifs (Giphy), Voice Notes.
    *   *Ephemeral Mode*: Photos disappear after viewing (optional).
    *   *Reaction*: Like specific messages.

### 2.5 AI Modules (The "Secret Sauce")
*   **Icebreaker AI**: Scans both profiles and suggests 3 context-aware opening lines upon matching.
*   **Safety Sentinel**: Real-time harassment detection in chat. Prompts "Are you sure you want to send this?" for toxic messages.
*   **Compatibility Analyst**: "You match 85% because you both like Hiking and Jazz."

### 2.6 Monetization
*   **Free**: Limited swipes (~50/day), basic filters, chat with matches.
*   **Premium (Gold)**: Unlimited swipes, travel mode (change location), see who likes you, advanced filters.
*   **VIP (Platinum)**: Priority listing (shown first), "Message before match" (1/day), Incognito mode.
*   **Consumables**: "Boost" (30 min visibility spike), "Super Likes".

### 2.7 Security
*   **Moderation**: Hybrid (AI Pre-moderation for images + Human review for reports).
*   **Shadowban**: Spammers interact but nobody sees them.
*   **Blocking**: IP + Device ID blocking for repeat offenders.

---

## 3. UX / UI Design

### 3.1 Structure
*   **Bottom Navigation**: `[Discover] -- [Search/Map] -- [Likes/Activity] -- [Chats] -- [Profile]`
*   **Key Screens**:
    *   *Discover*: Full-screen user cards. High-quality imagery. Floating action buttons (Pass, Like, Super Like).
    *   *Chat*: Clean, bubble interface. "Safety Shield" icon top right.
    *   *Paywall*: Non-intrusive. Appears when hitting limits, showing clear value prop comparison.

### 3.2 UX Improvements vs Mamba
1.  **Reduced Noise**: strict limits on unsolicited messages. "Message requests" folder for non-matches (if allowed).
2.  **Contextual Onboarding**: Instead of a 50-field form, ask questions progressively as the user uses the app ("Do you smoke?" asks the card stack occasionally).
3.  **Visual Feedback**: Haptic feedback on likes. Micro-animations when a match occurs (confetti/vibration).
4.  **Anti-Ghosting**: If a match is inactive for 14 days, the chat is archived or the user is prompted to "Unmatch or Say Hi".

---

## 4. Technical Architecture

### 4.1 Backend
*   **Language**: Go (Golang) for high concurrency and performance (matching engine, websocket gateway) AND/OR Python (FastAPI/Django) for business logic and AI integration.
*   **Architecture**: Microservices per domain (`Auth Service`, `Profile Service`, `Matching Service`, `Chat Service`, `Payment Service`).
*   **Communication**: gRPC for internal service-to-service, GraphQL for Client-Gateway efficiency (fetching complex profile data), WebSockets for Chat.

### 4.2 Database
*   **Primary (OLTP)**: PostgreSQL. Robust, supports JSONB for flexible profile attributes.
    *   `users`: uuid, phone_hash, status.
    *   `profiles`: user_id, bio, preferences_json.
    *   `media`: user_id, s3_url, type.
*   **Matching/Search**: Elasticsearch (or OpenSearch) for complex filtering. Qdrant/Milvus (Vector DB) for embedding-based similarity matching (AI).
*   **Cache/Session**: Redis (Cluster). Storing active sessions, online status, swipe limits.
*   **Chat History**: ScyllaDB or Cassandra (Write-heavy, time-series data).

### 4.3 Frontend
*   **Web**: Next.js (React) + TypeScript. SSR for SEO (landing pages) and performance.
*   **Mobile**: Flutter or React Native. "Write once, deploy everywhere" but with native performance focus.
*   **State Management**: Zustand or TanStack Query.

### 4.4 AI Stack
*   **LLM**: OpenAI GPT-4o-mini or specialized local LLM (Llama 3) for chat assistance and bio generation.
*   **Computer Vision**: Amazon Rekognition or Google Vision API for NSFW and Face Verification.
*   **Recommendation**: Collaborative filtering algorithm + Vector similarity (FAISS/Annoy).

---

## 5. Analytics & KPI

### 5.1 Key Metrics
*   **North Star**: **Liquidity** (Access to matches). Defined as: % of users who get > 1 match in first 24h.
*   **Acquisition**: CAC, CPI (Cost per Install).
*   **Engagement**: DAU/MAU ratio (Stickiness), Average Session Time, Swipes per Session.
*   **Monetization**: ARPU, ARPPU, LTV, Conversion Rate (Free -> Paid).

### 5.2 Funnels
1.  **Reg Funnel**: Install -> Phone Input -> OTP Verified -> Profile Completed -> First Swipe.
2.  **Match Funnel**: Swipe -> Match -> First Message -> Reply -> Conversation (>5 msgs).

---

## 6. Risk Analysis

### 6.1 Legal & Ethical
*   **GDPR/CCPA**: Minimal data retention. Right to be forgotten.
*   **Safety**: Risk of predators/scammers. Mitigation: Mandatory ID verification for certain tiers, high-alert moderation.

### 6.2 Technical
*   **Scaling**: WebSocket explosion with millions of concurrent users. Mitigation: Horizontal scaling of WS gateway, optimized protocol (Protobuf).
*   **Latency**: Geographically distributed users. Mitigation: CDN (Cloudflare) for media, Edge functions.

### 6.3 Product
*   **Chicken & Egg Problem**: Platform is useless without users. Mitigation: Launch city-by-city or niche-by-niche (e.g., "Students of X University" first).
