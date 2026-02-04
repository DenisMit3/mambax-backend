'use client';

/**
 * Advanced Features API Service
 * 
 * This service connects the admin advanced features to the FastAPI backend.
 * We use FastAPI endpoints directly instead of tRPC for simplicity and
 * consistency with the rest of the backend architecture.
 */

import { httpClient } from "@/lib/http-client";

// Types
export interface AIGenerateRequest {
    content_type: 'bio' | 'icebreaker' | 'opener' | 'caption';
    context?: string;
    tone?: string;
    count?: number;
}

export interface AIGenerateResponse {
    status: string;
    content_type: string;
    suggestions: string[];
    generated_at: string;
    model: string;
    tokens_used: number;
}

export interface AIModel {
    id: string;
    name: string;
    provider: string;
    status: string;
    requests_today: number;
    avg_latency_ms: number;
    cost_today_usd: number;
    use_cases: string[];
}

export interface AlgorithmParams {
    distance_weight: number;
    age_weight: number;
    interests_weight: number;
    activity_weight: number;
    response_rate_weight: number;
    profile_completeness_weight?: number;
    verification_bonus?: number;
}

export interface AlgorithmParamsResponse {
    version: string;
    last_updated: string;
    updated_by: string;
    params: AlgorithmParams & { [key: string]: number };
    experimental: { [key: string]: boolean };
}

export interface Report {
    id: string;
    name: string;
    type: string;
    schedule: string;
    last_run: string;
    created_by: string;
}

export interface ReportTemplate {
    id: string;
    name: string;
    type: string;
}

export interface ReportsListResponse {
    reports: Report[];
    templates: ReportTemplate[];
}

export interface GenerateReportResponse {
    status: string;
    report_id: string;
    type: string;
    period: string;
    estimated_time_sec: number;
    download_url: string | null;
}

export interface Event {
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string;
    max_participants: number;
    registered: number;
    is_premium: boolean;
    host: string;
    active_participants?: number;
}

export interface EventsResponse {
    events: Event[];
    stats: {
        total_events_month: number;
        total_participants: number;
        avg_satisfaction: number;
        matches_from_events: number;
    };
}

export interface LocalizationStats {
    languages: Array<{
        code: string;
        name: string;
        users: number;
        completion: number;
        percentage: number;
    }>;
    translation_stats: {
        total_strings: number;
        translated_strings: number;
        needs_review: number;
        missing: number;
    };
    top_requests: Array<{
        language: string;
        requests: number;
    }>;
}

export interface PerformanceBudget {
    overall_score: number;
    metrics: {
        [key: string]: {
            value: number;
            budget: number;
            status: string;
        };
    };
    bundle_size: {
        js_total_kb: number;
        js_budget_kb: number;
        css_total_kb: number;
        css_budget_kb: number;
        images_avg_kb: number;
        images_budget_kb: number;
    };
    by_page: Array<{
        page: string;
        score: number;
        lcp: number;
        load_time: number;
    }>;
    trend: Array<{
        date: string;
        score: number;
    }>;
}

export interface PWAStats {
    installations: {
        total: number;
        this_month: number;
        growth: number;
    };
    engagement: {
        daily_active: number;
        weekly_active: number;
        avg_session_min: number;
        push_enabled: number;
    };
    by_platform: Array<{
        platform: string;
        installs: number;
        percentage: number;
    }>;
    offline_usage: {
        offline_sessions: number;
        cached_messages_sent: number;
        sync_success_rate: number;
    };
}

export interface AccessibilityAudit {
    overall_score: number;
    wcag_level: string;
    last_audit: string;
    issues: {
        critical: number;
        serious: number;
        moderate: number;
        minor: number;
    };
    categories: Array<{
        name: string;
        score: number;
        issues: number;
    }>;
    top_issues: Array<{
        page: string;
        issue: string;
        severity: string;
    }>;
}

export interface CallAnalytics {
    summary: {
        total_calls: number;
        video_calls: number;
        voice_calls: number;
        avg_duration_min: number;
        total_minutes: number;
    };
    quality: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
    };
    by_day: Array<{
        date: string;
        calls: number;
        avg_duration: number;
    }>;
    conversion: {
        calls_to_dates: number;
        video_preference: number;
        first_call_timing_days: number;
    };
}

export interface RecommendationDashboard {
    engine_status: string;
    model_version: string;
    last_retrain: string;
    metrics: {
        precision: number;
        recall: number;
        ndcg: number;
        coverage: number;
        diversity: number;
    };
    performance: {
        avg_latency_ms: number;
        p95_latency_ms: number;
        requests_per_sec: number;
        cache_hit_rate: number;
    };
    experiments: Array<{
        name: string;
        status: string;
        lift: number;
        traffic: number;
    }>;
    data_freshness: {
        user_features: string;
        item_embeddings: string;
        interaction_data: string;
    };
}

