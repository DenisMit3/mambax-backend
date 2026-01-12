import { getApiUrl } from "@/utils/env";
import * as Sentry from "@sentry/nextjs";

/**
 * Handles API errors by logging in development or capturing in Sentry in production.
 * Always throws the error to be handled by the caller.
 * Fallbacks should be handled in e2e tests, not here.
 */
const handleApiError = (error: any) => {
    if (process.env.NODE_ENV === 'development') {
        console.error('Backend error', error);
    } else {
        Sentry.captureException(error);
    }
    throw error;
};

const API_URL = getApiUrl();

export const authService = {
    async login(phone: string, otp: string) {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ identifier: phone, otp }),
            });

            if (!response.ok) {
                throw new Error("Login failed");
            }

            const data = await response.json();
            // Save token
            if (typeof window !== 'undefined') {
                localStorage.setItem("token", data.access_token);
            }
            return data;
        } catch (error) {
            handleApiError(error);
        }
    },

    async requestOtp(phone: string) {
        try {
            const response = await fetch(`${API_URL}/auth/request-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: phone }),
            });
            if (!response.ok) throw new Error("Failed to request OTP");
            return await response.json();
        } catch (error) {
            handleApiError(error);
        }
    },

    async telegramLogin(initData: string) {
        try {
            const response = await fetch(`${API_URL}/auth/telegram`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ init_data: initData }),
            });

            if (!response.ok) throw new Error("Telegram Login Failed");

            const data = await response.json();
            if (typeof window !== 'undefined') localStorage.setItem("token", data.access_token);
            return data;
        } catch (error) {
            handleApiError(error);
        }
    },

    async createProfile(data: { name: string; gender: string; photos: string[] }) {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
            const response = await fetch(`${API_URL}/profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ ...data, age: 25, interests: [] }), // Default age for MVP
            });
            if (!response.ok) throw new Error("Failed to create profile");
            return response.json();
        } catch (error) {
            handleApiError(error);
        }
    },

    async updateProfile(data: { name?: string; bio?: string; gender?: string; interests?: string[]; photos?: string[] }) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to update profile");
        return response.json();
    },

    async getProfiles() {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
            // CHANGE: Use /feed
            const response = await fetch(`${API_URL}/feed?limit=10`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error("Failed to fetch profiles");
            return response.json();
        } catch (error) {
            handleApiError(error);
        }
    },

    async getMe() {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/users/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to get profile");
        return response.json();
    },

    async deleteAccount() {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/users/me`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to delete account");
        return true;
    },

    async exportData() {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/users/me/export`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to export data");
        return response.json();
    },

    async getUser(userId: string) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch user");
        return response.json();
    },

    async uploadPhoto(file: File) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const formData = new FormData();
        formData.append("file", file);

        // CHANGE: Use real users endpoint
        const response = await fetch(`${API_URL}/users/me/photo`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        // Backend returns UserResponse. Extract last photo URL.
        const url = data.photos && data.photos.length > 0 ? data.photos[data.photos.length - 1] : "";
        return { url };
    },

    async uploadChatMedia(file: File) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/chat/upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed");
        return await response.json();
    },

    async likeUser(userId: string, isSuper: boolean = false) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        // CHANGE: Use /likes and correct schema
        try {
            const res = await fetch(`${API_URL}/likes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ liked_user_id: userId, is_super: isSuper })
            });
            return res.json();
        } catch (e) {
            handleApiError(e);
        }
    },

    async getVapidKey() {
        const response = await fetch(`${API_URL}/notifications/vapid-public-key`);
        return response.json();
    },

    async subscribePush(subscription: { endpoint: string, keys: { p256dh: string, auth: string } }) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        return await fetch(`${API_URL}/notifications/subscribe`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(subscription)
        });
    },

    async getMatches() {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        try {
            // CHANGE: Use /matches
            const res = await fetch(`${API_URL}/matches`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) return [];
            const data = await res.json();
            return data.matches || data; // Handle both list or {matches: [...]} if format varies
        } catch (error) {
            handleApiError(error);
        }
    },

    async getMessages(matchId: string) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        try {
            // CHANGE: Use /matches/{id}/messages
            const res = await fetch(`${API_URL}/matches/${matchId}/messages`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to get messages");
            return await res.json();
        } catch (error) {
            handleApiError(error);
        }
    },

    async sendMessage(matchId: string, text: string, type: string = "text", audio_url: string | null = null, duration: string | null = null) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        try {
            // CHANGE: Use /chat/send
            const res = await fetch(`${API_URL}/chat/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    match_id: matchId,
                    text,
                    type,
                    media_url: audio_url,
                    duration: duration ? parseInt(duration as string) : undefined
                })
            });
            if (!res.ok) throw new Error("Failed to send");
            return await res.json();
        } catch (error) {
            handleApiError(error);
        }
    },

    async updateLocation(lat: number, lon: number) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        try {
            await fetch(`${API_URL}/location`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ lat, lon })
            });
        } catch (e) {
            console.error("Failed to update location", e);
        }
    },

    async blockUser(userId: string, reason?: string) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/safety/block`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId, reason })
        });
        if (!response.ok) throw new Error("Failed to block user");
        return response.json();
    },

    async reportUser(userId: string, reason: string, description?: string) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/safety/report`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId, reason, description })
        });
        if (!response.ok) throw new Error("Failed to report user");
        return response.json();
    },

    async rewindLastSwipe() {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/rewind`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error("Failed to rewind");
        return response.json();
    },

    // ============================================
    // VIRTUAL GIFTS API
    // ============================================

    async getGiftsCatalog(categoryId?: string, includePremium: boolean = true) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const params = new URLSearchParams();
        if (categoryId) params.append("category_id", categoryId);
        params.append("include_premium", String(includePremium));

        const response = await fetch(`${API_URL}/gifts/catalog?${params}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch gift catalog");
        return response.json();
    },

    async sendGift(giftId: string, receiverId: string, message?: string, isAnonymous: boolean = false) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/gifts/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                gift_id: giftId,
                receiver_id: receiverId,
                message,
                is_anonymous: isAnonymous
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to send gift");
        }
        return response.json();
    },

    async getReceivedGifts(limit: number = 20, offset: number = 0, unreadOnly: boolean = false) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
            unread_only: String(unreadOnly)
        });

        const response = await fetch(`${API_URL}/gifts/received?${params}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch received gifts");
        return response.json();
    },

    async getSentGifts(limit: number = 20, offset: number = 0) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset)
        });

        const response = await fetch(`${API_URL}/gifts/sent?${params}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch sent gifts");
        return response.json();
    },

    async markGiftAsRead(transactionId: string) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/gifts/mark-read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ transaction_id: transactionId })
        });
        if (!response.ok) throw new Error("Failed to mark gift as read");
        return response.json();
    },

    async sendGiftDirectPurchase(giftId: string, receiverId: string, message?: string, isAnonymous?: boolean) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/admin/monetization/payments/gift`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                gift_id: giftId,
                receiver_id: receiverId,
                message,
                is_anonymous: isAnonymous
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to create gift invoice");
        }
        return response.json();
    },

    // ============================================
    // MONETIZATION API
    // ============================================

    async buySubscription(tier: string) {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : "";
        const response = await fetch(`${API_URL}/payments/subscription`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ tier })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: any = new Error(errorData.detail || "Failed to buy subscription");
            error.data = errorData;
            throw error;
        }
        return response.json();
    }
};
