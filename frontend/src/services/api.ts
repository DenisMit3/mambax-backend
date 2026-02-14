/**
 * API Service
 */

import { httpClient } from "@/lib/http-client";

interface AuthResponse {
    access_token: string;
    token_type: string;
    has_profile: boolean;
    is_new_user: boolean;
    user?: UserProfile;
}

interface PhotoUploadResponse {
    photos: string[];
}

export interface MatchUser {
    id: string;
    name: string;
    age: number;
    photos: string[];
    bio?: string;
    is_verified: boolean;
    online_status?: "online" | "offline";
    last_seen?: string;
    city?: string;
}

export interface MatchMessage {
    id: string;
    text: string;
    sender_id: string;
    created_at: string;
}

export interface Match {
    id: string;
    user: MatchUser;
    last_message?: MatchMessage;
    current_user_id?: string;
    user1_id?: string;
    user2_id?: string;
    created_at?: string;
}

interface MatchesResponse {
    matches: Match[];
}

export interface VirtualGiftTransaction {
    id: string;
    from_user_id: string;
    from_user_name?: string;
    from_user_photo?: string;
    to_user_id: string;
    gift_type: string;
    gift_name: string;
    gift_image_url?: string;
    message?: string;
    stars_cost: number;
    is_read: boolean;
    created_at: string;
}

interface GiftListResponse {
    gifts: VirtualGiftTransaction[];
    total: number;
    page?: number;
    pages?: number;
    unread_count?: number;
    total_spent?: number;
}

export type UserRole = 'user' | 'moderator' | 'admin';
export type SubscriptionTier = 'free' | 'plus' | 'premium' | 'vip';
export type Gender = 'male' | 'female' | 'other';

export interface UserLocation {
    lat: number;
    lon: number;
}

export interface UserProfile {
    id: string;
    telegram_id?: string;
    username?: string;
    name: string;
    age: number;
    gender: Gender;
    bio?: string;
    photos: string[];
    interests: string[];
    location?: UserLocation;
    city?: string;

    // Status flags
    is_verified: boolean;
    is_active: boolean;
    is_complete?: boolean;
    verification_selfie?: string;
    online_status?: 'online' | 'offline';
    last_seen?: string;

    // Meta
    role: UserRole;
    subscription_tier: SubscriptionTier;
    stars_balance: number;
    created_at: string;

    // Feed specific
    distance_km?: number;
    compatibility_score?: number;

    // Gamification
    achievements?: { badge: string; earned_at: string; level: number }[];

    // Extended profile info
    work?: string;
    education?: string;
    gifts_received?: number;

    // UX Preferences
    ux_preferences?: {
        sounds_enabled: boolean;
        haptic_enabled: boolean;
        reduced_motion: boolean;
    };

    // Onboarding tracking
    onboarding_completed_steps?: Record<string, boolean>;
}

export interface GiftCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
}

export interface VirtualGift {
    id: string;
    name: string;
    description: string;
    image_url: string;
    animation_url: string | null;
    price: number;
    currency: string;
    is_animated: boolean;
    is_premium: boolean;
    is_limited: boolean;
    is_active: boolean;
    available_until: string | null;
    max_quantity: number | null;
    times_sent: number;
    category_id: string | null;
    sort_order: number;
}

export interface CatalogResponse {
    categories: GiftCategory[];
    gifts: VirtualGift[];
}

export interface GiftPurchaseResponse {
    status: string;
    transaction_id: string;
    invoice_link?: string;
    payment_id?: string;
}

export interface VapidKeyResponse {
    publicKey: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
    has_more: boolean;
    next_cursor?: string;
}

