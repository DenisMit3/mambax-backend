'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/admin';

export interface Gateway {
    name: string;
    displayName: string;
    status: 'operational' | 'degraded' | 'down';
    transactions24h: number;
    successRate: number;
    avgResponseMs: number;
    failedTransactions: number;
    volume24h: number;
    icon: string;
}

export interface FailedPayment {
    id: string;
    transactionId: string;
    userId: string;
    userName: string;
    amount: number;
    gateway: string;
    errorCode: string;
    errorMessage: string;
    retryCount: number;
    lastRetry: string;
    createdAt: string;
}

export interface OverallStatsData {
    total_transactions: number;
    success_rate: number;
    total_volume: number;
    failed_count: number;
    avg_response_ms: number;
}

export function usePaymentsPage() {
    const [gateways, setGateways] = useState<Gateway[]>([]);
    const [stats, setStats] = useState<OverallStatsData | null>(null);
    const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryingId, setRetryingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [gatewaysRes, failedRes] = await Promise.all([
                adminApi.monetization.payments.getGateways(),
                adminApi.monetization.payments.getFailedPayments(),
            ]);
            const typedGatewaysRes = gatewaysRes as { gateways?: Gateway[]; stats?: OverallStatsData | null };
            const typedFailedRes = failedRes as { payments?: FailedPayment[] };
            setGateways(typedGatewaysRes.gateways ?? []);
            setStats(typedGatewaysRes.stats ?? null);
            setFailedPayments(typedFailedRes.payments ?? []);
        } catch (e: unknown) {
            const err = e as Error;
            setError(err?.message || 'Не удалось загрузить данные платежей');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchData().then(() => { if (cancelled) return; });
        return () => { cancelled = true; };
    }, [fetchData]);

    const refetchFailed = useCallback(async () => {
        try {
            const res = await adminApi.monetization.payments.getFailedPayments();
            setFailedPayments((res as { payments?: FailedPayment[] }).payments ?? []);
        } catch { /* silent */ }
    }, []);

    const handleRetry = useCallback(async (id: string) => {
        setRetryingId(id);
        try {
            await adminApi.monetization.payments.retryPayment(id);
            await refetchFailed();
        } catch { /* silent */ }
        finally { setRetryingId(null); }
    }, [refetchFailed]);

    const systemStatus = gateways.some(g => g.status === 'down') ? 'down'
        : gateways.some(g => g.status === 'degraded') ? 'degraded' : 'operational';

    return {
        gateways, stats, failedPayments, loading, error,
        retryingId, systemStatus, fetchData, handleRetry
    };
}
