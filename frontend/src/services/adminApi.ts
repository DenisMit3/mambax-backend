/**
 * Admin Dashboard API Service
 * 
 * Provides typed API calls to the admin backend endpoints for:
 * - Dashboard metrics and activity
 * - User management
 * - Content moderation
 * - Analytics
 * - Monetization
 * - System operations
 */

import { httpClient } from "@/lib/http-client";

// ============================================
// TYPES
// ============================================

export interface VerificationRequestItem {
    id: string;
    user_id: string;
    user_name: string;
    user_photos: string[]; // Added
    status: string;
    priority: number;
    submitted_photos: string[];
    ai_confidence: number | null;
    created_at: string;
}

export interface UserSegment {
    id: string;
    name: string;
    count: number;
    description: string;
}

export interface DashboardMetrics {
    total_users: number;
    active_today: number;
    new_matches: number;
    messages_sent: number;
    revenue_today: number;
    premium_users: number;
    pending_moderation: number;
    reports_today: number;
    traffic_history: number[];
}

export interface ActivityItem {
    id: string;
    type: 'user' | 'match' | 'report' | 'payment' | 'moderation';
    message: string;
    time: string;
}

export interface UserListItem {
    id: string;
    name: string;
    email: string | null;
    age: number | null;
    gender: string | null;
    location: string | null;
    status: string;
    subscription: string;
    verified: boolean;
    fraud_score: number;
    registered_at: string;
    last_active: string | null;
    matches: number;
    messages: number;
}

export interface UserListResponse {
    users: UserListItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface UserFilters {
    page?: number;
    page_size?: number;
    status?: string;
    subscription?: string;
    verified?: boolean;
    search?: string;
    fraud_risk?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export interface ModerationQueueItem {
    id: string;
    type: string;
    content_type: string;
    content: string;
    user_id: string;
    user_name: string;
    ai_score: number;
    ai_flags: string[];
    priority: string;
    status: string;
    reason?: string;
    description?: string;
    photo?: string; // Added for UI display
    created_at: string;
}

export interface ModerationStats {
    pending: number;
    today_reviewed: number;
    today_received: number;
    approved: number;
    rejected: number;
    ai_processed: number;
    accuracy: number;
}

export interface AnalyticsData {
    period: {
        start: string;
        end: string;
    };
    daily_data: {
        date: string;
        dau: number;
        new_users: number;
        revenue: number;
        matches: number;
        messages: number;
    }[];
    totals: {
        total_users: number;
        active_users: number;
        new_users: number;
        total_revenue: number;
    };
}

export interface RetentionCohort {
    cohort: string;
    d1: number;
    d3: number;
    d7: number;
    d14: number | null;
    d30: number | null;
}

export interface FunnelStage {
    stage: string;
    value: number;
    rate: number;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    tier: 'free' | 'gold' | 'platinum';
    price: number;
    currency: string;
    duration_days: number;
    is_active: boolean;
    is_popular: boolean;
    features: Record<string, boolean | number>;
    // Flat features for mapping
    unlimited_swipes?: boolean;
    see_who_likes_you?: boolean;
    incognito_mode?: boolean;
    boosts_per_month?: number;
    super_likes_per_day?: number;
    advanced_filters?: boolean;
    rewind_unlimited?: boolean;
    priority_listing?: boolean;
    read_receipts?: boolean;
    profile_boost?: boolean;
}

export type SubscriptionPlanCreate = Omit<SubscriptionPlan, 'id' | 'is_active' | 'is_popular'> & {
    is_active?: boolean;
    is_popular?: boolean;
};

export interface RevenueMetrics {
    today: number;
    week: number;
    month: number;
    year: number;
    arpu: number;
    arppu: number;
    subscription_breakdown: {
        free: { count: number; percentage: number };
        gold: { count: number; percentage: number };
        platinum: { count: number; percentage: number };
    };
    revenue_sources: {
        source: string;
        amount: number;
        percentage: number;
    }[];
}

export interface SystemHealthService {
    name: string;
    status: 'healthy' | 'warning' | 'error';
    uptime: string;
    response: string;
}

export interface DeviceInfo {
    browser?: string;
    os?: string;
    device?: string;
    ip?: string;
    timezone?: string;
    language?: string;
    app_version?: string;
}

export interface UserDetailData {
    id: string;
    name: string;
    email: string | null;
    age: number | null;
    gender: string | null;
    location: string | null;
    status: 'active' | 'banned' | 'inactive';
    subscription: 'free' | 'gold' | 'platinum';
    verified: boolean;
    fraud_score: number;
    bio: string | null;
    photos: string[];
    registered_at: string;
    last_active: string | null;
    device_info: DeviceInfo | null;
    stats: {
        matches: number;
        swipes_given: number;
        swipes_received: number;
        messages_sent: number;
        messages_received: number;
        revenue_total: number;
    };
}

export interface FeatureFlag {
    id: string;
    name: string;
    enabled: boolean;
    rollout: number;
}

export interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    created_at: string;
    metadata: Record<string, unknown>;
}

export interface TransactionListResponse {
    items: Transaction[];
    total: number;
    page: number;
    size: number;
}

export interface TransactionFilters {
    page?: number;
    size?: number;
    status?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
}

export interface GiftCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    sort_order: number;
    is_active: boolean;
}

