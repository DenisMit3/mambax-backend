'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  Share2,
  TrendingUp,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../admin.module.css';

// Типы данных реферальной программы
interface Referral {
  id: string;
  referrer_name: string;
  referred_name: string;
  date: string;
  status: 'converted' | 'pending' | 'expired';
  reward: string;
}

interface ReferralStats {
  total_refers: number;
  rewards_paid: number;
  conversion_rate: number;
}

interface ReferralsResponse {
  referrals: Referral[];
  stats: ReferralStats;
  total: number;
  page: number;
}

const PAGE_SIZE = 10;

// Конфиг статус-бейджей
const statusConfig: Record<Referral['status'], { label: string; className: string }> = {
  converted: {
    label: 'Converted',
    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  },
  pending: {
    label: 'Ожидание',
    className: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  },
  expired: {
    label: 'Expired',
    className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  },
};

// Карточка статистики
function StatCard({
  icon,
  color,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <GlassCard className="p-5 flex items-center gap-4" hover={false}>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, color }}
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-[var(--admin-text-muted)] uppercase tracking-wide">
          {label}
        </span>
        <span className="text-2xl font-bold text-[var(--admin-text-primary)]">
          {loading ? '...' : value}
        </span>
      </div>
    </GlassCard>
  );
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Загрузка данных с API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.marketing.getReferrals(page);
      setData(res);
    } catch (err) {
      console.error('Ошибка загрузки рефералов:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className={styles.pageContainer}>
      {/* Заголовок страницы */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Referral Program</h1>
          <p className={styles.headerDescription}>
            Track referrals, conversions and rewards
          </p>
        </div>
        <button className={styles.secondaryButton} onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Ошибка */}
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

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard
          icon={<Users size={20} />}
          color="#3b82f6"
          label="Total Refers"
          value={(data?.stats.total_refers ?? 0).toLocaleString()}
          loading={loading}
        />
        <StatCard
          icon={<DollarSign size={20} />}
          color="#10b981"
          label="Rewards Paid"
          value={`$${(data?.stats.rewards_paid ?? 0).toLocaleString()}`}
          loading={loading}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          color="#a855f7"
          label="Conversion Rate"
          value={`${(data?.stats.conversion_rate ?? 0).toFixed(1)}%`}
          loading={loading}
        />
      </div>

      {/* Таблица рефералов */}
      <GlassCard className="p-6 overflow-hidden" hover={false}>
        <div className="flex items-center gap-3 mb-5">
          <Share2 size={20} className="text-[var(--admin-text-muted)]" />
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">
            Recent Referrals
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-[var(--admin-glass-border)] text-[var(--admin-text-muted)] text-sm">
                <th className="p-3 font-medium">Referrer</th>
                <th className="p-3 font-medium">Referred User</th>
                <th className="p-3 font-medium">Дата</th>
                <th className="p-3 font-medium">Статус</th>
                <th className="p-3 font-medium">Reward</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Скелетон загрузки — 5 строк
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--admin-glass-border)]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="p-3">
                        <div className="h-4 w-24 rounded bg-slate-700/50 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.referrals.length ? (
                data.referrals.map((ref) => {
                  const status = statusConfig[ref.status];
                  return (
                    <tr
                      key={ref.id}
                      className="border-b border-[var(--admin-glass-border)] text-sm text-[var(--admin-text-secondary)] hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-3 font-medium text-[var(--admin-text-primary)]">
                        {ref.referrer_name}
                      </td>
                      <td className="p-3">{ref.referred_name}</td>
                      <td className="p-3">
                        {new Date(ref.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="p-3">{ref.reward || '—'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-[var(--admin-text-muted)]"
                  >
                    No referrals found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        {!loading && data && totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-[var(--admin-glass-border)]">
            <span className="text-sm text-[var(--admin-text-muted)]">
              Page {page} of {totalPages} · {data.total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-[var(--admin-glass-border)] text-[var(--admin-text-secondary)] hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
