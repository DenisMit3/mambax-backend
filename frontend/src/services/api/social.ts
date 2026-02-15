/**
 * Social API: referrals, rewards, events, stories, feedback, help, analytics, onboarding, interests, prompts, safety
 */

import { httpClient } from "@/lib/http-client";

export const socialApi = {
    // --- Referral ---
    async getReferralCode() {
        return httpClient.get<{ code: string; link: string; reward: string }>("/api/referral/code");
    },

    async getReferralStats() {
        return httpClient.get<{ total_referrals: number; earned_stars: number; pending_rewards: number }>("/api/referral/stats");
    },

    async applyReferralCode(code: string) {
        return httpClient.post<{ success: boolean; bonus: number; message: string }>("/api/referral/apply", { code });
    },

    // --- Daily Rewards ---
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

    // --- Events ---
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

    async registerForEvent(eventId: string) {
        return httpClient.post<{ success: boolean; message: string }>(`/api/events/${eventId}/register`);
    },

    // --- Stories ---
    async getStories() {
        return httpClient.get<{
            stories: {
                id: string;
                user_id: string;
                user_name: string;
                user_photo: string;
                media_url: string;
                media_type: string;
                is_viewed: boolean;
                created_at: string;
                expires_at: string;
            }[];
        }>("/api/stories");
    },

    async createStory(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        return httpClient.post<{ success: boolean; id: string; url: string }>("/api/stories", formData);
    },

    async viewStory(storyId: string) {
        return httpClient.post<{ success: boolean }>(`/api/stories/${storyId}/view`, {});
    },

    async reactToStory(storyId: string, reaction: string) {
        return httpClient.post<{ success: boolean }>(`/api/stories/${storyId}/react`, { reaction });
    },

    // --- Feedback ---
    async submitFeedback(data: { type: string; message: string; rating?: number }) {
        return httpClient.post<{ success: boolean; message: string }>("/api/feedback", data);
    },

    // --- Help / Support ---
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

    // --- Analytics ---
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

    // --- Onboarding ---
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

    // --- Interests ---
    async getInterestCategories() {
        return httpClient.get<{ categories: { name: string; interests: string[] }[] }>("/api/interests/categories");
    },

    async updateInterests(interests: string[]) {
        return httpClient.put<{ status: string; interests: string[] }>("/api/interests", { interests });
    },

    // --- Profile Prompts (Hinge-style Q&A) ---
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

    // --- Safety ---
    async blockUser(userId: string, reason?: string) {
        return httpClient.post("/api/safety/block", { user_id: userId, reason });
    },

    async reportUser(userId: string, reason: string, description?: string) {
        return httpClient.post("/api/safety/report", { user_id: userId, reason, description });
    },

    // --- Profile Analytics (detailed) ---
    async getProfileAnalytics() {
        return httpClient.get<{
            views_today: number;
            views_week: number;
            views_trend: number;
            likes_received_today: number;
            likes_received_week: number;
            likes_trend: number;
            matches_week: number;
            matches_trend: number;
            messages_received_week: number;
            superlikes_received_week: number;
            profile_score: number;
            top_viewers_age_range: string;
            peak_activity_hour: string;
        }>("/api/analytics/profile/detailed");
    },

    // --- Stars Transaction History ---
    async getStarsHistory() {
        return httpClient.get<{
            transactions: {
                id: string;
                type: string;
                amount: number;
                description: string;
                created_at: string;
            }[];
        }>("/api/payments/stars/history");
    },
};
