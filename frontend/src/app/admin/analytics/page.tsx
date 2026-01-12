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
import RealtimeMetrics from '@/components/admin/analytics/RealtimeMetrics';
import { adminApi, AnalyticsData, FunnelStage, RetentionCohort } from '@/services/adminApi';

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
    <motion.div
      className="metric-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      <div className="metric-header">
        <div className="metric-icon" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <div className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-meta">
        <span className="metric-title">{title}</span>
        <span className="metric-label">{changeLabel}</span>
      </div>

      <style jsx>{`
        .metric-card {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        
        .metric-card:hover {
          border-color: ${color}40;
          box-shadow: 0 0 30px ${color}20;
        }
        
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .metric-change {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        .metric-change.positive {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        .metric-change.negative {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        
        .metric-value {
          font-size: 36px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 8px;
        }
        
        .metric-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .metric-title {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .metric-label {
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </motion.div>
  );
}

interface UserActivityChartProps {
  data: { date: string; dau: number; new_users: number; revenue: number; matches: number; messages: number }[];
}

function UserActivityChart({ data }: UserActivityChartProps) {
  const maxValue = Math.max(...data.map(d => d.dau), 1);

  return (
    <div className="chart-container glass-panel">
      <div className="chart-header">
        <div className="chart-title">
          <BarChart3 size={20} style={{ color: '#3b82f6' }} />
          <h3>Daily Active Users</h3>
        </div>
      </div>

      <div className="bar-chart">
        {data.map((item, index) => (
          <motion.div
            key={item.date}
            className="bar-item"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="bar-wrapper">
              <motion.div
                className="bar"
                style={{ height: `${(item.dau / maxValue) * 100}%` }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="bar-tooltip">{item.dau.toLocaleString()}</div>
              </motion.div>
            </div>
            <span className="bar-label">{item.date.slice(-5)}</span>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .chart-container {
          padding: 24px;
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .chart-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .chart-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .bar-chart {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 200px;
          gap: 8px;
          padding-top: 20px;
        }
        
        .bar-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        
        .bar-wrapper {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        
        .bar {
          width: 100%;
          max-width: 50px;
          background: linear-gradient(180deg, #3b82f6, #1d4ed8);
          border-radius: 8px 8px 0 0;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
          transform-origin: bottom;
          min-height: 4px;
        }
        
        .bar:hover {
          background: linear-gradient(180deg, #60a5fa, #3b82f6);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        
        .bar-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #f1f5f9;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          margin-bottom: 8px;
        }
        
        .bar:hover .bar-tooltip {
          opacity: 1;
        }
        
        .bar-label {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}

interface FunnelChartProps {
  data: FunnelStage[];
}

function FunnelChart({ data }: FunnelChartProps) {
  return (
    <div className="funnel-container glass-panel">
      <div className="funnel-header">
        <div className="funnel-title">
          <Target size={20} style={{ color: '#a855f7' }} />
          <h3>Conversion Funnel</h3>
        </div>
      </div>

      <div className="funnel-chart">
        {data.map((item, index) => {
          const width = 100 - (index * 12);
          const color = `hsl(${260 - index * 20}, 80%, 60%)`;

          return (
            <motion.div
              key={item.stage}
              className="funnel-stage"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="funnel-bar-container">
                <motion.div
                  className="funnel-bar"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}dd)`
                  }}
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="funnel-value">{item.value.toLocaleString()}</span>
                </motion.div>
              </div>
              <div className="funnel-info">
                <span className="funnel-stage-name">{item.stage}</span>
                <span className="funnel-rate">{item.rate.toFixed(1)}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <style jsx>{`
        .funnel-container {
          padding: 24px;
        }
        
        .funnel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .funnel-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .funnel-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .funnel-chart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .funnel-stage {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .funnel-bar-container {
          display: flex;
          justify-content: center;
        }
        
        .funnel-bar {
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .funnel-bar:hover {
          box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
        }
        
        .funnel-value {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        
        .funnel-info {
          display: flex;
          justify-content: space-between;
          padding: 0 8px;
        }
        
        .funnel-stage-name {
          font-size: 13px;
          color: #94a3b8;
        }
        
        .funnel-rate {
          font-size: 13px;
          font-weight: 600;
          color: #10b981;
        }
      `}</style>
    </div>
  );
}

interface RetentionHeatmapProps {
  data: RetentionCohort[];
}

