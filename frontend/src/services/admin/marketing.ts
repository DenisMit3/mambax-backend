/**
 * Admin Marketing API
 */

import { httpClient } from "@/lib/http-client";

export async function sendPush(title: string, message: string, segment?: string) {
    return httpClient.post('/admin/marketing/push', { title, message, segment });
}

export async function getReferrals(page?: number) {
    const params = page ? `?page=${page}` : '';
    return httpClient.get(`/admin/marketing/referrals${params}`);
}

export async function getCampaigns() {
    return httpClient.get('/admin/marketing/campaigns');
}

export async function createCampaign(data: Record<string, unknown>) {
    return httpClient.post('/admin/marketing/campaigns', data);
}

export async function updateCampaign(id: string, action: string) {
    return httpClient.post(`/admin/marketing/campaigns/${id}/${action}`);
}

export async function getChannels() {
    return httpClient.get('/admin/marketing/channels');
}
