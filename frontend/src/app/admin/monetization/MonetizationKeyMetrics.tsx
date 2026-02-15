'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { RevenueMetrics } from '@/services/admin';

export interface KeyMetricsProps {
  revenueMetrics: RevenueMetrics | null;
}

/** Блок ключевых метрик: ARPU, ARPPU, конверсия */
export function MonetizationKeyMetrics({ revenueMetrics }: KeyMetricsProps) {
  return (
    <GlassCard className="p-6 h-full">
      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-5">Ключевые метрики</h3>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)]">
          <span className="text-sm text-[var(--admin-text-muted)]">ARPU (Средний доход на пользователя)</span>
          <span className="text-lg font-semibold text-[var(--admin-text-primary)]">${(revenueMetrics?.arpu || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)]">
          <span className="text-sm text-[var(--admin-text-muted)]">ARPPU (Средний доход на платящего)</span>
          <span className="text-lg font-semibold text-[var(--admin-text-primary)]">${(revenueMetrics?.arppu || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center p-3.5 bg-slate-800/40 rounded-xl border border-[var(--admin-glass-border)]">
          <span className="text-sm text-[var(--admin-text-muted)]">Конверсия (в платные)</span>
          <span className="text-lg font-semibold text-[var(--admin-text-primary)]">
            {revenueMetrics?.subscription_breakdown?.gold?.percentage !== undefined
              ? (revenueMetrics.subscription_breakdown.gold.percentage + revenueMetrics.subscription_breakdown.platinum.percentage).toFixed(1)
              : '0'}%
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
