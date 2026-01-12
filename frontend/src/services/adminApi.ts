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

const API_BASE = (typeof window === 'undefined')
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    : '/api_proxy';

// ============================================
// TYPES
// ============================================

export interface VerificationRequestItem {
    id: string;
    user_id: string;
    user_name: string;
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
    user_id: string;
    user_name: string;
    ai_score: number;
    ai_flags: string[];
    priority: string;
    status: string;
    reason?: string;
    description?: string;
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

export interface FeatureFlag {
    id: string;
    name: string;
    enabled: boolean;
    rollout: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAuthHeaders(): HeadersInit {
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    // In development mode, use mock_token if no real token exists
    // This allows testing the admin panel without full authentication
    if (!token && process.env.NODE_ENV === 'development') {
        token = 'mock_token';
        // Store it for consistency across requests
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', 'mock_token');
        }
    }

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
}

// ============================================
// DASHBOARD API
// ============================================

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await fetch(`${API_BASE}/admin/dashboard/metrics`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<DashboardMetrics>(response);
}

export async function getLiveActivity(limit = 10): Promise<ActivityItem[]> {
    const response = await fetch(`${API_BASE}/admin/dashboard/activity?limit=${limit}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<ActivityItem[]>(response);
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

    const response = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<UserListResponse>(response);
}

export async function getUserDetails(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function performUserAction(
    userId: string,
    action: 'verify' | 'suspend' | 'ban' | 'activate' | 'unverify',
    reason?: string
): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, reason }),
    });
    return handleResponse(response);
}

export async function performBulkUserAction(
    userIds: string[],
    action: 'verify' | 'suspend' | 'ban' | 'activate',
    reason?: string
): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/admin/users/bulk-action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_ids: userIds, action, reason }),
    });

    return handleResponse(response);
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

    const response = await fetch(`${API_BASE}/admin/users/verification/queue?${params.toString()}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function reviewVerificationRequest(
    requestId: string,
    action: 'approve' | 'reject',
    reason?: string
): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/admin/users/verification/${requestId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, reason }),
    });
    return handleResponse(response);
}

export async function getSegments(): Promise<{ segments: UserSegment[] }> {
    const response = await fetch(`${API_BASE}/admin/users/segments`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
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

    const response = await fetch(`${API_BASE}/admin/moderation/queue?${params.toString()}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function reviewModerationItem(
    itemId: string,
    action: 'approve' | 'reject' | 'ban',
    notes?: string
): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/admin/moderation/${itemId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, notes }),
    });
    return handleResponse(response);
}

export async function getModerationStats(): Promise<ModerationStats> {
    const response = await fetch(`${API_BASE}/admin/moderation/stats`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<ModerationStats>(response);
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

    const response = await fetch(`${API_BASE}/admin/analytics/overview?${params.toString()}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<AnalyticsData>(response);
}

export async function getRetentionCohorts(): Promise<{ cohorts: RetentionCohort[] }> {
    const response = await fetch(`${API_BASE}/admin/analytics/retention`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function getFunnelData(): Promise<{ funnel: FunnelStage[] }> {
    const response = await fetch(`${API_BASE}/admin/analytics/funnel`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function getRealtimeMetrics(): Promise<{
    timestamp: string;
    active_now: number;
    dau: number;
    wau: number;
    mau: number;
    trend: { dau_change: number; wau_change: number; mau_change: number };
}> {
    const response = await fetch(`${API_BASE}/admin/analytics/realtime`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
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
    const response = await fetch(`${API_BASE}/admin/analytics/churn-prediction`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function getRevenueBreakdown(period: string = 'month'): Promise<{
    period: string;
    total: number;
    sources: { source: string; amount: number; percentage: number }[];
    by_day: { date: string; amount: number }[];
}> {
    const response = await fetch(`${API_BASE}/admin/analytics/revenue-breakdown?period=${period}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// MONETIZATION API
// ============================================

// ============================================
// MONETIZATION API
// ============================================

export interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    created_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: Record<string, any>;
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

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
    const response = await fetch(`${API_BASE}/admin/monetization/revenue/metrics`, { // Fixed endpoint URL based on backend
        headers: getAuthHeaders(),
    });
    return handleResponse<RevenueMetrics>(response);
}

export async function getSubscriptionStats(): Promise<any> {
    const response = await fetch(`${API_BASE}/admin/monetization/subscriptions`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<TransactionListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.size) params.append('size', filters.size.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const response = await fetch(`${API_BASE}/admin/monetization/transactions?${params.toString()}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<TransactionListResponse>(response);
}

export async function refundTransaction(transactionId: string, reason: string): Promise<{ status: string; refund_id: string }> {
    const response = await fetch(`${API_BASE}/admin/monetization/transactions/${transactionId}/refund`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
}

// ============================================
// SYSTEM API
// ============================================

export async function getSystemHealth(): Promise<{
    services: SystemHealthService[];
    overall_status: string;
    last_checked: string;
}> {
    const response = await fetch(`${API_BASE}/admin/system/health`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function getFeatureFlags(): Promise<{ flags: FeatureFlag[] }> {
    const response = await fetch(`${API_BASE}/admin/system/feature-flags`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

export async function updateFeatureFlag(
    flagId: string,
    enabled: boolean,
    rollout?: number
): Promise<{ status: string; message: string; enabled: boolean; rollout?: number }> {
    const response = await fetch(`${API_BASE}/admin/system/feature-flags/${flagId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled, rollout }),
    });
    return handleResponse(response);
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
    },
    marketing: {
        sendPush: async (title: string, message: string) => {
            const response = await fetch(`${API_BASE}/admin/marketing/push?title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}`, { method: 'POST', headers: getAuthHeaders() });
            return handleResponse(response);
        },
        getReferrals: async () => {
            const response = await fetch(`${API_BASE}/admin/marketing/referrals`, { headers: getAuthHeaders() });
            return handleResponse(response);
        },
        getCampaigns: async () => {
            const response = await fetch(`${API_BASE}/admin/marketing/campaigns`, { headers: getAuthHeaders() });
            return handleResponse(response);
        },
        getChannels: async () => {
            const response = await fetch(`${API_BASE}/admin/marketing/channels`, { headers: getAuthHeaders() });
            return handleResponse(response);
        }
    },
    monetization: {
        getRevenue: getRevenueMetrics,
        getSubscriptions: getSubscriptionStats,
        getTransactions: getTransactions,
        refundTransaction: refundTransaction,
    },
    system: {
        getHealth: getSystemHealth,
        getFeatureFlags: getFeatureFlags,
        updateFeatureFlag: updateFeatureFlag,
        getLogs: async () => {
            const response = await fetch(`${API_BASE}/admin/system/logs`, { headers: getAuthHeaders() });
            return handleResponse(response);
        }
    },
};

export default adminApi;
