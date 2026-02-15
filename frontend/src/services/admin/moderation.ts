/**
 * Admin Moderation API
 */

import { httpClient } from "@/lib/http-client";
import type { ModerationQueueItem, ModerationStats } from "./types";

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

    return httpClient.get(`/admin/moderation/queue?${params.toString()}`, { silent: true });
}

export async function reviewModerationItem(
    itemId: string,
    action: 'approve' | 'reject' | 'ban',
    notes?: string
): Promise<{ status: string; message: string }> {
    return httpClient.post(`/admin/moderation/${itemId}/review`, { action, notes });
}

export async function getModerationStats(): Promise<ModerationStats> {
    return httpClient.get<ModerationStats>('/admin/moderation/stats');
}
