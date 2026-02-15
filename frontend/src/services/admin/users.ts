/**
 * Admin User Management API
 */

import { httpClient } from "@/lib/http-client";
import type {
    AdminCreateUserData,
    UserFilters,
    UserListResponse,
    UserDetailData,
    VerificationRequestItem,
    UserSegment,
} from "./types";

export async function createUser(data: AdminCreateUserData): Promise<{ status: string; message: string; user_id: string }> {
    return httpClient.post('/admin/users', data);
}

export async function deleteUser(userId: string): Promise<{ status: string; message: string }> {
    return httpClient.delete(`/admin/users/${userId}`);
}

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
