'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { adminApi, DashboardMetrics, type ActivityItem, type ModerationQueueItem } from '@/services/adminApi';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import {
  Users,
  Heart,
  MessageCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  UserPlus,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// Animated counter hook
function useAnimatedNumber(target: number, duration: number = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.floor(startValue + (target - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

interface KPICardProps {
  title: string;
  value: number | string;
  change: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'pink' | 'orange' | 'red';
  suffix?: string;
  prefix?: string;
}

function KPICard({ title, value, change, icon, color, suffix = '', prefix = '' }: KPICardProps) {
  const numericValue = typeof value === 'number' ? value : parseInt(value.replace(/[^0-9]/g, '')) || 0;
  const animatedValue = useAnimatedNumber(numericValue);
  const isPositive = change >= 0;

  const colorMap = {
    blue: { bg: 'rgba(59, 130, 246, 0.15)', glow: '0 0 30px rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
    green: { bg: 'rgba(16, 185, 129, 0.15)', glow: '0 0 30px rgba(16, 185, 129, 0.3)', text: '#10b981' },
    purple: { bg: 'rgba(168, 85, 247, 0.15)', glow: '0 0 30px rgba(168, 85, 247, 0.3)', text: '#a855f7' },
    pink: { bg: 'rgba(236, 72, 153, 0.15)', glow: '0 0 30px rgba(236, 72, 153, 0.3)', text: '#ec4899' },
    orange: { bg: 'rgba(249, 115, 22, 0.15)', glow: '0 0 30px rgba(249, 115, 22, 0.3)', text: '#f97316' },
    red: { bg: 'rgba(239, 68, 68, 0.15)', glow: '0 0 30px rgba(239, 68, 68, 0.3)', text: '#ef4444' },
  };

  const colors = colorMap[color];

  return (
    <motion.div
      className="kpi-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: colors.glow }}
    >
      <div className="kpi-header">
        <div className="kpi-icon" style={{ background: colors.bg, color: colors.text }}>
          {icon}
        </div>
        <div className={`kpi-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="kpi-value">
        {prefix}{typeof value === 'number' ? animatedValue.toLocaleString() : value}{suffix}
      </div>
      <div className="kpi-title">{title}</div>

      <style jsx>{`
        .kpi-card {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        
        .kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .kpi-change {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        .kpi-change.positive {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }
        
        .kpi-change.negative {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }
        
        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .kpi-title {
          font-size: 14px;
          color: #94a3b8;
        }
      `}</style>
    </motion.div>
  );
}

interface LiveActivityFeedProps {
  initialActivities?: ActivityItem[];
  liveActivities: ActivityItem[] | null;
}

function LiveActivityFeed({ initialActivities = [], liveActivities }: LiveActivityFeedProps) {
  // Use live activities if available, otherwise initial
  const activities = liveActivities || initialActivities;

  const iconMap: Record<string, React.ReactNode> = {
    user: <UserPlus size={16} />,
    match: <Heart size={16} />,
    report: <AlertTriangle size={16} />,
    payment: <DollarSign size={16} />,
    moderation: <Shield size={16} />,
  };

  const colorMap: Record<string, string> = {
    user: '#3b82f6',
    match: '#ec4899',
    report: '#f97316',
    payment: '#10b981',
    moderation: '#a855f7',
  };

  return (
    <div className="activity-feed glass-panel">
      <div className="feed-header">
        <Activity size={20} style={{ color: '#3b82f6' }} />
        <h3>Live Activity</h3>
        <span className="live-badge">
          <span className="pulse"></span>
          LIVE
        </span>
      </div>
      <div className="feed-list">
        {activities.length === 0 ? (
          <div className="feed-empty">
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              className="feed-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className="feed-icon"
                style={{
                  background: `${colorMap[activity.type] || '#64748b'}20`,
                  color: colorMap[activity.type] || '#64748b'
                }}
              >
                {iconMap[activity.type] || <Activity size={16} />}
              </div>
              <div className="feed-content">
                <p className="feed-message">{activity.message}</p>
                <span className="feed-time">{activity.time}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <style jsx>{`
                .activity-feed {
                    padding: 24px;
                }
                
                .feed-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                
                .feed-header h3 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #f1f5f9;
                    flex: 1;
                }
                
                .live-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #10b981;
                    background: rgba(16, 185, 129, 0.15);
                    padding: 4px 10px;
                    border-radius: 20px;
                }
                
                .pulse {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
                
                .feed-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .feed-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(30, 41, 59, 0.4);
                    border-radius: 12px;
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    transition: all 0.2s;
                }
                
                .feed-item:hover {
                    background: rgba(30, 41, 59, 0.6);
                    border-color: rgba(148, 163, 184, 0.2);
                }
                
                .feed-item.skeleton {
                    pointer-events: none;
                }
                
                .skeleton-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: rgba(148, 163, 184, 0.2);
                    animation: shimmer 1.5s infinite;
                }
                
                .skeleton-text {
                    width: 80%;
                    height: 14px;
                    background: rgba(148, 163, 184, 0.2);
                    border-radius: 4px;
                    margin-bottom: 8px;
                    animation: shimmer 1.5s infinite;
                }
                
                .skeleton-time {
                    width: 40%;
                    height: 12px;
                    background: rgba(148, 163, 184, 0.15);
                    border-radius: 4px;
                    animation: shimmer 1.5s infinite;
                }
                
                @keyframes shimmer {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
                
                .feed-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .feed-content {
                    flex: 1;
                    min-width: 0;
                }
                
                .feed-message {
                    font-size: 14px;
                    color: #f1f5f9;
                    margin-bottom: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .feed-time {
                    font-size: 12px;
                    color: #64748b;
                }
                
                .feed-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    padding: 24px;
                    text-align: center;
                }
                
                .feed-error p {
                    color: #94a3b8;
                    font-size: 14px;
                }
                
                .feed-error button {
                    padding: 8px 16px;
                    background: rgba(59, 130, 246, 0.15);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 8px;
                    color: #3b82f6;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .feed-error button:hover {
                    background: rgba(59, 130, 246, 0.25);
                }
                
                .feed-empty {
                    padding: 24px;
                    text-align: center;
                }
                
                .feed-empty p {
                    color: #64748b;
                    font-size: 14px;
                }
            `}</style>
    </div>
  );
}

function ModerationQueue() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await adminApi.moderation.getQueue('all', 'all', 'pending', 1, 5);
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  return (
    <div className="moderation-queue glass-panel">
      <div className="queue-header">
        <Shield size={20} style={{ color: '#a855f7' }} />
        <h3>Moderation Queue</h3>
        <span className="queue-count">{total}</span>
      </div>
      <div className="queue-list">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="queue-item skeleton">
              <div className="queue-type skeleton-icon"></div>
              <div className="queue-info">
                <div className="skeleton-text"></div>
                <div className="skeleton-time"></div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="feed-error">
            <p>{error}</p>
            <button onClick={fetchQueue}>Retry</button>
          </div>
        ) : items.length === 0 ? (
          <div className="feed-empty">
            <p>All caught up!</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="queue-item">
              <div className={`queue-type ${item.type}`}>
                {item.type === 'photo' && <Eye size={14} />}
                {item.type === 'report' && <AlertTriangle size={14} />}
                {item.type === 'chat' && <MessageCircle size={14} />}
                {!['photo', 'report', 'chat'].includes(item.type) && <Shield size={14} />}
              </div>
              <div className="queue-info">
                <span className="queue-title">
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Review
                  {item.user_name && <span style={{ opacity: 0.7 }}> - {item.user_name}</span>}
                </span>
                <span className="queue-time">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`queue-score ${item.ai_score >= 80 ? 'high' : item.ai_score >= 50 ? 'medium' : 'low'}`}>
                {item.ai_score}%
              </div>
            </div>
          )))}
      </div>
      <button className="queue-view-all">View All ({total})</button>

      <style jsx>{`
        .moderation-queue {
          padding: 24px;
        }
        
        .queue-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .queue-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          flex: 1;
        }
        
        .queue-count {
          font-size: 12px;
          font-weight: 700;
          color: white;
          background: #a855f7;
          padding: 4px 12px;
          border-radius: 20px;
        }
        
        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .queue-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .queue-item:hover {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(168, 85, 247, 0.3);
        }
        
        .queue-type {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .queue-type.photo {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .queue-type.report {
          background: rgba(249, 115, 22, 0.2);
          color: #f97316;
        }
        
        .queue-type.chat {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        
        .queue-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .queue-title {
          font-size: 14px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .queue-time {
          font-size: 12px;
          color: #64748b;
        }
        
        .queue-score {
          font-size: 13px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
        }
        
        .queue-score.high {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .queue-score.medium {
          background: rgba(249, 115, 22, 0.2);
          color: #f97316;
        }
        
        .queue-score.low {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }
        
        .queue-view-all {
          width: 100%;
          margin-top: 16px;
          padding: 12px;
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 12px;
          color: #a855f7;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .queue-view-all:hover {
          background: rgba(168, 85, 247, 0.2);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
        }
      `}</style>
    </div>
  );
}

function QuickStats() {
  const stats = [
    { label: 'Verified Today', value: 156, icon: <CheckCircle size={16} />, color: '#10b981' },
    { label: 'Pending Queue', value: 24, icon: <Clock size={16} />, color: '#f97316' },
    { label: 'AI Processed', value: 1847, icon: <Zap size={16} />, color: '#a855f7' },
    { label: 'Reports Today', value: 12, icon: <AlertTriangle size={16} />, color: '#ef4444' },
  ];

  return (
    <div className="quick-stats glass-panel">
      <h3>Quick Stats</h3>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="stat-item"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="stat-icon" style={{ color: stat.color, background: `${stat.color}20` }}>
              {stat.icon}
            </div>
            <div className="stat-value">{stat.value.toLocaleString()}</div>
            <div className="stat-label">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .quick-stats {
          padding: 24px;
        }
        
        .quick-stats h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 20px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.2s;
        }
        
        .stat-item:hover {
          background: rgba(30, 41, 59, 0.6);
          transform: translateY(-2px);
        }
        
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Real-time Socket
  const { metrics: liveMetrics, activity: liveActivity, isConnected } = useAdminSocket();

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const data = await adminApi.dashboard.getMetrics();
      setMetrics(data);
      setMetricsError(null);
    } catch (err) {
      setMetricsError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    // No polling here anymore, rely on socket
  }, [fetchMetrics]);

  // Merge rest/socket metrics
  const mergedMetrics = liveMetrics ? { ...metrics, ...liveMetrics } : metrics;

  // Default values when loading or error
  const kpiData = mergedMetrics || {
    total_users: 0,
    active_today: 0,
    new_matches: 0,
    messages_sent: 0,
    revenue_today: 0,
    premium_users: 0,
    pending_moderation: 0,
    reports_today: 0,
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Here&apos;s what&apos;s happening with your platform.</p>
          {isConnected && <span className="socket-status connected">● Real-time</span>}
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={fetchMetrics} disabled={metricsLoading}>
            <BarChart3 size={16} />
            {metricsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn-primary">
            <TrendingUp size={16} />
            View Analytics
          </button>
        </div>
      </div>

      <style jsx>{`
        .socket-status {
            font-size: 12px;
            color: #10b981;
            margin-left: 8px;
        }
      `}</style>

      {/* Error Banner */}
      {metricsError && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{metricsError}</span>
          <button onClick={fetchMetrics}>Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard
          title="Total Users"
          value={kpiData.total_users}
          change={12.5}
          icon={<Users size={22} />}
          color="blue"
        />
        <KPICard
          title="Active Today"
          value={kpiData.active_today}
          change={8.3}
          icon={<Activity size={22} />}
          color="green"
        />
        <KPICard
          title="New Matches"
          value={kpiData.new_matches}
          change={15.2}
          icon={<Heart size={22} />}
          color="pink"
        />
        <KPICard
          title="Messages Sent"
          value={kpiData.messages_sent}
          change={-2.4}
          icon={<MessageCircle size={22} />}
          color="purple"
        />
        <KPICard
          title="Revenue Today"
          value={kpiData.revenue_today}
          change={18.7}
          icon={<DollarSign size={22} />}
          color="green"
          prefix="$"
        />
        <KPICard
          title="Premium Users"
          value={kpiData.premium_users}
          change={5.8}
          icon={<Zap size={22} />}
          color="orange"
        />
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        <div className="grid-left">
          <LiveActivityFeed liveActivities={liveActivity} />
        </div>
        <div className="grid-right">
          <ModerationQueue />
          <QuickStats />
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }
        
        .dashboard-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .dashboard-header p {
          font-size: 15px;
          color: #94a3b8;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        .btn-primary,
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }
        
        .btn-secondary {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #f1f5f9;
        }
        
        .btn-secondary:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(148, 163, 184, 0.4);
        }
        
        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          margin-bottom: 24px;
          color: #fca5a5;
        }
        
        .error-banner span {
          flex: 1;
          font-size: 14px;
        }
        
        .error-banner button {
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 6px;
          color: #fca5a5;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .error-banner button:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        
        @media (max-width: 1400px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 900px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 600px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }
        
        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .grid-left {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .grid-right {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        :global(.glass-panel) {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        
        :global(.glass-panel:hover) {
          border-color: rgba(148, 163, 184, 0.3);
        }
      `}</style>
    </div>
  );
}