export interface VirtualGift {
    id: string;
    name: string;
    description: string;
    image_url: string;
    animation_url?: string;
    price: number;
    currency: string;
    is_animated: boolean;
    is_premium: boolean;
    is_limited: boolean;
    is_active: boolean;
    available_until?: string;
    max_quantity?: number;
    times_sent: number;
    category_id?: string;
    sort_order: number;
}

export interface RevenueTrendItem {
    date: string;
    revenue: number;
}

export interface ChannelRevenue {
    channel: string;
    revenue: number;
    percentage: number;
}

export interface SubscriptionStats {
    free: number;
    gold: number;
    platinum: number;
    total: number;
}

// ============================================
// DASHBOARD API
// ============================================

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    return httpClient.get<DashboardMetrics>('/admin/dashboard/metrics', { silent: true });
}

export async function getLiveActivity(limit = 10): Promise<ActivityItem[]> {
    return httpClient.get<ActivityItem[]>(`/admin/dashboard/activity?limit=${limit}`, { silent: true });
}

// ============================================
// USER MANAGEMENT API
// ============================================

export async function getUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.subscription && filters.subscription !== 'all') params.append('subscription', filters.subscription);
    if (filters.verified !== undefined) params.append('verified', filters.verified.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.fraud_risk && filters.fraud_risk !== 'all') params.append('fraud_risk', filters.fraud_risk);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);

    return httpClient.get<UserListResponse>(`/admin/users?${params.toString()}`, { silent: true });
}

export async function getUserDetails(userId: string): Promise<UserDetailData> {
    return httpClient.get<UserDetailData>(`/admin/users/${userId}`);
}

export async function performUserAction(
    userId: string,
    action: 'verify' | 'suspend' | 'ban' | 'activate' | 'unverify',
    reason?: string
): Promise<{ status: string; message: string }> {
    return httpClient.post(`/admin/users/${userId}/action`, { action, reason });
}

export async function performBulkUserAction(
    userIds: string[],
    action: 'verify' | 'suspend' | 'ban' | 'activate',
    reason?: string
): Promise<{ status: string; message: string }> {
    return httpClient.post('/admin/users/bulk-action', { user_ids: userIds, action, reason });
}

export async function getVerificationQueue(
    status = 'pending',
    page = 1,
    pageSize = 20
): Promise<{ items: VerificationRequestItem[]; total: number; page: number; page_size: number }> {
    const params = new URLSearchParams({
        status,
        page: page.toString(),
        page_size: pageSize.toString(),
    });

    return httpClient.get(`/admin/users/verification/queue?${params.toString()}`);
}

