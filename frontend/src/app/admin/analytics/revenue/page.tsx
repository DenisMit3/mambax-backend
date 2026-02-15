'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/services/admin';
import RevenueChart from '@/components/admin/analytics/RevenueChart';
import { RefreshCw, Download, DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

export default function RevenueAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<{ sources: { source: string; amount: number }[]; [key: string]: unknown } | null>(null);
    const [period, setPeriod] = useState('month');
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.analytics.getRevenueBreakdown(period);
            setRevenueData(response);
        } catch (err) {
            console.error('Failed to fetch revenue data:', err);
            setError('Failed to load revenue data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>Revenue Analytics</h1>
                    <p className={styles.headerDescription}>Track financial performance and income sources</p>
                </div>
                <div className="flex gap-3">
                    <button className={styles.iconButton} onClick={fetchData} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className={styles.primaryButton}>
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Revenue Chart */}
                <div className="lg:col-span-3">
                    {error ? (
                        <GlassCard className="flex flex-col items-center justify-center min-h-[400px] text-[var(--admin-text-muted)]">
                            <p className="mb-4 text-red-500">{error}</p>
                            <button onClick={fetchData} className={styles.primaryButton}>Повторить</button>
                        </GlassCard>
                    ) : (
                        <RevenueChart
                            data={revenueData}
                            isLoading={loading}
                            selectedPeriod={period}
                            onPeriodChange={setPeriod}
                            onRefresh={fetchData}
                        />
                    )}
                </div>

                {/* Additional Stats */}
                <div className="flex flex-col gap-4">
                    <GlassCard className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/20 text-blue-500">
                            <CreditCard size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[var(--admin-text-muted)] mb-1">Active Subscriptions</span>
                            <span className="text-lg font-bold text-[var(--admin-text-primary)]">
                                {loading ? '...' : revenueData?.sources.find((s: { source: string; amount: number }) => s.source === 'Subscriptions')?.amount > 0 ? 'Активен' : '-'}
                            </span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-500">
                            <TrendingUp size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[var(--admin-text-muted)] mb-1">Growth (MoM)</span>
                            <span className="text-lg font-bold text-emerald-500">+12.5%</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/20 text-purple-500">
                            <DollarSign size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[var(--admin-text-muted)] mb-1">Avg. Revenue Per User</span>
                            <span className="text-lg font-bold text-[var(--admin-text-primary)]">$4.20</span>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
