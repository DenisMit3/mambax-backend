/**
 * Notifications & Push API
 */

import { httpClient } from "@/lib/http-client";
import type { VapidKeyResponse } from "./types";

export const notificationsApi = {
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

    async getVapidKey() {
        return httpClient.get<VapidKeyResponse>("/api/notifications/vapid-public-key", { skipAuth: true });
    },

    async subscribePush(subscription: { endpoint: string, keys: { p256dh: string, auth: string } }) {
        return httpClient.post("/api/notifications/subscribe", subscription);
    },
};