export async function reviewVerificationRequest(
    requestId: string,
    action: 'approve' | 'reject',
    reason?: string
): Promise<{ status: string; message: string }> {
    return httpClient.post(`/admin/users/verification/${requestId}/review`, { action, reason });
}

export async function getSegments(): Promise<{ segments: UserSegment[] }> {
    return httpClient.get('/admin/users/segments');
}

export async function recalculateFraudScores(
    limit = 100,
    onlyMissing = false
): Promise<{ success: boolean; processed: number; errors: number; total_queued: number }> {
    const params = new URLSearchParams({
        limit: limit.toString(),
        only_missing: onlyMissing.toString(),
    });
    return httpClient.post(`/admin/users/fraud-scores/recalculate?${params.toString()}`);
}

export async function getHighRiskUsers(
    minScore = 50,
    limit = 50
): Promise<{ users: Array<{ user_id: string; user_name: string; score: number; risk_level: string; factors: Record<string, number> }>; total: number }> {
    const params = new URLSearchParams({
        min_score: minScore.toString(),
        limit: limit.toString(),
    });
    return httpClient.get(`/admin/users/fraud-scores/high-risk?${params.toString()}`);
}

// ============================================
// MODERATION API
// ============================================

export async function getModerationQueue(
    contentType?: string,
    priority?: string,
    status = 'pending',
    page = 1,
    pageSize = 20
): Promise<{ items: ModerationQueueItem[]; total: number; page: number; page_size: number }> {
    const params = new URLSearchParams({
        status,
        page: page.toString(),
        page_size: pageSize.toString(),
    });

    if (contentType && contentType !== 'all') params.append('content_type', contentType);
    if (priority && priority !== 'all') params.append('priority', priority);

    return httpClient.get(`/admin/moderation/queue?${params.toString()}`, { silent: true });
}

export async function reviewModerationItem(
    itemId: string,
    action: 'approve' | 'reject' | 'ban',
    notes?: string
): Promise<{ status: string; message: string }> {
    return httpClient.post(`/admin/moderation/${itemId}/review`, { action, notes });
}

export async function getModerationStats(): Promise<ModerationStats> {
    return httpClient.get<ModerationStats>('/admin/moderation/stats');
}

// ============================================
// ANALYTICS API
// ============================================

export async function getAnalyticsOverview(
    startDate?: string,
    endDate?: string
): Promise<AnalyticsData> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return httpClient.get<AnalyticsData>(`/admin/analytics/overview?${params.toString()}`);
}

