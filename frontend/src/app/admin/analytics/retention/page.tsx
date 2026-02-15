'use client';

import { useState, useEffect } from 'react';
import { adminApi, RetentionCohort } from '@/services/admin';
import RetentionHeatmap from '@/components/admin/analytics/RetentionHeatmap';
import { TrendingUp, TrendingDown, RefreshCw, Download, HelpCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

export default function RetentionPage() {
    const [loading, setLoading] = useState(true);
    const [cohorts, setCohorts] = useState<RetentionCohort[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.analytics.getRetention();
            setCohorts(response.cohorts || []);
        } catch (err) {
            console.error('Failed to fetch retention data:', err);
            setError('Failed to load retention data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const calculateAverageRetention = (day: 'd1' | 'd7' | 'd30') => {
        if (!cohorts.length) return 0;
        const sum = cohorts.reduce((acc, curr) => acc + (curr[day] || 0), 0);
        return (sum / cohorts.length).toFixed(1);
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>Retention Analytics</h1>
                    <p className={styles.headerDescription}>Track user retention cohorts and engagement over time</p>
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

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <GlassCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium text-[var(--admin-text-muted)]">Day 1 Retention</div>
                        <HelpCircle size={16} className="text-[var(--admin-text-secondary)] cursor-help" />
                    </div>
                    <div className="text-3xl font-bold text-[var(--admin-text-primary)] mb-3">{calculateAverageRetention('d1')}%</div>
                    <div className="flex items-center gap-1.5 text-[13px] text-emerald-500">
                        <TrendingUp size={16} />
                        <span>Avg last 30 days</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium text-[var(--admin-text-muted)]">Day 7 Retention</div>
                        <HelpCircle size={16} className="text-[var(--admin-text-secondary)] cursor-help" />
                    </div>
                    <div className="text-3xl font-bold text-[var(--admin-text-primary)] mb-3">{calculateAverageRetention('d7')}%</div>
                    <div className="flex items-center gap-1.5 text-[13px] text-amber-500">
                        <TrendingUp size={16} />
                        <span>Avg last 30 days</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-medium text-[var(--admin-text-muted)]">Day 30 Retention</div>
                        <HelpCircle size={16} className="text-[var(--admin-text-secondary)] cursor-help" />
                    </div>
                    <div className="text-3xl font-bold text-[var(--admin-text-primary)] mb-3">{calculateAverageRetention('d30')}%</div>
                    <div className="flex items-center gap-1.5 text-[13px] text-red-500">
                        <TrendingDown size={16} />
                        <span>Avg last 30 days</span>
                    </div>
                </GlassCard>
            </div>

            {/* Retention Heatmap */}
            <div className="mb-10">
                {loading ? (
                    <GlassCard className="flex flex-col items-center justify-center py-20 text-[var(--admin-text-muted)]">
                        <RefreshCw size={32} className="animate-spin mb-4 text-[var(--neon-blue)]" />
                        <p>Loading retention data...</p>
                    </GlassCard>
                ) : error ? (
                    <GlassCard className="flex flex-col items-center justify-center py-20 text-[var(--admin-text-muted)]">
                        <p className="mb-4 text-red-400">{error}</p>
                        <button onClick={fetchData} className={styles.primaryButton}>Retry</button>
                    </GlassCard>
                ) : (
                    <RetentionHeatmap
                        data={cohorts}
                    />
                )}
            </div>
        </div>
    );
}
