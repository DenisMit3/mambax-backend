/**
 * Admin Analytics API
 */

import { httpClient } from "@/lib/http-client";
import type {
    AnalyticsData,
    RetentionCohort,
    FunnelStage,
    GeoHeatmapPoint,
    LtvPrediction,
} from "./types";

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

    const data = await httpClient.get<Blob>(`/admin/analytics/export?${params.toString()}`, {
        responseType: 'blob',
    } as Record<string, unknown>);

    const blob = data instanceof Blob ? data : new Blob([JSON.stringify(data)]);
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

export async function getGeoHeatmap(): Promise<{
    points: GeoHeatmapPoint[];
    total_users: number;
    total_vip: number;
    top_cities: GeoHeatmapPoint[];
}> {
    return httpClient.get('/admin/analytics/geo-heatmap');
}

export async function getLtvPrediction(): Promise<LtvPrediction> {
    return httpClient.get('/admin/analytics/ltv-prediction');
}
