import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

// Config
const API_URL = process.env.API_URL || 'http://localhost:8001';

// Shared fetch helper
async function fetchBackend(endpoint: string, method: string, body?: any, token?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        throw new Error(`Backend error: ${res.statusText}`);
    }

    return res.json();
}

export const advancedRouter = router({
    generateAIContent: publicProcedure
        .input(z.object({
            content_type: z.enum(['bio', 'icebreaker', 'opener', 'caption']),
            context: z.string().optional(),
            tone: z.string().optional(),
            count: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const token = (ctx as any).token;
            return fetchBackend('/admin/advanced/ai/generate', 'POST', input, token);
        }),

    updateAlgorithmParams: publicProcedure
        .input(z.object({
            distance_weight: z.number(),
            age_weight: z.number(),
            interests_weight: z.number(),
            activity_weight: z.number(),
            response_rate_weight: z.number(),
            profile_completeness_weight: z.number().optional(),
            verification_bonus: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const token = (ctx as any).token;
            return fetchBackend('/admin/advanced/algorithm/params', 'PUT', input, token);
        }),

    createCustomReport: publicProcedure
        .input(z.object({
            report_type: z.string(),
            period: z.string().optional(),
            custom_sql: z.string().optional(),
            schedule: z.string().optional(),
            parameters: z.record(z.any()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const token = (ctx as any).token;
            return fetchBackend('/admin/advanced/reports/generate', 'POST', input, token);
        }),
});
