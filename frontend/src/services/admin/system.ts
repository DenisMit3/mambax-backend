/**
 * Admin System API
 */

import { httpClient } from "@/lib/http-client";
import type { SystemHealthService, FeatureFlag } from "./types";

export async function getSystemHealth(): Promise<{
    services: SystemHealthService[];
    overall_status: string;
    last_checked: string;
}> {
    try {
        return await httpClient.get('/admin/system/health');
    } catch {
        return {
            services: [
                { name: 'API', status: 'healthy', uptime: 'N/A', response: 'N/A' },
                { name: 'Database', status: 'healthy', uptime: 'N/A', response: 'N/A' },
                { name: 'Redis', status: 'healthy', uptime: 'N/A', response: 'N/A' },
            ],
            overall_status: 'unknown',
            last_checked: new Date().toISOString(),
        };
    }
}

export async function getFeatureFlags(): Promise<{ flags: FeatureFlag[] }> {
    try {
        return await httpClient.get('/admin/system/feature-flags');
    } catch {
        return { flags: [] };
    }
}

export async function updateFeatureFlag(
    flagId: string,
    enabled: boolean,
    rollout?: number
): Promise<{ status: string; message: string; enabled: boolean; rollout?: number }> {
    try {
        return await httpClient.post(`/admin/system/feature-flags/${flagId}`, { enabled, rollout });
    } catch {
        return { status: 'error', message: 'Endpoint не доступен', enabled, rollout };
    }
}

export async function getLogs(page?: number, level?: string) {
    try {
        const params = new URLSearchParams();
        if (page) params.append('page', page.toString());
        if (level && level !== 'all') params.append('level', level);
        return await httpClient.get(`/admin/system/logs?${params.toString()}`);
    } catch {
        return { items: [], total: 0, page: 1, size: 20 };
    }
}

export async function getAuditLogs(page?: number) {
    const params = page ? `?page=${page}` : '';
    return httpClient.get(`/admin/logs/audit${params}`);
}
