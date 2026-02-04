'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Crown,
  Gift,
  RefreshCw,
  Calendar,
  Download,
  Zap,
  Star,
  Target,
  PieChart,
  BarChart3,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { adminApi, RevenueMetrics, TransactionListResponse } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../admin.module.css';

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
    <GlassCard
      className="p-6 flex flex-col h-full hover:shadow-[0_0_30px_rgba(var(--color-rgb),0.1)] transition-all duration-300"
      style={{ '--color-rgb': color } as any}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `${color}20`, color }}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : icon}
        </div>
        <div
          className={`flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-full ${isPositive ? 'bg-neon-green/15 text-neon-green' : 'bg-primary-red/15 text-primary-red'
            }`}
        >
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="text-3xl font-bold text-[var(--admin-text-primary)] mb-1">{loading ? '...' : value}</div>
      <div className="text-sm text-[var(--admin-text-muted)]">{title}</div>
    </GlassCard>
  );
}

function RevenueChart({ data }: { data: { day: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-emerald-500" />
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Revenue Trend</h3>
        </div>
        <select className="bg-slate-800/50 border border-[var(--admin-glass-border)] rounded-xl px-4 py-2 text-sm text-[var(--admin-text-primary)] outline-none cursor-pointer hover:border-[var(--admin-glass-border-hover)] transition-colors">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </div>

      <div className="relative w-full h-[200px]">
        <svg viewBox="0 0 700 200" className="w-full h-full overflow-visible">
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

        <div className="flex justify-around mt-3">
          {data.map((d) => (
            <span key={d.day} className="text-xs text-[var(--admin-text-secondary)]">{d.day}</span>
          ))}
        </div>
      </div>
    </GlassCard>
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
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <PieChart size={20} className="text-purple-500" />
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Subscription Tiers</h3>
        </div>
      </div>

      <div className="flex items-center gap-8 h-full">
        <div className="relative w-40 h-40 shrink-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
          ) : (
            <>
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth="8"
                  strokeDasharray={`${stats.free.percentage * 2.51} 251.2`}
                  strokeDashoffset="0"
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
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="block text-2xl font-bold text-[var(--admin-text-primary)]">{(total / 1000).toFixed(0)}K</span>
                <span className="text-xs text-[var(--admin-text-muted)]">Total</span>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded bg-slate-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--admin-text-primary)]">Free</div>
              <div className="text-xs text-[var(--admin-text-muted)]">{stats.free.count.toLocaleString()}</div>
            </div>
            <span className="text-sm font-semibold text-[var(--admin-text-muted)]">{stats.free.percentage.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded bg-neon-orange" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--admin-text-primary)]">Gold</div>
              <div className="text-xs text-[var(--admin-text-muted)]">{stats.gold.count.toLocaleString()}</div>
            </div>
            <span className="text-sm font-semibold text-[var(--admin-text-muted)]">{stats.gold.percentage.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded bg-neon-purple" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--admin-text-primary)]">Platinum</div>
              <div className="text-xs text-[var(--admin-text-muted)]">{stats.platinum.count.toLocaleString()}</div>
            </div>
            <span className="text-sm font-semibold text-[var(--admin-text-muted)]">{stats.platinum.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function RecentTransactions({ sources, loading }: {
  sources: { source: string; amount: number; percentage: number }[];
  loading: boolean;
}) {
  const typeIcons: Record<string, React.ReactNode> = {
    'Subscriptions': <Crown size={14} className="text-neon-purple" />,
    'Boosts': <Zap size={14} className="text-neon-orange" />,
    'Super Likes': <Star size={14} className="text-neon-pink" />,
    'Gifts': <Gift size={14} className="text-neon-green" />,
  };

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <CreditCard size={20} className="text-neon-blue" />
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Revenue Sources</h3>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-[var(--admin-text-muted)]">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading...</span>
          </div>
        ) : (
          sources.map((source, index) => (
            <motion.div
              key={source.source}
              className="flex items-center gap-3.5 p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)] hover:bg-slate-800/60 transition-colors"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800/50 border border-[var(--admin-glass-border)]">
                {typeIcons[source.source] || <DollarSign size={14} />}
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-sm font-medium text-[var(--admin-text-primary)]">{source.source}</span>
                <span className="text-xs text-[var(--admin-text-muted)]">{source.percentage}% of total</span>
              </div>
              <div className="text-sm font-semibold text-neon-green">
                ${source.amount.toLocaleString()}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </GlassCard>
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
    <GlassCard className="mt-6 p-6 overflow-hidden">
      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-4">Transactions</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-[var(--admin-glass-border)] text-[var(--admin-text-muted)] text-sm">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(tx => (
              <tr key={tx.id} className="border-b border-[var(--admin-glass-border)] text-sm text-[var(--admin-text-secondary)] hover:bg-slate-800/30">
                <td className="p-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                <td className="p-3">{tx.user_id.substring(0, 8)}...</td>
                <td className="p-3 font-medium text-neon-green">{tx.amount} {tx.currency}</td>
                <td className="p-3">{tx.metadata?.transaction_type || 'Unknown'}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${tx.status === 'completed' ? 'bg-neon-green/20 text-neon-green' :
                      tx.status === 'refunded' ? 'bg-primary-red/20 text-primary-red' :
                        'bg-slate-500/20 text-slate-400'
                      }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="p-3">
                  {tx.status === 'completed' && (
                    <button
                      onClick={() => { setRefundId(tx.id); setRefundReason("Requested by User"); }}
                      className="px-2 py-1 rounded text-xs font-medium bg-primary-red/10 text-primary-red hover:bg-primary-red/20 transition-colors"
                    >
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {refundId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md p-6 bg-[#1e293b] border-slate-700">
            <h3 className="text-lg font-bold text-white mb-3">Refund Transaction</h3>
            <p className="text-sm text-slate-400 mb-2">Reason for refund:</p>
            <input
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white mb-4 focus:border-blue-500 outline-none transition-colors"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRefundId(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 text-white hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                className="px-4 py-2 rounded-lg bg-primary-red text-white hover:bg-primary-red/90 transition-colors text-sm font-medium border border-transparent"
              >
                Confirm Refund
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </GlassCard>
  )
}

export default function MonetizationPage() {
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [period, setPeriod] = useState("30d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metrics, trend] = await Promise.all([
        adminApi.monetization.getRevenue(),
        adminApi.monetization.getTrend(period)
      ]);
      setRevenueMetrics(metrics);
      setTrendData(trend.trend);
    } catch (err) {
      console.error('Error fetching monetization data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load monetization data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate chart data from metrics
  const chartData = trendData.length > 0
    ? trendData.map(d => ({
      day: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      value: d.revenue
    })).slice(-7) // Show last 7 for the simple chart, or keep all
    : [
      { day: 'Mon', value: 0 },
      { day: 'Tue', value: 0 },
      { day: 'Wed', value: 0 },
      { day: 'Thu', value: 0 },
      { day: 'Fri', value: 0 },
      { day: 'Sat', value: 0 },
      { day: 'Sun', value: 0 },
    ];

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Revenue Dashboard</h1>
          <p className={styles.headerDescription}>Track your platform's financial performance</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-[var(--admin-glass-border)] rounded-xl text-[var(--admin-text-primary)]">
            <Calendar size={16} className="text-[var(--admin-text-muted)]" />
            <select
              className="bg-transparent border-none text-sm outline-none cursor-pointer"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <button className={styles.secondaryButton} onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className={styles.secondaryButton}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <GlassCard className="flex items-center gap-3 p-4 mb-6 border-primary-red/30 text-primary-red">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button
            onClick={fetchData}
            className="ml-auto px-3 py-1.5 bg-primary-red/10 border border-primary-red/20 rounded-lg text-sm hover:bg-primary-red/20 transition-colors"
          >
            Retry
          </button>
        </GlassCard>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 h-[350px]">
          <RevenueChart data={chartData} />
        </div>
        <div className="h-[350px]">
          <SubscriptionDistribution
            subscriptions={revenueMetrics?.subscription_breakdown || null}
            loading={loading}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions
          sources={revenueMetrics?.revenue_sources || []}
          loading={loading}
        />

        {/* Key Metrics */}
        <GlassCard className="p-6 h-full">
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-5">Key Metrics</h3>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)]">
              <span className="text-sm text-[var(--admin-text-muted)]">ARPU (Average Revenue Per User)</span>
              <span className="text-lg font-semibold text-[var(--admin-text-primary)]">${(revenueMetrics?.arpu || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)]">
              <span className="text-sm text-[var(--admin-text-muted)]">ARPPU (Average Revenue Per Paying User)</span>
              <span className="text-lg font-semibold text-[var(--admin-text-primary)]">${(revenueMetrics?.arppu || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)]">
              <span className="text-sm text-[var(--admin-text-muted)]">Conversion Rate (to Paid)</span>
              <span className="text-lg font-semibold text-[var(--admin-text-primary)]">
                {revenueMetrics?.subscription_breakdown?.gold?.percentage !== undefined
                  ? (revenueMetrics.subscription_breakdown.gold.percentage + revenueMetrics.subscription_breakdown.platinum.percentage).toFixed(1)
                  : '0'}%
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      <TransactionsTable />
    </div>
  );
}
