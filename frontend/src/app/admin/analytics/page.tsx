'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Heart,
  MessageCircle,
  DollarSign,
  Clock,
  Target,
  Percent,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const RealtimeMetrics = dynamic(() => import('@/components/admin/analytics/RealtimeMetrics'), {
  loading: () => <div className="h-32 animate-pulse bg-slate-800/50 rounded-xl" />,
  ssr: false
});
import { adminApi, AnalyticsData, FunnelStage, RetentionCohort } from '@/services/adminApi';

import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../admin.module.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, change, changeLabel, icon, color }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <GlassCard className="p-6 flex flex-col h-full bg-[var(--admin-glass-bg)] hover:bg-[var(--admin-glass-bg-hover)] border-[var(--admin-glass-border)]">
      <div className="flex justify-between items-start mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300"
          style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-full ${isPositive
          ? 'bg-emerald-500/15 text-emerald-500'
          : 'bg-red-500/15 text-red-500'
          }`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="text-4xl font-bold text-[var(--admin-text-primary)] mb-2 tracking-tight">{value}</div>
      <div className="flex justify-between items-center mt-auto">
        <span className="text-sm text-[var(--admin-text-secondary)] font-medium">{title}</span>
        <span className="text-xs text-[var(--admin-text-muted)]">{changeLabel}</span>
      </div>
    </GlassCard>
  );
}

interface UserActivityChartProps {
  data: { date: string; dau: number; new_users: number; revenue: number; matches: number; messages: number }[];
}

function UserActivityChart({ data }: UserActivityChartProps) {
  const maxValue = Math.max(...data.map(d => d.dau), 1);

  return (
    <GlassCard className="p-6 h-full border-[var(--admin-glass-border)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <BarChart3 size={20} style={{ color: '#3b82f6' }} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Daily Active Users</h3>
        </div>
      </div>

      <div className="flex justify-between items-end h-[200px] gap-2 pt-5">
        {data.map((item, index) => (
          <motion.div
            key={item.date}
            className="flex-1 flex flex-col items-center h-full group"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex-1 w-full flex items-end justify-center relative">
              <motion.div
                className="w-full max-w-[50px] bg-gradient-to-b from-blue-500 to-blue-700 rounded-t-md relative cursor-pointer min-h-[4px] transition-all duration-200 group-hover:from-blue-400 group-hover:to-blue-600 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                style={{ height: `${(item.dau / maxValue) * 100}%` }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 rounded-lg py-1.5 px-3 text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity mb-2 pointer-events-none z-10">
                  {item.dau.toLocaleString()}
                </div>
              </motion.div>
            </div>
            <span className="text-[11px] text-[var(--admin-text-muted)] mt-3">{item.date.slice(-5)}</span>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

const FunnelChart = dynamic(() => import('@/components/admin/analytics/FunnelChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center bg-[var(--admin-glass-bg)] border border-[var(--admin-glass-border)] rounded-2xl animate-pulse text-[var(--admin-text-muted)]">Loading funnel...</div>
});
const RetentionHeatmap = dynamic(() => import('@/components/admin/analytics/RetentionHeatmap'), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center bg-[var(--admin-glass-bg)] border border-[var(--admin-glass-border)] rounded-2xl animate-pulse text-[var(--admin-text-muted)]">Loading retention...</div>
});
const GeoHeatmap = dynamic(() => import('@/components/admin/analytics/GeoHeatmap'), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-[var(--admin-glass-bg)] border border-[var(--admin-glass-border)] rounded-2xl animate-pulse text-[var(--admin-text-muted)]">Loading geo...</div>
});
const LtvPrediction = dynamic(() => import('@/components/admin/analytics/LtvPrediction'), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-[var(--admin-glass-bg)] border border-[var(--admin-glass-border)] rounded-2xl animate-pulse text-[var(--admin-text-muted)]">Loading LTV...</div>
});

interface RealtimeData {
  timestamp: string;
  active_now: number;
  dau: number;
  wau: number;
  mau: number;
  trend: { dau_change: number; wau_change: number; mau_change: number };
}

import { useAdminSocket } from '@/hooks/useAdminSocket';

// ... (imports)

// ... (MetricCard, UserActivityChart, etc components remain)

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics data states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionCohort[]>([]);
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [realtimeLoading, setRealtimeLoading] = useState(false);

  // Live socket data
  const { analytics: liveAnalytics, isConnected } = useAdminSocket();

  // Calculate date range
  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }, [dateRange]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();

      const [overviewRes, funnelRes, retentionRes] = await Promise.all([
        adminApi.analytics.getOverview(startDate, endDate),
        adminApi.analytics.getFunnel(),
        adminApi.analytics.getRetention()
      ]);

      setAnalyticsData(overviewRes);
      setFunnelData(funnelRes.funnel || []);
      setRetentionData(retentionRes.cohorts || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  // Fetch realtime data (fallback)
  const fetchRealtimeData = useCallback(async () => {
    // Only fetch if not connected via socket to avoid redundant requests
    if (isConnected) return;

    setRealtimeLoading(true);
    try {
      const data = await adminApi.analytics.getRealtime();
      setRealtimeData(data);
    } catch (err) {
      console.error('Failed to fetch realtime metrics:', err);
    } finally {
      setRealtimeLoading(false);
    }
  }, [isConnected]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAnalyticsData(), fetchRealtimeData()]).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [fetchAnalyticsData, fetchRealtimeData]);

  // Refresh on date range change
  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, fetchAnalyticsData]);

  // Use live data if available, else fallback
  const currentRealtimeData = liveAnalytics || realtimeData;

  // Calculate metrics from analytics data (or use live)
  const getMetrics = () => {
    // Prefer live data for headline metrics
    if (currentRealtimeData && currentRealtimeData.dau) {
      return {
        dau: currentRealtimeData.dau,
        mau: currentRealtimeData.mau,
        matches: currentRealtimeData.matches || (analyticsData?.daily_data[analyticsData.daily_data.length - 1]?.matches || 0),
        conversionRate: analyticsData && analyticsData.totals.total_users > 0
          ? ((analyticsData.totals.new_users / analyticsData.totals.total_users) * 100).toFixed(1)
          : 0
      };
    }

    if (!analyticsData) {
      return {
        dau: 0,
        mau: 0,
        matches: 0,
        conversionRate: 0
      };
    }

    const latestDay = analyticsData.daily_data[analyticsData.daily_data.length - 1];
    return {
      dau: latestDay?.dau || 0,
      mau: analyticsData.totals.active_users || 0,
      matches: latestDay?.matches || 0,
      conversionRate: analyticsData.totals.total_users > 0
        ? ((analyticsData.totals.new_users / analyticsData.totals.total_users) * 100).toFixed(1)
        : 0
    };
  };

  const metrics = getMetrics();

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto p-4">
        <GlassCard className="p-12 text-center border-red-500/30">
          <h2 className="text-xl font-bold text-red-500 mb-3">Error Loading Analytics</h2>
          <p className="text-[var(--admin-text-secondary)] mb-6">{error}</p>
          <button className={styles.primaryButton} onClick={fetchAnalyticsData}>
            <RefreshCw size={16} />
            Retry
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Analytics Overview</h1>
          <p className={styles.headerDescription}>Monitor your platform performance and user engagement</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl px-4 py-2">
            <Calendar size={16} className="text-[var(--admin-text-secondary)]" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none outline-none text-[var(--admin-text-primary)] text-sm"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <button className={styles.iconButton} onClick={fetchAnalyticsData} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className={styles.primaryButton} onClick={async () => {
            const { startDate, endDate } = getDateRange();
            try {
              await adminApi.analytics.exportData(startDate, endDate, 'csv');
            } catch (e) {
              console.error('Export failed:', e);
            }
          }}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--admin-text-muted)]">
          <RefreshCw size={32} className="animate-spin mb-4 text-[var(--neon-blue)]" />
          <p>Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* Realtime Metrics */}
          <div className="mb-8">
            <RealtimeMetrics
              data={currentRealtimeData || undefined}
              onRefresh={fetchRealtimeData}
              isLoading={realtimeLoading && !isConnected}
            />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <MetricCard
              title="Daily Active Users"
              value={metrics.dau.toLocaleString()}
              change={realtimeData?.trend?.dau_change || 0}
              changeLabel="vs last week"
              icon={<Users size={22} />}
              color="#3b82f6"
            />
            <MetricCard
              title="Monthly Active Users"
              value={metrics.mau.toLocaleString()}
              change={realtimeData?.trend?.mau_change || 0}
              changeLabel="vs last month"
              icon={<Calendar size={22} />}
              color="#a855f7"
            />
            <MetricCard
              title="Total Matches"
              value={metrics.matches.toLocaleString()}
              change={5.2}
              changeLabel="vs last week"
              icon={<Heart size={22} />}
              color="#ec4899"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${metrics.conversionRate}%`}
              change={-1.1}
              changeLabel="vs last week"
              icon={<Percent size={22} />}
              color="#10b981"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 min-h-[300px]">
              {analyticsData && (
                <UserActivityChart data={analyticsData.daily_data} />
              )}
            </div>
            <div className="min-h-[300px]">
              <FunnelChart data={funnelData} />
            </div>
          </div>

          {/* Retention Row */}
          <div className="grid grid-cols-1 mb-8">
            <RetentionHeatmap data={retentionData} />
          </div>

          {/* Geo Heatmap Row */}
          <div className="grid grid-cols-1 mb-8">
            <GeoHeatmap />
          </div>

          {/* LTV Prediction Row */}
          <div className="grid grid-cols-1 mb-8">
            <LtvPrediction />
          </div>
        </>
      )}
    </div>
  );
}