export async function exportAnalyticsData(
    startDate?: string,
    endDate?: string,
    format: 'csv' | 'json' = 'csv'
): Promise<void> {
    const params = new URLSearchParams({ format });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    // For CSV, we need to trigger a direct download
    const token = typeof window !== 'undefined' ? (() => { try { return localStorage.getItem('token'); } catch { return null; } })() : null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

    const response = await fetch(`${baseUrl}/admin/analytics/export?${params.toString()}`, {
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
        }
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export async function getRetentionCohorts(): Promise<{ cohorts: RetentionCohort[] }> {
    return httpClient.get('/admin/analytics/retention');
}

export async function getFunnelData(): Promise<{ funnel: FunnelStage[] }> {
    return httpClient.get('/admin/analytics/funnel');
}

export async function getRealtimeMetrics(): Promise<{
    timestamp: string;
    active_now: number;
    dau: number;
    wau: number;
    mau: number;
    trend: { dau_change: number; wau_change: number; mau_change: number };
}> {
    return httpClient.get('/admin/analytics/realtime');
}

export async function getChurnPrediction(): Promise<{
    prediction_date: string;
    model_version: string;
    confidence: number;
    at_risk_users: number;
    high_risk_count: number;
    medium_risk_count: number;
    predicted_churn_30d: number;
    top_churn_factors: { factor: string; impact: number }[];
    recommendations: string[];
}> {
    return httpClient.get('/admin/analytics/churn-prediction');
}

export async function getRevenueBreakdown(period: string = 'month'): Promise<{
    period: string;
    total: number;
    sources: { source: string; amount: number; percentage: number }[];
    by_day: { date: string; amount: number }[];
}> {
    return httpClient.get(`/admin/analytics/revenue-breakdown?period=${period}`);
}

export interface GeoHeatmapPoint {
    city: string;
    lat: number;
    lng: number;
    users: number;
    vip: number;
    active: number;
}

export async function getGeoHeatmap(): Promise<{
    points: GeoHeatmapPoint[];
    total_users: number;
    total_vip: number;
    top_cities: GeoHeatmapPoint[];
}> {
    return httpClient.get('/admin/analytics/geo-heatmap');
}

// LTV Prediction types
export interface LtvSegment {
    segment: string;
    users: number;
    percentage: number;
    avg_ltv: number;
    total_revenue: number;
    arpu: number;
    risk: 'low' | 'medium' | 'high';
}

export interface LtvPrediction {
    prediction_date: string;
    model_version: string;
    confidence: number;
    summary: {
        total_users: number;
        paying_users: number;
        conversion_rate: number;
        arpu_30d: number;
        arppu_30d: number;
        estimated_avg_ltv: number;
        revenue_30d: number;
        revenue_90d: number;
        avg_lifetime_months: number;
    };
    segments: LtvSegment[];
    trends: {
        ltv_change_30d: number;
        conversion_trend: string;
        churn_rate: number;
    };
    recommendations: string[];
}

export async function getLtvPrediction(): Promise<LtvPrediction> {
    return httpClient.get('/admin/analytics/ltv-prediction');
}

export interface AutoBanRulePayload {
    name: string;
    description?: string;
    trigger_type: string;
    threshold: number;
    time_window_hours: number;
    action: string;
    action_duration_hours?: number | null;
    is_enabled: boolean;
    priority: number;
}

// ============================================
// MONETIZATION API
// ============================================

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
    return httpClient.get<RevenueMetrics>('/admin/monetization/revenue/metrics');
}

export async function getRevenueTrend(period: string = '30d'): Promise<{ trend: RevenueTrendItem[] }> {
    return httpClient.get(`/admin/monetization/revenue/trend?period=${period}`);
}

export async function getRevenueByChannel(period: string = 'month'): Promise<ChannelRevenue[]> {
    return httpClient.get<ChannelRevenue[]>(`/admin/monetization/revenue/by-channel?period=${period}`);
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
    return httpClient.get<SubscriptionStats>('/admin/monetization/subscriptions');
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.size) params.append('size', filters.size.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    return httpClient.get<TransactionListResponse>(`/admin/monetization/transactions?${params.toString()}`);
}

export async function refundTransaction(transactionId: string, reason: string): Promise<{ status: string; refund_id: string }> {
    return httpClient.post(`/admin/monetization/transactions/${transactionId}/refund`, { reason });
}

export async function getGiftCatalog(includePremium = true): Promise<{ categories: GiftCategory[]; gifts: VirtualGift[] }> {
    return httpClient.get(`/gifts/catalog?include_premium=${includePremium}`);
}

export async function createGift(giftData: Partial<VirtualGift>): Promise<VirtualGift> {
    return httpClient.post<VirtualGift>('/admin/monetization/gifts', giftData);
}

export async function updateGift(giftId: string, giftData: Partial<VirtualGift>): Promise<VirtualGift> {
    return httpClient.put<VirtualGift>(`/admin/monetization/gifts/${giftId}`, giftData);
}

export async function deleteGift(giftId: string): Promise<void> {
    return httpClient.delete(`/admin/monetization/gifts/${giftId}`);
}

export async function uploadGiftImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return httpClient.post<{ url: string; filename: string }>('/admin/monetization/gifts/upload-image', formData);
}

export async function getPlans(includeInactive = false): Promise<{ plans: SubscriptionPlan[] }> {
    return httpClient.get(`/admin/monetization/plans?include_inactive=${includeInactive}`);
}

export async function createPlan(planData: SubscriptionPlanCreate): Promise<SubscriptionPlan> {
    return httpClient.post<SubscriptionPlan>('/admin/monetization/plans', planData);
}

