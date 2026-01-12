'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  Crown,
  Gift,
  Percent,
  RefreshCw,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Star,
  Target,
  PieChart,
  BarChart3,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { adminApi, RevenueMetrics, TransactionListResponse } from '@/services/adminApi';

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

function MetricCard({ title, value, change, icon, color, loading }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      className="metric-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: `0 0 30px ${color}30` }}
    >
      <div className="metric-header">
        <div className="metric-icon" style={{ background: `${color}20`, color }}>
          {loading ? <Loader2 className="spinner" size={20} /> : icon}
        </div>
        <div className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="metric-value">{loading ? '...' : value}</div>
      <div className="metric-title">{title}</div>

      <style jsx>{`
        .metric-card {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        
        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
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
          font-size: 32px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .metric-title {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

function RevenueChart({ data }: { data: { day: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="revenue-chart glass-panel">
      <div className="chart-header">
        <div className="chart-title">
          <TrendingUp size={20} style={{ color: '#10b981' }} />
          <h3>Revenue Trend</h3>
        </div>
        <select className="chart-select">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="chart-area">
        <svg viewBox="0 0 700 200" className="line-chart">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={200 - y * 2}
              x2="700"
              y2={200 - y * 2}
              stroke="rgba(148, 163, 184, 0.1)"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 200 ${data.map((d, i) =>
              `L ${i * 100 + 50} ${200 - (d.value / maxValue) * 180}`
            ).join(' ')} L 650 200 Z`}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <path
            d={`M ${data.map((d, i) =>
              `${i * 100 + 50} ${200 - (d.value / maxValue) * 180}`
            ).join(' L ')}`}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {data.map((d, i) => (
            <g key={d.day}>
              <circle
                cx={i * 100 + 50}
                cy={200 - (d.value / maxValue) * 180}
                r="6"
                fill="#0a0f1a"
                stroke="#10b981"
                strokeWidth="3"
              />
            </g>
          ))}
        </svg>

        <div className="chart-labels">
          {data.map((d) => (
            <span key={d.day}>{d.day}</span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .revenue-chart {
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
        
        .chart-select {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          padding: 8px 16px;
          color: #f1f5f9;
          font-size: 13px;
          cursor: pointer;
        }
        
        .chart-area {
          position: relative;
        }
        
        .line-chart {
          width: 100%;
          height: 200px;
        }
        
        .chart-labels {
          display: flex;
          justify-content: space-around;
          margin-top: 12px;
        }
        
        .chart-labels span {
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}

function SubscriptionDistribution({ subscriptions, loading }: {
  subscriptions: { free: { count: number; percentage: number }; gold: { count: number; percentage: number }; platinum: { count: number; percentage: number } } | null;
  loading: boolean;
}) {
  const stats = subscriptions || {
    free: { count: 0, percentage: 0 },
    gold: { count: 0, percentage: 0 },
    platinum: { count: 0, percentage: 0 },
  };

  const total = stats.free.count + stats.gold.count + stats.platinum.count;

  return (
    <div className="distribution-chart glass-panel">
      <div className="chart-header">
        <div className="chart-title">
          <PieChart size={20} style={{ color: '#a855f7' }} />
          <h3>Subscription Tiers</h3>
        </div>
      </div>

      <div className="distribution-content">
        <div className="donut-chart">
          {loading ? (
            <div className="loading-donut">
              <Loader2 className="spinner" size={32} />
            </div>
          ) : (
            <>
              <svg viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth="8"
                  strokeDasharray={`${stats.free.percentage * 2.51} 251.2`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f97316"
                  strokeWidth="8"
                  strokeDasharray={`${stats.gold.percentage * 2.51} 251.2`}
                  strokeDashoffset={`-${stats.free.percentage * 2.51}`}
                  transform="rotate(-90 50 50)"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#a855f7"
                  strokeWidth="8"
                  strokeDasharray={`${stats.platinum.percentage * 2.51} 251.2`}
                  strokeDashoffset={`-${(stats.free.percentage + stats.gold.percentage) * 2.51}`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="donut-center">
                <span className="donut-total">{(total / 1000).toFixed(0)}K</span>
                <span className="donut-label">Total</span>
              </div>
            </>
          )}
        </div>

        <div className="distribution-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#94a3b8' }} />
            <div className="legend-info">
              <span className="legend-label">Free</span>
              <span className="legend-value">{stats.free.count.toLocaleString()}</span>
            </div>
            <span className="legend-percentage">{stats.free.percentage.toFixed(1)}%</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f97316' }} />
            <div className="legend-info">
              <span className="legend-label">Gold</span>
              <span className="legend-value">{stats.gold.count.toLocaleString()}</span>
            </div>
            <span className="legend-percentage">{stats.gold.percentage.toFixed(1)}%</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#a855f7' }} />
            <div className="legend-info">
              <span className="legend-label">Platinum</span>
              <span className="legend-value">{stats.platinum.count.toLocaleString()}</span>
            </div>
            <span className="legend-percentage">{stats.platinum.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .distribution-chart {
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
        
        .distribution-content {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        
        .donut-chart {
          position: relative;
          width: 160px;
          height: 160px;
          flex-shrink: 0;
        }
        
        .donut-chart svg {
          width: 100%;
          height: 100%;
        }
        
        .loading-donut {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .donut-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        .donut-total {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .donut-label {
          font-size: 12px;
          color: #64748b;
        }
        
        .distribution-legend {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 4px;
        }
        
        .legend-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .legend-label {
          font-size: 14px;
          color: #f1f5f9;
          font-weight: 500;
        }
        
        .legend-value {
          font-size: 12px;
          color: #64748b;
        }
        
        .legend-percentage {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
          color: #a855f7;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function RecentTransactions({ sources, loading }: {
  sources: { source: string; amount: number; percentage: number }[];
  loading: boolean;
}) {
  const typeIcons: Record<string, React.ReactNode> = {
    'Subscriptions': <Crown size={14} style={{ color: '#a855f7' }} />,
    'Boosts': <Zap size={14} style={{ color: '#f97316' }} />,
    'Super Likes': <Star size={14} style={{ color: '#ec4899' }} />,
    'Gifts': <Gift size={14} style={{ color: '#10b981' }} />,
  };

  return (
    <div className="transactions glass-panel">
      <div className="transactions-header">
        <div className="transactions-title">
          <CreditCard size={20} style={{ color: '#3b82f6' }} />
          <h3>Revenue Sources</h3>
        </div>
      </div>

      <div className="transactions-list">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spinner" size={24} />
            <span>Loading...</span>
          </div>
        ) : (
          sources.map((source, index) => (
            <motion.div
              key={source.source}
              className="transaction-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="tx-icon">
                {typeIcons[source.source] || <DollarSign size={14} />}
              </div>
              <div className="tx-info">
                <span className="tx-user">{source.source}</span>
                <span className="tx-plan">{source.percentage}% of total</span>
              </div>
              <div className="tx-details">
                <span className="tx-amount">${source.amount.toLocaleString()}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <style jsx>{`
        .transactions {
          padding: 24px;
        }
        
        .transactions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .transactions-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .transactions-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px;
          color: #94a3b8;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .transaction-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.2s;
        }
        
        .transaction-item:hover {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(148, 163, 184, 0.2);
        }
        
        .tx-icon {
          width: 36px;
          height: 36px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .tx-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .tx-user {
          font-size: 14px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .tx-plan {
          font-size: 12px;
          color: #64748b;
        }
        
        .tx-details {
          text-align: right;
        }
        
        .tx-amount {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #10b981;
        }
      `}</style>
    </div>
  );
}

function TransactionsTable() {
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, size: 20 });
  const [refundId, setRefundId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.monetization.getTransactions(filters);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRefund = async () => {
    if (!refundId) return;
    try {
      await adminApi.monetization.refundTransaction(refundId, refundReason || "Admin Refund");
      alert("Refunded!");
      setRefundId(null);
      fetchTransactions();
    } catch (e) {
      alert("Error refunding: " + e);
    }
  };

  return (
    <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
      <h3 style={{ color: '#f1f5f9', marginBottom: 16 }}>Transactions</h3>
      <table style={{ width: '100%', color: '#94a3b8', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
            <th style={{ padding: 8 }}>Date</th>
            <th style={{ padding: 8 }}>User</th>
            <th style={{ padding: 8 }}>Amount</th>
            <th style={{ padding: 8 }}>Type</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map(tx => (
            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              <td style={{ padding: 8 }}>{new Date(tx.created_at).toLocaleDateString()}</td>
              <td style={{ padding: 8 }}>{tx.user_id.substring(0, 8)}...</td>
              <td style={{ padding: 8, color: '#10b981' }}>{tx.amount} {tx.currency}</td>
              <td style={{ padding: 8 }}>{tx.metadata?.transaction_type || 'Unknown'}</td>
              <td style={{ padding: 8 }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  background: tx.status === 'completed' ? 'rgba(16,185,129,0.2)' : tx.status === 'refunded' ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.2)',
                  color: tx.status === 'completed' ? '#10b981' : tx.status === 'refunded' ? '#ef4444' : '#94a3b8'
                }}>
                  {tx.status}
                </span>
              </td>
              <td style={{ padding: 8 }}>
                {tx.status === 'completed' && (
                  <button
                    onClick={() => { setRefundId(tx.id); setRefundReason("Requested by User"); }}
                    style={{
                      background: 'rgba(239,68,68,0.2)',
                      color: '#ef4444',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {refundId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ padding: 24, width: 400, background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}>
            <h3 style={{ color: '#fff', marginBottom: 12 }}>Refund Transaction</h3>
            <p style={{ color: '#94a3b8', margin: '0 0 8px 0' }}>Reason for refund:</p>
            <input
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              style={{ width: '100%', padding: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff', marginBottom: 16, borderRadius: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setRefundId(null)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: '1px solid #334155', color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRefund} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Confirm Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MonetizationPage() {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const metrics = await adminApi.monetization.getRevenue();
      setRevenueMetrics(metrics);
    } catch (err) {
      console.error('Error fetching monetization data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load monetization data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate chart data from metrics
  const chartData = [
    { day: 'Mon', value: (revenueMetrics?.today || 0) * 0.8 },
    { day: 'Tue', value: (revenueMetrics?.today || 0) * 0.9 },
    { day: 'Wed', value: (revenueMetrics?.today || 0) * 0.75 },
    { day: 'Thu', value: (revenueMetrics?.today || 0) * 1.1 },
    { day: 'Fri', value: (revenueMetrics?.today || 0) * 1.2 },
    { day: 'Sat', value: (revenueMetrics?.today || 0) * 1.3 },
    { day: 'Sun', value: revenueMetrics?.today || 0 },
  ];

  // Charts Row 

  return (
    <div className="monetization-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Revenue Dashboard</h1>
          <p>Track your platform's financial performance</p>
        </div>
        <div className="header-actions">
          <div className="date-selector">
            <Calendar size={16} />
            <select>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>Year to Date</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn-secondary">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Today's Revenue"
          value={`$${(revenueMetrics?.today || 0).toLocaleString()}`}
          change={18.7}
          icon={<DollarSign size={20} />}
          color="#10b981"
          loading={loading}
        />
        <MetricCard
          title="Weekly Revenue"
          value={`$${(revenueMetrics?.week || 0).toLocaleString()}`}
          change={12.3}
          icon={<TrendingUp size={20} />}
          color="#3b82f6"
          loading={loading}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${(revenueMetrics?.month || 0).toLocaleString()}`}
          change={8.5}
          icon={<BarChart3 size={20} />}
          color="#a855f7"
          loading={loading}
        />
        <MetricCard
          title="Yearly Revenue"
          value={`$${(revenueMetrics?.year || 0).toLocaleString()}`}
          change={24.2}
          icon={<Target size={20} />}
          color="#ec4899"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <RevenueChart data={chartData} />
        <SubscriptionDistribution
          subscriptions={revenueMetrics?.subscription_breakdown || null}
          loading={loading}
        />
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        <RecentTransactions
          sources={revenueMetrics?.revenue_sources || []}
          loading={loading}
        />

        {/* Key Metrics */}
        <div className="key-metrics glass-panel">
          <h3>Key Metrics</h3>
          <div className="metrics-list">
            <div className="metric-row">
              <span className="metric-label">ARPU</span>
              <span className="metric-val">${(revenueMetrics?.arpu || 0).toFixed(2)}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">ARPPU</span>
              <span className="metric-val">${(revenueMetrics?.arppu || 0).toFixed(2)}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Conversion Rate</span>
              <span className="metric-val">
                {revenueMetrics?.subscription_breakdown?.gold?.percentage !== undefined
                  ? (revenueMetrics.subscription_breakdown.gold.percentage + revenueMetrics.subscription_breakdown.platinum.percentage).toFixed(1)
                  : '0'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <TransactionsTable />

      <style jsx>{`
        .monetization-page {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
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
        
        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        
        .date-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
        }
        
        .date-selector select {
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
          outline: none;
        }
        
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary:hover {
          background: rgba(30, 41, 59, 0.8);
        }
        
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          margin-bottom: 24px;
          color: #ef4444;
        }
        
        .error-banner button {
          margin-left: auto;
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #ef4444;
          cursor: pointer;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
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
        
        .charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1100px) {
          .charts-row {
            grid-template-columns: 1fr;
          }
        }
        
        .bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        @media (max-width: 900px) {
          .bottom-row {
            grid-template-columns: 1fr;
          }
        }
        
        .glass-panel {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
        }
        
        .key-metrics {
          padding: 24px;
        }
        
        .key-metrics h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 20px;
        }
        
        .metrics-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
        }
        
        .metric-label {
          font-size: 14px;
          color: #94a3b8;
        }
        
        .metric-val {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
      `}</style>
    </div>
  );
}
