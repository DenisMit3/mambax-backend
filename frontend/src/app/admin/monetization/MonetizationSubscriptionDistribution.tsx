'use client';

import { PieChart, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export interface SubscriptionTier {
  count: number;
  percentage: number;
}

export interface SubscriptionDistributionProps {
  subscriptions: {
    free: SubscriptionTier;
    gold: SubscriptionTier;
    platinum: SubscriptionTier;
  } | null;
  loading: boolean;
}

/** Круговая диаграмма распределения подписок */
export function MonetizationSubscriptionDistribution({ subscriptions, loading }: SubscriptionDistributionProps) {
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
          <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Уровни подписок</h3>
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
                <span className="text-xs text-[var(--admin-text-muted)]">Всего</span>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded bg-slate-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[var(--admin-text-primary)]">Бесплатный</div>
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
