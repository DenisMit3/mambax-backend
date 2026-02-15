/**
 * Settings API (notifications, visibility, incognito, 2FA, blocked, devices, account deletion, language)
 */

import { httpClient } from "@/lib/http-client";

export const settingsApi = {
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
        return httpClient.post(`/api/2fa/enable?method=${method}`);
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

    // Account Deletion
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

    // Language
    async getLanguages() {
        return httpClient.get<{
            languages: { code: string; name: string; native_name: string }[];
        }>("/api/languages");
    },

    async setLanguage(code: string) {
        return httpClient.put<{ status: string }>("/api/settings/language", { language: code });
    },
};
