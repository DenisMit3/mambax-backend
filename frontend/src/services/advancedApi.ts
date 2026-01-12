'use client';

/**
 * Advanced Features API Service
 * 
 * This service connects the admin advanced features to the FastAPI backend.
 * We use FastAPI endpoints directly instead of tRPC for simplicity and
 * consistency with the rest of the backend architecture.
 */

// Get base URL from existing API service pattern
// Get base URL from existing API service pattern
const getBaseUrl = () => {
    // Server-side rendering fallback
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";
    }
    // Client-side: use proxy prefix
    return "/api_proxy";
};

const API_URL = getBaseUrl();

// Helper to get auth token
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
};

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
        const response = await fetch(`${API_URL}/admin/advanced/ai/generate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`Failed to generate content: ${response.statusText}`);
        }
        return response.json();
    },

    async getAIModels(): Promise<{ models: AIModel[]; usage_summary: Record<string, number> }> {
        const response = await fetch(`${API_URL}/admin/advanced/ai/models`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch AI models: ${response.statusText}`);
        }
        return response.json();
    },

    async getAIUsage(period: string = '7d'): Promise<Record<string, unknown>> {
        const response = await fetch(`${API_URL}/admin/advanced/ai/usage?period=${period}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch AI usage: ${response.statusText}`);
        }
        return response.json();
    },

    // Algorithm
    async getAlgorithmParams(): Promise<AlgorithmParamsResponse> {
        const response = await fetch(`${API_URL}/admin/advanced/algorithm/params`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch algorithm params: ${response.statusText}`);
        }
        return response.json();
    },

    async updateAlgorithmParams(params: AlgorithmParams): Promise<{ status: string; new_params: AlgorithmParams; version?: string }> {
        const response = await fetch(`${API_URL}/admin/advanced/algorithm/params`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            throw new Error(`Failed to update algorithm params: ${response.statusText}`);
        }
        return response.json();
    },

    async getAlgorithmPerformance(period: string = '30d'): Promise<Record<string, unknown>> {
        const response = await fetch(`${API_URL}/admin/advanced/algorithm/performance?period=${period}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch algorithm performance: ${response.statusText}`);
        }
        return response.json();
    },

    // Reports
    async getReports(): Promise<ReportsListResponse> {
        const response = await fetch(`${API_URL}/admin/advanced/reports`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch reports: ${response.statusText}`);
        }
        return response.json();
    },

    async generateReport(
        reportType: string,
        period: string = '30d',
        customSql: string = '',
        schedule: string = '',
        parameters: Record<string, any> = {}
    ): Promise<GenerateReportResponse> {
        const response = await fetch(
            `${API_URL}/admin/advanced/reports/generate`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    report_type: reportType,
                    period,
                    custom_sql: customSql,
                    schedule,
                    parameters
                })
            }
        );
        if (!response.ok) {
            throw new Error(`Failed to generate report: ${response.statusText}`);
        }
        return response.json();
    },

    // Web3
    async getWeb3Stats(): Promise<any> {
        const response = await fetch(`${API_URL}/admin/advanced/web3/stats`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch web3 stats: ${response.statusText}`);
        }
        return response.json();
    },

    // Events
    async getEvents(status?: string): Promise<EventsResponse> {
        const url = status
            ? `${API_URL}/admin/advanced/events?status=${status}`
            : `${API_URL}/admin/advanced/events`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.statusText}`);
        }
        return response.json();
    },

    async createEvent(event: {
        name: string;
        event_type: string;
        start_date: string;
        max_participants: number;
        is_premium?: boolean;
    }): Promise<{ status: string; event: Event }> {
        const response = await fetch(`${API_URL}/admin/advanced/events`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(event),
        });
        if (!response.ok) {
            throw new Error(`Failed to create event: ${response.statusText}`);
        }
        return response.json();
    },

    // Localization
    async getLocalizationStats(): Promise<LocalizationStats> {
        const response = await fetch(`${API_URL}/admin/advanced/localization/stats`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch localization stats: ${response.statusText}`);
        }
        return response.json();
    },

    // Performance
    async getPerformanceBudget(): Promise<PerformanceBudget> {
        const response = await fetch(`${API_URL}/admin/advanced/performance/budget`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch performance budget: ${response.statusText}`);
        }
        return response.json();
    },

    // PWA
    async getPWAStats(): Promise<PWAStats> {
        const response = await fetch(`${API_URL}/admin/advanced/performance/pwa`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch PWA stats: ${response.statusText}`);
        }
        return response.json();
    },

    // Accessibility
    async getAccessibilityAudit(): Promise<AccessibilityAudit> {
        const response = await fetch(`${API_URL}/admin/advanced/accessibility/audit`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch accessibility audit: ${response.statusText}`);
        }
        return response.json();
    },

    // Calls Analytics
    async getCallAnalytics(period: string = '7d'): Promise<CallAnalytics> {
        const response = await fetch(`${API_URL}/admin/advanced/calls/analytics?period=${period}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch call analytics: ${response.statusText}`);
        }
        return response.json();
    },

    // Recommendations
    async getRecommendationsDashboard(): Promise<RecommendationDashboard> {
        const response = await fetch(`${API_URL}/admin/advanced/recommendations/dashboard`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch recommendations dashboard: ${response.statusText}`);
        }
        return response.json();
    },

    // Icebreakers
    async getIcebreakers(category?: string): Promise<{ icebreakers: unknown[]; total: number; categories: string[]; stats: unknown }> {
        const url = category
            ? `${API_URL}/admin/advanced/icebreakers?category=${category}`
            : `${API_URL}/admin/advanced/icebreakers`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch icebreakers: ${response.statusText}`);
        }
        return response.json();
    },

    async createIcebreaker(data: { text: string; category: string; tags?: string[] }): Promise<unknown> {
        const response = await fetch(`${API_URL}/admin/advanced/icebreakers`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`Failed to create icebreaker: ${response.statusText}`);
        }
        return response.json();
    },

    async generateIcebreakers(category: string = 'general', count: number = 5): Promise<{ generated: string[] }> {
        const response = await fetch(
            `${API_URL}/admin/advanced/icebreakers/generate?category=${category}&count=${count}`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
            }
        );
        if (!response.ok) {
            throw new Error(`Failed to generate icebreakers: ${response.statusText}`);
        }
        return response.json();
    },

    // Partners
    async getPartners(): Promise<PartnersResponse> {
        const response = await fetch(`${API_URL}/admin/advanced/partners`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch partners: ${response.statusText}`);
        }
        return response.json();
    },

    async createPartner(data: any): Promise<any> {
        const response = await fetch(`${API_URL}/admin/advanced/partners`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`Failed to create partner: ${response.statusText}`);
        }
        return response.json();
    },
};

export default advancedApi;
