/**
 * Admin Dashboard API
 */

import { httpClient } from "@/lib/http-client";
import type { DashboardMetrics, ActivityItem } from "./types";

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    return httpClient.get<DashboardMetrics>('/admin/dashboard/metrics', { silent: true });
}

export async function getLiveActivity(limit = 10): Promise<ActivityItem[]> {
    return httpClient.get<ActivityItem[]>(`/admin/dashboard/activity?limit=${limit}`, { silent: true });
}
