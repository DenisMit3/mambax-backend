/**
 * Admin Monetization Extended API
 * (inline methods from adminApi.monetization that were not standalone functions)
 */

import { httpClient } from "@/lib/http-client";

export const promoCodes = {
    list: async (filter?: string) => {
        const params = filter && filter !== 'all' ? `?status=${filter}` : '';
        return httpClient.get(`/admin/monetization/promos${params}`);
    },
    create: async (data: Record<string, unknown>) => {
        return httpClient.post('/admin/monetization/promos', data);
    },
    toggle: async (id: string) => {
        return httpClient.post(`/admin/monetization/promos/${id}/toggle`);
    },
};

export const refunds = {
    list: async (status?: string) => {
        try {
            const params = status && status !== 'all' ? `?status=${status}` : '';
            return await httpClient.get(`/admin/monetization/refunds${params}`);
        } catch {
            return { items: [], total: 0 };
        }
    },
    action: async (id: string, action: 'approve' | 'reject', notes?: string) => {
        try {
            return await httpClient.post(`/admin/monetization/refunds/${id}/${action}`, { notes });
        } catch {
            return { status: 'error', message: 'Endpoint не доступен' };
        }
    },
};

export const payments = {
    getGateways: async () => {
        try {
            return await httpClient.get('/admin/monetization/payments/gateways');
        } catch {
            return { gateways: [] };
        }
    },
    getFailedPayments: async () => {
        try {
            return await httpClient.get('/admin/monetization/payments/failed');
        } catch {
            return { items: [], total: 0 };
        }
    },
    retryPayment: async (id: string) => {
        try {
            return await httpClient.post(`/admin/monetization/payments/${id}/retry`);
        } catch {
            return { status: 'error', message: 'Endpoint не доступен' };
        }
    },
};

export const pricingTests = {
    list: async (status?: string) => {
        try {
            const params = status ? `?status=${status}` : '';
            return await httpClient.get(`/admin/monetization/pricing-tests${params}`);
        } catch {
            return { items: [], total: 0 };
        }
    },
    create: async (data: Record<string, unknown>) => {
        try {
            return await httpClient.post('/admin/monetization/pricing-tests', data);
        } catch {
            return { status: 'error', message: 'Endpoint не доступен' };
        }
    },
    update: async (id: string, data: Record<string, unknown>) => {
        try {
            return await httpClient.patch(`/admin/monetization/pricing-tests/${id}`, data);
        } catch {
            return { status: 'error', message: 'Endpoint не доступен' };
        }
    },
    delete: async (id: string) => {
        try {
            return await httpClient.delete(`/admin/monetization/pricing-tests/${id}`);
        } catch {
            return { status: 'error', message: 'Endpoint не доступен' };
        }
    },
    getResults: async (id: string) => {
        try {
            return await httpClient.get(`/admin/monetization/pricing-tests/${id}/results`);
        } catch {
            return { results: [], total: 0 };
        }
    },
};

export const promoRedemptions = {
    list: async (promoCodeId?: string, page = 1) => {
        try {
            const params = new URLSearchParams({ page: page.toString() });
            if (promoCodeId) params.append('promo_code_id', promoCodeId);
            return await httpClient.get(`/admin/monetization/promo-redemptions?${params.toString()}`);
        } catch {
            return { items: [], total: 0, page: 1 };
        }
    },
    analytics: async () => {
        try {
            return await httpClient.get('/admin/monetization/promo-redemptions/analytics');
        } catch {
            return { total_redemptions: 0, total_discount: 0, by_promo: [] };
        }
    },
};

export async function arpuTrends(months = 6) {
    try {
        return await httpClient.get(`/admin/monetization/revenue/arpu-trends?months=${months}`);
    } catch {
        return { trends: [], months };
    }
}

export async function getChurnAnalysis(period = 'month') {
    try {
        return await httpClient.get(`/admin/monetization/revenue/churn?period=${period}`);
    } catch {
        return { churn_rate: 0, at_risk: 0, churned: 0, period };
    }
}

export async function getForecast(months = 3) {
    try {
        return await httpClient.get(`/admin/monetization/revenue/forecast?months=${months}`);
    } catch {
        return { forecast: [], months, confidence: 0 };
    }
}

export async function getBoostAnalytics(period = 'month') {
    try {
        return await httpClient.get(`/admin/monetization/boosts/analytics?period=${period}`);
    } catch {
        return { total_boosts: 0, revenue: 0, avg_per_user: 0, period };
    }
}

export async function getSuperlikeAnalytics(period = 'month') {
    try {
        return await httpClient.get(`/admin/monetization/superlikes/analytics?period=${period}`);
    } catch {
        return { total_superlikes: 0, revenue: 0, conversion_rate: 0, period };
    }
}

export async function getAffiliates(status = 'active') {
    try {
        return await httpClient.get(`/admin/monetization/affiliates?status=${status}`);
    } catch {
        return { affiliates: [], total: 0 };
    }
}

export async function getAffiliateStats() {
    try {
        return await httpClient.get('/admin/monetization/affiliates/stats');
    } catch {
        return { total_affiliates: 0, total_revenue: 0, active: 0 };
    }
}

export async function getUpsellOpportunities() {
    try {
        return await httpClient.get('/admin/monetization/upsell/opportunities');
    } catch {
        return { opportunities: [], total: 0 };
    }
}