function RetentionHeatmap({ data }: RetentionHeatmapProps) {
  const getCellColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'rgba(30, 41, 59, 0.3)';
    const v = Number(value);
    if (v >= 40) return 'rgba(16, 185, 129, 0.8)';
    if (v >= 30) return 'rgba(16, 185, 129, 0.6)';
    if (v >= 20) return 'rgba(249, 115, 22, 0.6)';
    if (v >= 10) return 'rgba(249, 115, 22, 0.4)';
    return 'rgba(239, 68, 68, 0.4)';
  };

  return (
    <div className="retention-container glass-panel">
      <div className="retention-header">
        <div className="retention-title">
          <Clock size={20} style={{ color: '#10b981' }} />
          <h3>Retention Cohorts</h3>
        </div>
      </div>

      <div className="retention-table">
        <div className="retention-header-row">
          <div className="retention-cell header">Cohort</div>
          <div className="retention-cell header">Day 1</div>
          <div className="retention-cell header">Day 3</div>
          <div className="retention-cell header">Day 7</div>
          <div className="retention-cell header">Day 14</div>
          <div className="retention-cell header">Day 30</div>
        </div>

        {data.map((row, index) => (
          <motion.div
            key={row.cohort}
            className="retention-row"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="retention-cell cohort">{row.cohort}</div>
            <div
              className="retention-cell value"
              style={{ background: getCellColor(row.d1) }}
            >
              {row.d1 !== null ? `${row.d1}%` : '-'}
            </div>
            <div
              className="retention-cell value"
              style={{ background: getCellColor(row.d3) }}
            >
              {row.d3 !== null ? `${row.d3}%` : '-'}
            </div>
            <div
              className="retention-cell value"
              style={{ background: getCellColor(row.d7) }}
            >
              {row.d7 !== null ? `${row.d7}%` : '-'}
            </div>
            <div
              className="retention-cell value"
              style={{ background: getCellColor(row.d14) }}
            >
              {row.d14 !== null ? `${row.d14}%` : '-'}
            </div>
            <div
              className="retention-cell value"
              style={{ background: getCellColor(row.d30) }}
            >
              {row.d30 !== null ? `${row.d30}%` : '-'}
            </div>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .retention-container {
          padding: 24px;
        }
        
        .retention-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .retention-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .retention-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .retention-table {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .retention-header-row,
        .retention-row {
          display: grid;
          grid-template-columns: 100px repeat(5, 1fr);
          gap: 4px;
        }
        
        .retention-cell {
          padding: 12px 16px;
          border-radius: 8px;
          text-align: center;
          font-size: 13px;
        }
        
        .retention-cell.header {
          background: rgba(30, 41, 59, 0.5);
          color: #94a3b8;
          font-weight: 600;
        }
        
        .retention-cell.cohort {
          background: rgba(30, 41, 59, 0.5);
          color: #f1f5f9;
          text-align: left;
          font-weight: 500;
        }
        
        .retention-cell.value {
          color: white;
          font-weight: 600;
          transition: all 0.2s;
          cursor: default;
        }
        
        .retention-cell.value:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}

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
    fetchAnalyticsData();
    fetchRealtimeData();
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
      <div className="analytics-page">
        <div className="error-container glass-panel">
          <h2>Error Loading Analytics</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchAnalyticsData}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
        <style jsx>{`
                    .analytics-page { max-width: 1600px; margin: 0 auto; }
                    .error-container { 
                        padding: 48px; 
                        text-align: center;
                        background: rgba(15, 23, 42, 0.65);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        border-radius: 20px;
                    }
                    .error-container h2 { color: #ef4444; margin-bottom: 12px; }
                    .error-container p { color: #94a3b8; margin-bottom: 24px; }
                    .btn-primary {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 12px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                    }
                `}</style>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Analytics Overview</h1>
          <p>Monitor your platform performance and user engagement</p>
        </div>
        <div className="header-controls">
          <div className="date-selector">
            <Calendar size={16} />
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <button className="btn-icon" onClick={fetchAnalyticsData} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          </button>
          <button className="btn-icon">
            <Filter size={18} />
          </button>
          <button className="btn-primary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <RefreshCw size={32} className="spinning" />
          <p>Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* Realtime Metrics */}
          <div className="realtime-section">
            <RealtimeMetrics
              data={currentRealtimeData || undefined}
              onRefresh={fetchRealtimeData}
              isLoading={realtimeLoading && !isConnected}
            />
          </div>

          {/* Key Metrics */}
          <div className="metrics-grid">
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
              icon={<Eye size={22} />}
              color="#a855f7"
            />
            <MetricCard
              title="New Matches Today"
              value={metrics.matches.toLocaleString()}
              change={12.5}
              changeLabel="vs yesterday"
              icon={<Heart size={22} />}
              color="#ec4899"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${metrics.conversionRate}%`}
              change={-0.3}
              changeLabel="vs last week"
              icon={<Percent size={22} />}
              color="#f97316"
            />
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            <div className="chart-full">
              <UserActivityChart data={analyticsData?.daily_data || []} />
            </div>
            <div className="chart-half">
              <FunnelChart data={funnelData} />
            </div>
            <div className="chart-half">
              <RetentionHeatmap data={retentionData} />
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .analytics-page {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }
        
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .page-header p {
          font-size: 15px;
          color: #94a3b8;
        }
        
        .header-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .date-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          padding: 10px 16px;
          color: #94a3b8;
        }
        
        .date-selector select {
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }
        
        .btn-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-icon:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.4);
          color: #3b82f6;
        }
        
        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px;
          color: #94a3b8;
          gap: 16px;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .realtime-section {
          margin-bottom: 32px;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        
        @media (max-width: 1200px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 600px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        
        .chart-full {
          grid-column: span 2;
        }
        
        .chart-half {
          grid-column: span 1;
        }
        
        @media (max-width: 1000px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .chart-full,
          .chart-half {
            grid-column: span 1;
          }
        }
        
        :global(.glass-panel) {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