export const authService = {
    async login(phone: string, otp: string) {
        const data = await httpClient.post<AuthResponse>("/api/auth/login", { identifier: phone, otp }, { skipAuth: true });
        if (typeof window !== 'undefined' && data.access_token) {
            httpClient.setToken(data.access_token);
        }
        return data;
    },

    /**
     * Admin login with email and password
     * Used by the admin panel gatekeeper
     */
    async adminLogin(email: string, password: string) {
        const data = await httpClient.post<AuthResponse>("/api/auth/login/email", { email, password }, { skipAuth: true });
        if (typeof window !== 'undefined' && data.access_token) {
            httpClient.setToken(data.access_token);
        }
        return data;
    },

    async requestOtp(phone: string) {
        return httpClient.post("/api/auth/request-otp", { identifier: phone }, { skipAuth: true });
    },

    async telegramLogin(initData: string) {
        console.log('[AUTH-FLOW] api.telegramLogin: calling /api/auth/telegram, initData length=', initData.length);
        const data = await httpClient.post<AuthResponse>("/api/auth/telegram", { init_data: initData }, { skipAuth: true });
        console.log('[AUTH-FLOW] api.telegramLogin: response:', JSON.stringify({ has_token: !!data.access_token, has_profile: data.has_profile }));
        if (typeof window !== 'undefined' && data.access_token) {
            httpClient.setToken(data.access_token);
            console.log('[AUTH-FLOW] api.telegramLogin: token saved to localStorage');
        }
        return data;
    },

    async createProfile(data: { name: string; age: number; gender: string; photos?: string[]; interests: string[] }) {
        // Use PUT /api/users/me to update/complete the profile since user is already created at auth
        return httpClient.put("/api/users/me", data);
    },

    async updateProfile(data: {
        name?: string;
        age?: number;
        bio?: string;
        gender?: string;
        interests?: string[];
        photos?: string[];
        city?: string;
        height?: number;
        smoking?: string;
        drinking?: string;
        education?: string;
        looking_for?: string;
        children?: string;
        job?: string;
        zodiac?: string;
        personality_type?: string;
        love_language?: string;
        pets?: string;
        ideal_date?: string;
        intent?: string;
        ux_preferences?: {
            sounds_enabled: boolean;
            haptic_enabled: boolean;
            reduced_motion: boolean;
        }
    }) {
        return httpClient.put("/api/users/me", data);
    },



    async getProfiles(params?: { lat?: number; lon?: number; limit?: number }) {
        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', String(params.limit));
        else query.append('limit', '10');

        if (params?.lat !== undefined) query.append('lat', String(params.lat));
        if (params?.lon !== undefined) query.append('lon', String(params.lon));

        // Backend currently returns PaginatedResponse, but we support array fallback in clients just in case
        return httpClient.get<PaginatedResponse<UserProfile>>(`/api/feed?${query.toString()}`);
    },

    async getMe() {
        return httpClient.get<UserProfile>("/api/users/me");
    },

    // --- Интересы ---
    async getInterestCategories() {
        return httpClient.get<{ categories: { name: string; interests: string[] }[] }>("/api/interests/categories");
    },

    async updateInterests(interests: string[]) {
        return httpClient.put<{ status: string; interests: string[] }>("/api/interests", { interests });
    },

    async deleteAccount() {
        return httpClient.delete("/api/users/me");
    },

    async exportData() {
        return httpClient.get("/api/users/me/export");
    },

    async getLikesReceived() {
        return httpClient.get<{ likes: { id: string; user: MatchUser; created_at: string; is_super: boolean }[]; total: number }>("/api/users/me/likes-received");
    },

    async getUser(userId: string) {
        return httpClient.get<UserProfile>(`/api/users/${userId}`);
    },

    async uploadPhoto(file: File) {
        const formData = new FormData();
        formData.append("file", file);

        // HttpClient now handles FormData Content-Type automatically (by NOT setting it, letting browser set boundary)
        const data = await httpClient.post<PhotoUploadResponse>("/api/users/me/photo", formData);

        // Return the last uploaded photo url
        const url = data.photos && data.photos.length > 0 ? data.photos[data.photos.length - 1] : "";
        return { url };
    },

    async uploadChatMedia(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        return httpClient.post("/api/chat/upload", formData);
    },

    async likeUser(userId: string, isSuper: boolean = false) {
        return httpClient.post("/api/likes", { liked_user_id: userId, is_super: isSuper });
    },

    async swipe(userId: string, action: 'like' | 'dislike' | 'superlike') {
        return httpClient.post("/api/swipe", { to_user_id: userId, action });
    },

    async getVapidKey() {
        return httpClient.get<VapidKeyResponse>("/api/notifications/vapid-public-key", { skipAuth: true });
    },

    async subscribePush(subscription: { endpoint: string, keys: { p256dh: string, auth: string } }) {
        return httpClient.post("/api/notifications/subscribe", subscription);
    },

    async startChat(userId: string): Promise<{ match_id: string; is_new: boolean }> {
        return httpClient.post<{ match_id: string; is_new: boolean }>(`/api/chat/start/${userId}`);
    },

    async getMatches() {
        const data = await httpClient.get<MatchesResponse | { matches: Match[] }>("/api/matches");
        // Handle potential backend structure variations if any, but assuming matches array
        if ('matches' in data) {
            return data.matches;
        }
        return data as unknown as Match[];
    },

    async getMatch(matchId: string): Promise<Match> {
        return httpClient.get<Match>(`/api/matches/${matchId}`);
    },

    async getMessages(matchId: string) {
        return httpClient.get(`/api/matches/${matchId}/messages`);
    },

    async getIcebreakers(matchId: string, refresh = false) {
        const params = new URLSearchParams({ match_id: matchId });
        if (refresh) params.set("refresh", "true");
        return httpClient.get<{ icebreakers: string[] }>(`/api/chat/icebreakers?${params}`);
    },

    async recordIcebreakerUsed(matchId: string) {
        return httpClient.post(`/api/chat/icebreakers/used?match_id=${encodeURIComponent(matchId)}`);
    },

    async getConversationPrompts(matchId: string) {
        return httpClient.get<{ prompts: string[]; stalled: boolean }>(`/api/chat/conversation-prompts?match_id=${encodeURIComponent(matchId)}`);
    },

    async getQuestionOfDay() {
        return httpClient.get<{ question: string; date: string }>("/api/chat/question-of-day");
    },

    async postQuestionOfDayAnswer(matchId: string, answer: string) {
        return httpClient.post<{ status: string; partner_answered: boolean }>("/api/chat/question-of-day/answer", { match_id: matchId, answer });
    },

    async sendMessage(matchId: string, text: string, type: string = "text", audio_url: string | null = null, duration: string | null = null) {
        return httpClient.post("/api/chat/send", {
            match_id: matchId,
            text,
            type,
            media_url: audio_url,
            duration: duration ? parseInt(duration as string) : undefined
        });
    },

    async updateLocation(lat: number, lon: number) {
        try {
            await httpClient.post("/api/location", { lat, lon });
        } catch (e) {
            console.error("Failed to update location", e);
        }
    },

    async blockUser(userId: string, reason?: string) {
        return httpClient.post("/api/safety/block", { user_id: userId, reason });
    },

    async reportUser(userId: string, reason: string, description?: string) {
        return httpClient.post("/api/safety/report", { user_id: userId, reason, description });
    },

    async rewindLastSwipe() {
        return httpClient.post("/api/undo-swipe");
    },

    async addStarsDev(amount: number) {
        return httpClient.post("/api/users/me/add-stars-dev", { amount });
    },

    async spendStarsDev(amount: number) {
        return httpClient.post("/api/users/me/spend-stars-dev", { amount });
    },

    async getAnalytics() {
        return httpClient.get<{
            profileViews: { total: number; change: number; chartData: { date: string; views: number }[] };
            likes: { received: number; sent: number; matches: number; changeReceived: number; changeSent: number; changeMatches: number };
            superLikes: { received: number; sent: number; changeReceived: number; changeSent: number };
            messages: { sent: number; received: number; responseRate: number; changeSent: number; changeReceived: number; changeResponseRate: number };
            peakActivity: { day: string; hour: string; engagement: number };
            demographics: { ageGroups: { range: string; percentage: number }[]; locations: { city: string; percentage: number }[] };
        }>("/api/analytics/profile");
    },

    // ============================================
    // VIRTUAL GIFTS API
    // ============================================

    async getGiftsCatalog(categoryId?: string, includePremium: boolean = true) {
        const params = new URLSearchParams();
        if (categoryId) params.append("category_id", categoryId);
        params.append("include_premium", String(includePremium));

        return httpClient.get<CatalogResponse>(`/api/gifts/catalog?${params}`);
    },

    async sendGift(giftId: string, receiverId: string, message?: string, isAnonymous: boolean = false) {
        return httpClient.post("/api/gifts/send", {
            gift_id: giftId,
            receiver_id: receiverId,
            message,
            is_anonymous: isAnonymous
        });
    },

    async getReceivedGifts(limit: number = 20, offset: number = 0, unreadOnly: boolean = false) {
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
            unread_only: String(unreadOnly)
        });
        return httpClient.get<GiftListResponse>(`/api/gifts/received?${params}`);
    },

    async getSentGifts(limit: number = 20, offset: number = 0) {
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset)
        });
        return httpClient.get<GiftListResponse>(`/api/gifts/sent?${params}`);
    },

    async markGiftAsRead(transactionId: string) {
        return httpClient.post("/api/gifts/mark-read", { transaction_id: transactionId });
    },

    async sendGiftDirectPurchase(giftId: string, receiverId: string, message?: string, isAnonymous?: boolean) {
        return httpClient.post<GiftPurchaseResponse>("/admin/monetization/payments/gift", {
            gift_id: giftId,
            receiver_id: receiverId,
            message,
            is_anonymous: isAnonymous
        });
    },

    // ============================================
    // MONETIZATION API
    // ============================================

    async createInvoice(amount: number, label: string) {
        // Используем основной payments endpoint из monetization router
        return httpClient.post<{ invoice_link: string; transaction_id: string; amount: number }>(
            "/api/payments/top-up",
            { amount, label }
        );
    },

    async buySubscription(tier: string) {
        return httpClient.post("/api/payments/subscription", { tier });
    },

    async completeOnboardingStep(stepName: string, completed: boolean = true) {
        return httpClient.post("/api/users/me/onboarding/complete-step", {
            step_name: stepName,
            completed
        });
    },

    async getOnboardingStatus() {
        return httpClient.get<{
            completed_steps: Record<string, boolean>;
            is_onboarding_complete: boolean;
        }>("/api/users/me/onboarding/status");
    },

    async resetOnboarding() {
        return httpClient.post("/api/users/me/onboarding/reset");
    },

    // ============================================
    // SETTINGS API
    // ============================================

    // Notification Settings
    async getNotificationSettings() {
        return httpClient.get("/api/ux/notifications/settings");
    },

    async updateNotificationSettings(settings: {
        new_match?: boolean;
        new_message?: boolean;
        new_like?: boolean;
        super_like?: boolean;
        profile_view?: boolean;
        match_reminder?: boolean;
        promotion?: boolean;
    }) {
        return httpClient.put("/api/ux/notifications/settings", settings);
    },

    // Visibility Settings
    async getVisibilitySettings() {
        return httpClient.get("/api/ux/visibility");
    },

    async updateVisibilitySettings(settings: {
        show_online_status?: boolean;
        show_last_seen?: boolean;
        show_distance?: boolean;
        show_age?: boolean;
        read_receipts?: boolean;
    }) {
        return httpClient.put("/api/ux/visibility", settings);
    },

    // Incognito Mode
    async getIncognitoStatus() {
        return httpClient.get("/api/ux/incognito/status");
    },

    async enableIncognito() {
        return httpClient.post("/api/ux/incognito/enable");
    },

    async disableIncognito() {
        return httpClient.post("/api/ux/incognito/disable");
    },

    // 2FA
    async get2FAStatus() {
        return httpClient.get<{ enabled: boolean }>("/api/2fa/status");
    },

    async enable2FA(method: 'telegram' | 'email' = 'telegram') {
        return httpClient.post("/api/2fa/enable", null, { params: { method } });
    },

    async disable2FA() {
        return httpClient.post("/api/2fa/disable");
    },

    async verify2FA(sessionId: string, code: string) {
        return httpClient.post("/api/2fa/verify", { session_id: sessionId, code });
    },

    // Blocked Users
    async getBlockedUsers() {
        return httpClient.get<{ blocked_users: Array<{ id: string; name: string; photo_url?: string; blocked_at: string }>; count: number }>("/api/blocked");
    },

    async unblockUser(userId: string) {
        return httpClient.post("/api/unblock", { user_id: userId });
    },

    // Devices
    async getDevices() {
        return httpClient.get<{ devices: Array<{ id: string; user_agent: string; platform?: string; last_active: string }>; count: number }>("/api/devices");
    },

    // Account Deletion (graceful)
    async getDeletionReasons() {
        return httpClient.get<{ reasons: Array<{ value: string; label: string; emoji: string }> }>("/api/ux/account/delete/reasons");
    },

    async requestAccountDeletion(reason: string, feedback?: string) {
        return httpClient.post("/api/ux/account/delete", { reason, feedback });
    },

    async cancelAccountDeletion() {
        return httpClient.post("/api/ux/account/delete/cancel");
    },

    async getDeletionStatus() {
        return httpClient.get("/api/ux/account/delete/status");
    },

    // Pricing
    async getPricing() {
        return httpClient.get("/api/payments/pricing");
    },

    // Smart Filters
    async getSmartFilters() {
        return httpClient.get("/api/discover/smart-filters");
    },

    // ============================================
    // REFERRAL SYSTEM API
    // ============================================

    async getReferralCode() {
        return httpClient.get<{ code: string; link: string; reward: string }>("/api/referral/code");
    },

    async getReferralStats() {
        return httpClient.get<{ total_referrals: number; earned_stars: number; pending_rewards: number }>("/api/referral/stats");
    },

    async applyReferralCode(code: string) {
        return httpClient.post<{ success: boolean; bonus: number; message: string }>("/api/referral/apply", { code });
    },

    // ============================================
    // DAILY REWARDS API
    // ============================================

    async getDailyRewardStatus() {
        return httpClient.get<{
            can_claim: boolean;
            streak: number;
            today_reward: number;
            next_reward: number;
            rewards_schedule: number[];
        }>("/api/rewards/daily");
    },

    async claimDailyReward() {
        return httpClient.post<{
            success: boolean;
            reward: number;
            new_streak: number;
            new_balance: number;
        }>("/api/rewards/daily/claim");
    },

    // ============================================
    // VIEWS API
    // ============================================

    async getWhoViewedMe(limit: number = 20) {
        return httpClient.get<{
            viewers: { id: string; name: string; age: number; photo: string; viewed_at: string; is_online: boolean }[];
            total: number;
            is_vip: boolean;
            message?: string;
        }>(`/api/views/who-viewed-me?limit=${limit}`);
    },

    // ============================================
    // COMPATIBILITY API
    // ============================================

    async getCompatibility(userId: string) {
        return httpClient.get<{
            score: number;
            breakdown: { interests: number; age: number; location: number; activity: number };
            tips: string[];
        }>(`/api/compatibility/${userId}`);
    },

    // ============================================
    // PROFILE PROMPTS API (Hinge-style Q&A)
    // ============================================

    async getAvailablePrompts() {
        return httpClient.get<{ prompts: { id: string; text: string }[] }>("/api/prompts");
    },

    async savePromptAnswer(promptId: string, answer: string) {
        return httpClient.post<{ status: string; prompts: Record<string, string> }>("/api/prompts/answer", {
            prompt_id: promptId,
            answer,
        });
    },

    async getMyPrompts() {
        return httpClient.get<{ prompts: Record<string, string> }>("/api/prompts/my");
    },

    // ============================================
    // MATCHING PREFERENCES API
    // ============================================

    async getMatchingPreferences() {
        return httpClient.get<{
            age_min: number;
            age_max: number;
            distance_km: number;
            gender_preference: string;
            show_verified_only: boolean;
        }>("/api/preferences/matching");
    },

    async updateMatchingPreferences(prefs: {
        age_min?: number;
        age_max?: number;
        distance_km?: number;
        gender_preference?: string;
        show_verified_only?: boolean;
    }) {
        return httpClient.put<{ status: string; preferences: object }>("/api/preferences/matching", prefs);
    },

    // ============================================
    // BOOST API
    // ============================================

    async getBoostStatus() {
        return httpClient.get<{
            is_active: boolean;
            remaining_minutes: number;
            is_vip: boolean;
            boost_price_per_hour: number;
        }>("/api/boost/status");
    },

    async activateBoost(durationHours: number) {
        return httpClient.post<{
            success: boolean;
            boost_until: string;
            cost: number;
            new_balance: number;
        }>("/api/boost/activate", { duration_hours: durationHours });
    },

    // ============================================
    // PAYMENT HISTORY API
    // ============================================

    async getPaymentHistory() {
        return httpClient.get<{
            payments: {
                id: string;
                type: string;
                amount: number;
                currency: string;
                status: string;
                description: string;
                created_at: string;
            }[];
        }>("/api/payments/history");
    },

    // ============================================
    // FEEDBACK API
    // ============================================

    async submitFeedback(data: { type: string; message: string; rating?: number }) {
        return httpClient.post<{ success: boolean; message: string }>("/api/feedback", data);
    },

    // ============================================
    // SPOTLIGHT API
    // ============================================

    async getSpotlightProfiles(limit: number = 10) {
        return httpClient.get<{
            profiles: {
                id: string;
                name: string;
                age: number;
                bio?: string;
                is_verified: boolean;
                photos: string[];
                compatibility_score: number;
            }[];
        }>(`/api/spotlight?limit=${limit}`);
    },

    // ============================================
    // EVENTS API
    // ============================================

    // ============================================
    // LANGUAGE API
    // ============================================

    async getLanguages() {
        return httpClient.get<{
            languages: { code: string; name: string; native_name: string }[];
        }>("/api/languages");
    },

    async setLanguage(code: string) {
        return httpClient.put<{ status: string }>("/api/settings/language", { language: code });
    },

    // ============================================
    // EVENTS API
    // ============================================

    // ============================================
    // SUPERLIKE API
    // ============================================

    async getSuperlikeInfo() {
        return httpClient.get<{
            remaining: number;
            daily_limit: number;
            is_vip: boolean;
            resets_at: string;
        }>("/api/superlike/info");
    },

    // ============================================
    // AI SUGGESTIONS API
    // ============================================

    async getSuggestions(limit: number = 5) {
        return httpClient.get<{
            suggestions: {
                id: string;
                name: string;
                age: number;
                photo: string;
                reason: string;
                compatibility_score: number;
            }[];
        }>(`/api/suggestions?limit=${limit}`);
    },

    async registerForEvent(eventId: string) {
        return httpClient.post<{ success: boolean; message: string }>(`/api/events/${eventId}/register`);
    },

    async getEvents(lat?: number, lon?: number) {
        const params = new URLSearchParams();
        if (lat !== undefined) params.append("lat", String(lat));
        if (lon !== undefined) params.append("lon", String(lon));
        const query = params.toString();
        return httpClient.get<{
            events: {
                id: string;
                title: string;
                description: string;
                date: string;
                location: string;
                image_url: string;
                attendees_count: number;
                category: string;
            }[];
            message: string;
        }>(`/api/events${query ? `?${query}` : ""}`);
    },

    // ============================================
    // SUBSCRIPTION API
    // ============================================

    async getSubscription() {
        return httpClient.get<{
            plan: string | null;
            status: "active" | "cancelled" | "expired" | null;
            expires_at: string | null;
            auto_renew: boolean;
            features: string[];
        }>("/api/subscription");
    },

    async subscribe(planId: string) {
        return httpClient.post<{ success: boolean; subscription: { plan: string; status: string; expires_at: string } }>("/api/subscription", { plan: planId });
    },

    async cancelSubscription() {
        return httpClient.post<{ success: boolean }>("/api/subscription/cancel", {});
    },

    // ============================================
    // NOTIFICATIONS API
    // ============================================

    async getNotifications(page = 1, limit = 20) {
        return httpClient.get<{
            notifications: {
                id: string;
                type: "match" | "message" | "like" | "gift" | "system" | "boost" | "superlike" | "view";
                title: string;
                body: string;
                image_url?: string;
                action_url?: string;
                is_read: boolean;
                created_at: string;
            }[];
            total: number;
            unread_count: number;
        }>(`/api/notifications?page=${page}&limit=${limit}`);
    },

    async markNotificationRead(id: string) {
        return httpClient.post<{ success: boolean }>(`/api/notifications/${id}/read`, {});
    },

    async markAllNotificationsRead() {
        return httpClient.post<{ success: boolean }>("/api/notifications/read-all", {});
    },

    // ============================================
    // HELP / SUPPORT API
    // ============================================

    async getHelpArticles(category?: string) {
        const q = category ? `?category=${category}` : "";
        return httpClient.get<{
            articles: {
                id: string;
                title: string;
                body: string;
                category: string;
            }[];
        }>(`/api/help${q}`);
    },

    async createSupportTicket(data: { subject: string; message: string; category: string }) {
        return httpClient.post<{ ticket_id: string }>("/api/support/tickets", data);
    },
};
