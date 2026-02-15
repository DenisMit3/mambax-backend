/**
 * Virtual Gifts API
 */

import { httpClient } from "@/lib/http-client";
import type { CatalogResponse, GiftListResponse, GiftPurchaseResponse } from "./types";

export const giftsApi = {
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
        return httpClient.post<GiftPurchaseResponse>("/api/gifts/send", {
            gift_id: giftId,
            receiver_id: receiverId,
            message,
            is_anonymous: isAnonymous
        });
    },
};
