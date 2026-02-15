/**
 * Monetization, Payments, Subscriptions, Boost API
 */

import { httpClient } from "@/lib/http-client";

export const monetizationApi = {
    async createInvoice(amount: number, label: string) {
        return httpClient.post<{ invoice_link: string; transaction_id: string; amount: number }>(
            "/api/payments/top-up",
            { amount, label }
        );
    },

    async buySubscription(tier: string) {
        return httpClient.post("/api/payments/subscription", { tier });
    },

    async getPricing() {
        return httpClient.get("/api/payments/pricing");
    },

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
};
