/**
 * Discovery, Swipes, Likes API
 */

import { httpClient } from "@/lib/http-client";
import type { MatchUser, PaginatedResponse, UserProfile } from "./types";

export const discoveryApi = {
    async getProfiles(params?: { lat?: number; lon?: number; limit?: number }) {
        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', String(params.limit));
        else query.append('limit', '10');

        if (params?.lat !== undefined) query.append('lat', String(params.lat));
        if (params?.lon !== undefined) query.append('lon', String(params.lon));

        return httpClient.get<PaginatedResponse<UserProfile>>(`/api/feed?${query.toString()}`);
    },

    async swipe(userId: string, action: 'like' | 'dislike' | 'superlike') {
        return httpClient.post("/api/swipe", { to_user_id: userId, action });
    },

    async likeUser(userId: string, isSuper: boolean = false) {
        return httpClient.post("/api/likes", { liked_user_id: userId, is_super: isSuper });
    },

    async rewindLastSwipe() {
        return httpClient.post("/api/undo-swipe");
    },

    async getLikesReceived() {
        return httpClient.get<{ likes: { id: string; user: MatchUser; created_at: string; is_super: boolean }[]; total: number }>("/api/users/me/likes-received");
    },

    async getSmartFilters() {
        return httpClient.get("/api/discover/smart-filters");
    },

    async getSuperlikeInfo() {
        return httpClient.get<{
            remaining: number;
            daily_limit: number;
            is_vip: boolean;
            resets_at: string;
        }>("/api/superlike/info");
    },

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

    async getCompatibility(userId: string) {
        return httpClient.get<{
            score: number;
            breakdown: { interests: number; age: number; location: number; activity: number };
            tips: string[];
        }>(`/api/compatibility/${userId}`);
    },

    async getWhoViewedMe(limit: number = 20) {
        return httpClient.get<{
            viewers: { id: string; name: string; age: number; photo: string; viewed_at: string; is_online: boolean }[];
            total: number;
            is_vip: boolean;
            message?: string;
        }>(`/api/views/who-viewed-me?limit=${limit}`);
    },

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

    async updateLocation(lat: number, lon: number) {
        try {
            await httpClient.post("/api/location", { lat, lon });
        } catch (e) {
            console.error("Failed to update location", e);
        }
    },
};
