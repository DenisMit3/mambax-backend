'use client';

/**
 * Advanced Features API Service
 */

import { httpClient } from "@/lib/http-client";
import type {
    AIGenerateRequest, AIGenerateResponse, AIModel,
    AlgorithmParams, AlgorithmParamsResponse,
    ReportsListResponse, GenerateReportResponse,
    Event, EventsResponse,
    LocalizationStats, PerformanceBudget, PWAStats,
    AccessibilityAudit, CallAnalytics, RecommendationDashboard,
    Partner, PartnersResponse
} from './advancedApi.types';

// Re-export all types
export type {
    AIGenerateRequest, AIGenerateResponse, AIModel,
    AlgorithmParams, AlgorithmParamsResponse,
    Report, ReportTemplate, ReportsListResponse, GenerateReportResponse,
    Event, EventsResponse,
    LocalizationStats, PerformanceBudget, PWAStats,
    AccessibilityAudit, CallAnalytics, RecommendationDashboard,
    Partner, PartnersResponse
} from './advancedApi.types';

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
        reportType: string, period: string = '30d', customSql: string = '',
        schedule: string = '', parameters: Record<string, unknown> = {}
    ): Promise<GenerateReportResponse> {
        return httpClient.post<GenerateReportResponse>('/admin/advanced/reports/generate', {
            report_type: reportType, period, custom_sql: customSql, schedule, parameters
        });
    },

    // Web3
    async getWeb3Stats(): Promise<Record<string, unknown>> {
        return httpClient.get('/admin/advanced/web3/stats');
    },

    // Events
    async getEvents(status?: string): Promise<EventsResponse> {
        const url = status ? `/admin/advanced/events?status=${status}` : `/admin/advanced/events`;
        return httpClient.get<EventsResponse>(url);
    },
    async createEvent(event: {
        name: string; event_type: string; start_date: string;
        max_participants: number; is_premium?: boolean;
    }): Promise<{ status: string; event: Event }> {
        return httpClient.post('/admin/advanced/events', event);
    },
    async updateEvent(id: string, data: Record<string, unknown>): Promise<Event> {
        return httpClient.put(`/admin/advanced/events/${id}`, data);
    },
    async deleteEvent(id: string): Promise<void> {
        return httpClient.delete(`/admin/advanced/events/${id}`);
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
        const url = category ? `/admin/advanced/icebreakers?category=${category}` : `/admin/advanced/icebreakers`;
        return httpClient.get(url);
    },
    async createIcebreaker(data: { text: string; category: string; tags?: string[] }): Promise<unknown> {
        return httpClient.post('/admin/advanced/icebreakers', data);
    },
    async generateIcebreakers(category: string = 'general', count: number = 5): Promise<{ generated: string[] }> {
        return httpClient.post(`/admin/advanced/icebreakers/generate?category=${category}&count=${count}`);
    },
    async updateIcebreaker(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
        return httpClient.put(`/admin/advanced/icebreakers/${id}`, data);
    },
    async deleteIcebreaker(id: string): Promise<void> {
        return httpClient.delete(`/admin/advanced/icebreakers/${id}`);
    },

    // Partners
    async getPartners(): Promise<PartnersResponse> {
        return httpClient.get<PartnersResponse>('/admin/advanced/partners');
    },
    async createPartner(data: Record<string, unknown>): Promise<Partner> {
        return httpClient.post('/admin/advanced/partners', data);
    },
    async updatePartner(id: string, data: Record<string, unknown>): Promise<Partner> {
        return httpClient.put(`/admin/advanced/partners/${id}`, data);
    },
    async deletePartner(id: string): Promise<void> {
        return httpClient.delete(`/admin/advanced/partners/${id}`);
    },
};

export default advancedApi;
