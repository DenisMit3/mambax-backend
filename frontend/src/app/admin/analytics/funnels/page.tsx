'use client';

import { useState, useEffect } from 'react';
import { adminApi, FunnelStage } from '@/services/adminApi';
import FunnelChart from '@/components/admin/analytics/FunnelChart';
import { RefreshCw, Download, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

export default function FunnelsPage() {
    const [loading, setLoading] = useState(true);
    const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.analytics.getFunnel();
            setFunnelData(response.funnel || []);
        } catch (err) {
            console.error('Failed to fetch funnel data:', err);
            setError('Failed to load funnel data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to get drop-off rate
    const getDropOff = (current: number, next: number) => {
        if (!current) return 0;
        return ((current - next) / current * 100).toFixed(1);
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerSection}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerTitle}>Conversion Funnels</h1>
                    <p className={styles.headerDescription}>Analyze user conversion rates across key user journeys</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Funnel Chart */}
                <div className="lg:col-span-2">
                    {loading ? (
                        <GlassCard className="flex flex-col items-center justify-center h-full min-h-[400px] text-[var(--admin-text-muted)]">
                            <RefreshCw size={32} className="animate-spin mb-4 text-[var(--neon-blue)]" />
                            <p>Loading funnel data...</p>
                        </GlassCard>
                    ) : error ? (
                        <GlassCard className="flex flex-col items-center justify-center h-full min-h-[400px] text-[var(--admin-text-muted)]">
                            <p className="mb-4 text-red-500">{error}</p>
                            <button onClick={fetchData} className={styles.primaryButton}>Retry</button>
                        </GlassCard>
                    ) : (
                        <FunnelChart
                            data={funnelData}
                            isLoading={loading}
                        />
                    )}
                </div>

                {/* Analysis / Insights Side Panel */}
                <div className="flex flex-col h-full">
                    <GlassCard className="p-6 h-full">
                        <h3 className="flex items-center gap-2.5 text-lg font-semibold text-[var(--admin-text-primary)] mb-6 pb-4 border-b border-[var(--admin-glass-border)]">
                            <Info size={18} className="text-blue-500" />
                            Key Insights
                        </h3>
                        <div className="flex flex-col gap-6">
                            {funnelData.length >= 2 && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs uppercase font-semibold text-[var(--admin-text-muted)] tracking-wider">Largest Drop-off</span>
                                    {funnelData.map((stage, i) => {
                                        if (i === funnelData.length - 1) return null;
                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0] && (
                                            <p className="text-sm text-[var(--admin-text-secondary)] leading-relaxed">
                                                Most users drop off between <strong className="text-[var(--admin-text-primary)]">
                                                    {funnelData.map((stage, i) => {
                                                        if (i === funnelData.length - 1) return null;
                                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0]?.stage}
                                                </strong> and <strong className="text-[var(--admin-text-primary)]">
                                                    {funnelData.map((stage, i) => {
                                                        if (i === funnelData.length - 1) return null;
                                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0]?.next}
                                                </strong> ({
                                                    funnelData.map((stage, i) => {
                                                        if (i === funnelData.length - 1) return null;
                                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0]?.drop
                                                }% Loss)
                                            </p>
                                        )}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <span className="text-xs uppercase font-semibold text-[var(--admin-text-muted)] tracking-wider">Overall Conversion</span>
                                <div className="text-4xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 bg-clip-text text-transparent">
                                    {funnelData.length > 0 ? funnelData[funnelData.length - 1].rate.toFixed(1) : 0}%
                                </div>
                                <p className="text-sm text-[var(--admin-text-muted)]">From {funnelData[0]?.stage} to {funnelData[funnelData.length - 1]?.stage}</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
