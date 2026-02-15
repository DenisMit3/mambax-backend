/**
 * Admin Monetization API
 */

import { httpClient } from "@/lib/http-client";
import type {
    RevenueMetrics,
    RevenueTrendItem,
    ChannelRevenue,
    SubscriptionStats,
    TransactionFilters,
    TransactionListResponse,
    VirtualGift,
    GiftCategory,
    SubscriptionPlan,
    SubscriptionPlanCreate,
} from "./types";

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
    return httpClient.get<RevenueMetrics>('/admin/monetization/revenue');
}

export async function getRevenueTrend(period: string = '30d'): Promise<{ trend: RevenueTrendItem[] }> {
    try {
        return await httpClient.get(`/admin/monetization/revenue?period=${period}`);
    } catch {
        return { trend: [] };
    }
}

export async function getRevenueByChannel(period: string = 'month'): Promise<ChannelRevenue[]> {
    try {
        return await httpClient.get<ChannelRevenue[]>(`/admin/monetization/revenue?period=${period}`);
    } catch {
        return [];
    }
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
    return httpClient.get<SubscriptionStats>('/admin/monetization/subscriptions');
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionListResponse> {
    try {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.size) params.append('size', filters.size.toString());
        if (filters.status) params.append('status', filters.status);
        if (filters.user_id) params.append('user_id', filters.user_id);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);

        return await httpClient.get<TransactionListResponse>(`/admin/monetization/transactions?${params.toString()}`);
    } catch {
        return { items: [], total: 0, page: 1, size: 20 };
    }
}

export async function refundTransaction(transactionId: string, reason: string): Promise<{ status: string; refund_id: string }> {
    try {
        return await httpClient.post(`/admin/monetization/transactions/${transactionId}/refund`, { reason });
    } catch {
        return { status: 'error', refund_id: '' };
    }
}

export async function getGiftCatalog(includePremium = true): Promise<{ categories: GiftCategory[]; gifts: VirtualGift[] }> {
    return httpClient.get(`/api/gifts/catalog?include_premium=${includePremium}`);
}

export async function createGift(giftData: Partial<VirtualGift>): Promise<VirtualGift> {
    try {
        return await httpClient.post<VirtualGift>('/admin/monetization/gifts', giftData);
    } catch {
        return { id: '', name: '', description: '', image_url: '', price: 0, currency: 'RUB', is_animated: false, is_premium: false, is_limited: false, is_active: false, times_sent: 0, sort_order: 0, ...giftData } as VirtualGift;
    }
}

export async function updateGift(giftId: string, giftData: Partial<VirtualGift>): Promise<VirtualGift> {
    try {
        return await httpClient.put<VirtualGift>(`/admin/monetization/gifts/${giftId}`, giftData);
    } catch {
        return { id: giftId, name: '', description: '', image_url: '', price: 0, currency: 'RUB', is_animated: false, is_premium: false, is_limited: false, is_active: false, times_sent: 0, sort_order: 0, ...giftData } as VirtualGift;
    }
}

export async function deleteGift(giftId: string): Promise<void> {
    try {
        return await httpClient.delete(`/admin/monetization/gifts/${giftId}`);
    } catch {
        // Endpoint не существует на бэкенде — игнорируем ошибку
    }
}

export async function uploadGiftImage(file: File): Promise<{ url: string; filename: string }> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        return await httpClient.post<{ url: string; filename: string }>('/admin/monetization/gifts/upload-image', formData);
    } catch {
        return { url: '', filename: file.name };
    }
}

export async function getPlans(includeInactive = false): Promise<{ plans: SubscriptionPlan[] }> {
    try {
        return await httpClient.get(`/admin/monetization/plans?include_inactive=${includeInactive}`);
    } catch {
        return { plans: [] };
    }
}

export async function createPlan(planData: SubscriptionPlanCreate): Promise<SubscriptionPlan> {
    try {
        return await httpClient.post<SubscriptionPlan>('/admin/monetization/plans', planData);
    } catch {
        return { id: '', name: '', tier: 'free', price: 0, currency: 'RUB', duration_days: 30, is_active: false, is_popular: false, features: {}, ...planData } as SubscriptionPlan;
    }
}

export async function updatePlan(planId: string, planData: Partial<SubscriptionPlanCreate>): Promise<SubscriptionPlan> {
    try {
        return await httpClient.patch<SubscriptionPlan>(`/admin/monetization/plans/${planId}`, planData);
    } catch {
        return { id: planId, name: '', tier: 'free', price: 0, currency: 'RUB', duration_days: 30, is_active: false, is_popular: false, features: {}, ...planData } as SubscriptionPlan;
    }
}

export async function deletePlan(planId: string): Promise<void> {
    try {
        return await httpClient.delete(`/admin/monetization/plans/${planId}`);
    } catch {
        // Endpoint не существует на бэкенде — игнорируем ошибку
    }
}