export async function updatePlan(planId: string, planData: Partial<SubscriptionPlanCreate>): Promise<SubscriptionPlan> {
    return httpClient.patch<SubscriptionPlan>(`/admin/monetization/plans/${planId}`, planData);
}

export async function deletePlan(planId: string): Promise<void> {
    return httpClient.delete(`/admin/monetization/plans/${planId}`);
}

// ============================================
// SYSTEM API
// ============================================

export async function getSystemHealth(): Promise<{
    services: SystemHealthService[];
    overall_status: string;
    last_checked: string;
}> {
    return httpClient.get('/admin/system/health');
}

export async function getFeatureFlags(): Promise<{ flags: FeatureFlag[] }> {
    return httpClient.get('/admin/system/feature-flags');
}

export async function updateFeatureFlag(
    flagId: string,
    enabled: boolean,
    rollout?: number
): Promise<{ status: string; message: string; enabled: boolean; rollout?: number }> {
    return httpClient.post(`/admin/system/feature-flags/${flagId}`, { enabled, rollout });
}

// ============================================
// UTILITY EXPORTS
// ============================================

export const adminApi = {
    dashboard: {
        getMetrics: getDashboardMetrics,
        getActivity: getLiveActivity,
    },
    users: {
        list: getUsers,
        getDetails: getUserDetails,
        action: performUserAction,
        bulkAction: performBulkUserAction,
        getVerificationQueue: getVerificationQueue,
        reviewVerification: reviewVerificationRequest,
        getSegments: getSegments,
        recalculateFraudScores: recalculateFraudScores,
        getHighRiskUsers: getHighRiskUsers,
    },
    moderation: {
        getQueue: getModerationQueue,
        review: reviewModerationItem,
        getStats: getModerationStats,
    },
    analytics: {
        getOverview: getAnalyticsOverview,
        getRetention: getRetentionCohorts,
        getFunnel: getFunnelData,
        getRealtime: getRealtimeMetrics,
        getChurnPrediction: getChurnPrediction,
        getRevenueBreakdown: getRevenueBreakdown,
        getGeoHeatmap: getGeoHeatmap,
        getLtvPrediction: getLtvPrediction,
        exportData: exportAnalyticsData,
    },
    marketing: {
        sendPush: async (title: string, message: string, segment?: string) => {
            return httpClient.post('/admin/marketing/push', { title, message, segment });
        },
        getReferrals: async (page?: number) => {
            const params = page ? `?page=${page}` : '';
            return httpClient.get(`/admin/marketing/referrals${params}`);
        },
        getCampaigns: async () => {
            return httpClient.get('/admin/marketing/campaigns');
        },
        createCampaign: async (data: Record<string, unknown>) => {
            return httpClient.post('/admin/marketing/campaigns', data);
        },
        updateCampaign: async (id: string, action: string) => {
            return httpClient.post(`/admin/marketing/campaigns/${id}/${action}`);
        },
        getChannels: async () => {
            return httpClient.get('/admin/marketing/channels');
        }
    },
    monetization: {
        getRevenue: getRevenueMetrics,
        getTrend: getRevenueTrend,
        getChannels: getRevenueByChannel,
        getSubscriptions: getSubscriptionStats,
        getTransactions: getTransactions,
        refundTransaction: refundTransaction,
        getPlans: getPlans,
        createPlan: createPlan,
        updatePlan: updatePlan,
        deletePlan: deletePlan,
        gifts: {
            getCatalog: getGiftCatalog,
            create: createGift,
            update: updateGift,
            delete: deleteGift,
            uploadImage: uploadGiftImage,
        },
        plans: {
            get: getPlans,
            create: createPlan,
            update: updatePlan,
            delete: deletePlan,
        },
        promoCodes: {
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
        },
        refunds: {
            list: async (status?: string) => {
                const params = status && status !== 'all' ? `?status=${status}` : '';
                return httpClient.get(`/admin/monetization/refunds${params}`);
            },
            action: async (id: string, action: 'approve' | 'reject', notes?: string) => {
                return httpClient.post(`/admin/monetization/refunds/${id}/${action}`, { notes });
            },
        },
        payments: {
            getGateways: async () => {
                return httpClient.get('/admin/monetization/payments/gateways');
            },
            getFailedPayments: async () => {
                return httpClient.get('/admin/monetization/payments/failed');
            },
            retryPayment: async (id: string) => {
                return httpClient.post(`/admin/monetization/payments/${id}/retry`);
            },
        },
        pricingTests: {
            list: async (status?: string) => {
                const params = status ? `?status=${status}` : '';
                return httpClient.get(`/admin/monetization/pricing-tests${params}`);
            },
            create: async (data: Record<string, unknown>) => {
                return httpClient.post('/admin/monetization/pricing-tests', data);
            },
            update: async (id: string, data: Record<string, unknown>) => {
                return httpClient.patch(`/admin/monetization/pricing-tests/${id}`, data);
            },
            delete: async (id: string) => {
                return httpClient.delete(`/admin/monetization/pricing-tests/${id}`);
            },
            getResults: async (id: string) => {
                return httpClient.get(`/admin/monetization/pricing-tests/${id}/results`);
            },
        },
        promoRedemptions: {
            list: async (promoCodeId?: string, page = 1) => {
                const params = new URLSearchParams({ page: page.toString() });
                if (promoCodeId) params.append('promo_code_id', promoCodeId);
                return httpClient.get(`/admin/monetization/promo-redemptions?${params.toString()}`);
            },
            analytics: async () => {
                return httpClient.get('/admin/monetization/promo-redemptions/analytics');
            },
        },
        arpuTrends: async (months = 6) => {
            return httpClient.get(`/admin/monetization/revenue/arpu-trends?months=${months}`);
        },
        getChurnAnalysis: async (period = 'month') => {
            return httpClient.get(`/admin/monetization/revenue/churn?period=${period}`);
        },
        getForecast: async (months = 3) => {
            return httpClient.get(`/admin/monetization/revenue/forecast?months=${months}`);
        },
        getBoostAnalytics: async (period = 'month') => {
            return httpClient.get(`/admin/monetization/boosts/analytics?period=${period}`);
        },
        getSuperlikeAnalytics: async (period = 'month') => {
            return httpClient.get(`/admin/monetization/superlikes/analytics?period=${period}`);
        },
        getAffiliates: async (status = 'active') => {
            return httpClient.get(`/admin/monetization/affiliates?status=${status}`);
        },
        getAffiliateStats: async () => {
            return httpClient.get('/admin/monetization/affiliates/stats');
        },
        getUpsellOpportunities: async () => {
            return httpClient.get('/admin/monetization/upsell/opportunities');
        },
    },
    system: {
        getHealth: getSystemHealth,
        getFeatureFlags: getFeatureFlags,
        updateFeatureFlag: updateFeatureFlag,
        getLogs: async (page?: number, level?: string) => {
            const params = new URLSearchParams();
            if (page) params.append('page', page.toString());
            if (level && level !== 'all') params.append('level', level);
            return httpClient.get(`/admin/system/logs?${params.toString()}`);
        },
        getAuditLogs: async (page?: number) => {
            const params = page ? `?page=${page}` : '';
            return httpClient.get(`/admin/system/audit${params}`);
        },
    },
    autoBanRules: {
        list: async () => httpClient.get('/admin/auto-ban-rules'),
        create: async (data: AutoBanRulePayload) => httpClient.post('/admin/auto-ban-rules', data),
        update: async (id: string, data: Partial<AutoBanRulePayload>) => httpClient.put(`/admin/auto-ban-rules/${id}`, data),
        delete: async (id: string) => httpClient.delete(`/admin/auto-ban-rules/${id}`),
        toggle: async (id: string) => httpClient.post(`/admin/auto-ban-rules/${id}/toggle`),
    },
    gdpr: {
        exportUserData: async (userId: string) => httpClient.get(`/admin/users/${userId}/gdpr-export`),
    },
};

export default adminApi;
