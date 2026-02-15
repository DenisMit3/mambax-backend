/**
 * Auth & User Profile API
 */

import { httpClient } from "@/lib/http-client";
import type { AuthResponse, PhotoUploadResponse, UserProfile } from "./types";

export const authApi = {
    async login(phone: string, otp: string) {
        const data = await httpClient.post<AuthResponse>("/api/auth/login", { identifier: phone, otp }, { skipAuth: true });
        if (typeof window !== 'undefined' && data.access_token) {
            httpClient.setToken(data.access_token);
        }
        return data;
    },

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

    async getMe() {
        return httpClient.get<UserProfile>("/api/users/me");
    },

    async getUser(userId: string) {
        return httpClient.get<UserProfile>(`/api/users/${userId}`);
    },

    async uploadPhoto(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        const data = await httpClient.post<PhotoUploadResponse>("/api/users/me/photo", formData);
        const url = data.photos && data.photos.length > 0 ? data.photos[data.photos.length - 1] : "";
        return { url };
    },

    async deleteAccount() {
        return httpClient.delete("/api/users/me");
    },

    async exportData() {
        return httpClient.get("/api/users/me/export");
    },

    async addStarsDev(amount: number) {
        return httpClient.post("/api/users/me/add-stars-dev", { amount });
    },

    async spendStarsDev(amount: number) {
        return httpClient.post("/api/users/me/spend-stars-dev", { amount });
    },
};
