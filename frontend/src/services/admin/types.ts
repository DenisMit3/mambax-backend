/**
 * Admin API Types
 */

export interface VerificationRequestItem {
    id: string;
    user_id: string;
    user_name: string;
    user_photos: string[];
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

export interface AdminCreateUserData {
    name: string;
    email?: string;
    phone?: string;
    age: number;
    gender: string;
    password?: string;
    role?: string;
    status?: string;
    subscription_tier?: string;
    bio?: string;
    city?: string;
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
    photo?: string;
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

export interface GeoHeatmapPoint {
    city: string;
    lat: number;
    lng: number;
    users: number;
    vip: number;
    active: number;
}

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
