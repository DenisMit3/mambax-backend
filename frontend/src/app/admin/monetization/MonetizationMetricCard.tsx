'use client';

import { Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

/** Карточка метрики с индикатором изменения */
export function MonetizationMetricCard({ title, value, change, icon, color, loading }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <GlassCard
      className="p-6 flex flex-col h-full hover:shadow-[0_0_30px_rgba(var(--color-rgb),0.1)] transition-all duration-300"
      style={{ '--color-rgb': color } as React.CSSProperties}
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
