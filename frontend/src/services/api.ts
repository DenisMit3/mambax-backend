/**
 * API Service
 * 
 * TODO (TYPES): Replace `any` return types with proper interfaces:
 * - SwipeResponse, MessageResponse, etc.
 * - This will enable compile-time error checking and better IDE support
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

export interface Match {
    id: string;
    user: any; // Ideally typed
    last_message?: any;
    current_user_id?: string;
    user1_id?: string;
    user2_id?: string;
    created_at?: string;
}

interface MatchesResponse {
    matches: Match[];
}

interface GiftListResponse {
    gifts: any[]; // Ideally typed with VirtualGift structure
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
        if (typeof window !== 'undefined') {
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
        if (typeof window !== 'undefined') {
            httpClient.setToken(data.access_token);
        }
        return data;
    },

    async requestOtp(phone: string) {
        return httpClient.post("/api/auth/request-otp", { identifier: phone }, { skipAuth: true });
    },

    async telegramLogin(initData: string) {
        const data = await httpClient.post<AuthResponse>("/api/auth/telegram", { init_data: initData }, { skipAuth: true });
        if (typeof window !== 'undefined') {
            console.log("[Auth] Setting token from telegramLogin, has_profile:", data.has_profile);
            httpClient.setToken(data.access_token);
            // Verify token was saved
            const savedToken = localStorage.getItem('accessToken');
            console.log("[Auth] Token saved successfully:", !!savedToken);
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

    async deleteAccount() {
        return httpClient.delete("/api/users/me");
    },

    async exportData() {
        return httpClient.get("/api/users/me/export");
    },

    async getLikesReceived() {
        return httpClient.get<{ likes: any[]; total: number }>("/api/users/me/likes-received");
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
        return httpClient.post("/api/rewind");
    },

    async addStarsDev(amount: number) {
        return httpClient.post("/api/users/me/add-stars-dev", { amount });
    },

    async spendStarsDev(amount: number) {
        return httpClient.post("/api/users/me/spend-stars-dev", { amount });
    },

    async getAnalytics() {
        return httpClient.get("/api/analytics/profile");
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
        return httpClient.post<GiftPurchaseResponse>("/api/admin/monetization/payments/gift", {
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
        // httpClient добавляет baseUrl (/api_proxy), поэтому путь должен быть /api/payments/invoice
        return httpClient.post<{ invoice_link: string; transaction_id: string; amount: number; currency: string }>(
            "/api/payments/invoice",
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
    }
};