export interface Partner {
    id: string;
    name: string;
    status: 'active' | 'pending' | 'inactive';
    revenue_share: number;
    users_count: number;
    domain: string;
    logo: string;
    joined_at: string;
}

export interface PartnersResponse {
    partners: Partner[];
    stats: {
        total_partners: number;
        total_users: number;
        total_revenue: number;
        pending_invites: number;
    };
}


// API Functions
export const advancedApi = {
    // AI Content Generation
    async generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
        return httpClient.post<AIGenerateResponse>('/admin/advanced/ai/generate', request);
    },

    async getAIModels(): Promise<{ models: AIModel[]; usage_summary: Record<string, number> }> {
        return httpClient.get('/admin/advanced/ai/models');
    },

    async getAIUsage(period: string = '7d'): Promise<Record<string, unknown>> {
        return httpClient.get(`/admin/advanced/ai/usage?period=${period}`);
    },

    // Algorithm
    async getAlgorithmParams(): Promise<AlgorithmParamsResponse> {
        return httpClient.get<AlgorithmParamsResponse>('/admin/advanced/algorithm/params');
    },

    async updateAlgorithmParams(params: AlgorithmParams): Promise<{ status: string; new_params: AlgorithmParams; version?: string }> {
        return httpClient.put('/admin/advanced/algorithm/params', params);
    },

    async getAlgorithmPerformance(period: string = '30d'): Promise<Record<string, unknown>> {
        return httpClient.get(`/admin/advanced/algorithm/performance?period=${period}`);
    },

    // Reports
    async getReports(): Promise<ReportsListResponse> {
        return httpClient.get<ReportsListResponse>('/admin/advanced/reports');
    },

    async generateReport(
        reportType: string,
        period: string = '30d',
        customSql: string = '',
        schedule: string = '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parameters: Record<string, any> = {}
    ): Promise<GenerateReportResponse> {
        return httpClient.post<GenerateReportResponse>('/admin/advanced/reports/generate', {
            report_type: reportType,
            period,
            custom_sql: customSql,
            schedule,
            parameters
        });
    },

    // Web3
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getWeb3Stats(): Promise<any> {
        return httpClient.get('/admin/advanced/web3/stats');
    },

    // Events
    async getEvents(status?: string): Promise<EventsResponse> {
        const url = status
            ? `/admin/advanced/events?status=${status}`
            : `/admin/advanced/events`;
        return httpClient.get<EventsResponse>(url);
    },

    async createEvent(event: {
        name: string;
        event_type: string;
        start_date: string;
        max_participants: number;
        is_premium?: boolean;
    }): Promise<{ status: string; event: Event }> {
        return httpClient.post('/admin/advanced/events', event);
    },

    // Localization
    async getLocalizationStats(): Promise<LocalizationStats> {
        return httpClient.get<LocalizationStats>('/admin/advanced/localization/stats');
    },

    // Performance
    async getPerformanceBudget(): Promise<PerformanceBudget> {
        return httpClient.get<PerformanceBudget>('/admin/advanced/performance/budget');
    },

    // PWA
    async getPWAStats(): Promise<PWAStats> {
        return httpClient.get<PWAStats>('/admin/advanced/performance/pwa');
    },

    // Accessibility
    async getAccessibilityAudit(): Promise<AccessibilityAudit> {
        return httpClient.get<AccessibilityAudit>('/admin/advanced/accessibility/audit');
    },

    // Calls Analytics
    async getCallAnalytics(period: string = '7d'): Promise<CallAnalytics> {
        return httpClient.get<CallAnalytics>(`/admin/advanced/calls/analytics?period=${period}`);
    },

    // Recommendations
    async getRecommendationsDashboard(): Promise<RecommendationDashboard> {
        return httpClient.get<RecommendationDashboard>('/admin/advanced/recommendations/dashboard');
    },

    // Icebreakers
    async getIcebreakers(category?: string): Promise<{ icebreakers: unknown[]; total: number; categories: string[]; stats: unknown }> {
        const url = category
            ? `/admin/advanced/icebreakers?category=${category}`
            : `/admin/advanced/icebreakers`;
        return httpClient.get(url);
    },

    async createIcebreaker(data: { text: string; category: string; tags?: string[] }): Promise<unknown> {
        return httpClient.post('/admin/advanced/icebreakers', data);
    },

    async generateIcebreakers(category: string = 'general', count: number = 5): Promise<{ generated: string[] }> {
        return httpClient.post(`/admin/advanced/icebreakers/generate?category=${category}&count=${count}`);
    },

    // Partners
    async getPartners(): Promise<PartnersResponse> {
        return httpClient.get<PartnersResponse>('/admin/advanced/partners');
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async createPartner(data: any): Promise<any> {
        return httpClient.post('/admin/advanced/partners', data);
    },
};

export default advancedApi;
