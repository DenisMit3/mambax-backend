'use client';

import { Tag, Users, DollarSign, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PromoStats, formatStatValue } from './types';

interface PromoCodeStatsProps {
  stats: PromoStats | null;
  loading: boolean;
}

// Панель статистики промокодов
export function PromoCodeStatsBar({ stats, loading }: PromoCodeStatsProps) {
  const items = [
    { label: 'Active Codes', value: stats ? formatStatValue(stats.active, 'number') : '—', icon: <Tag size={18} />, color: '#10b981' },
    { label: 'Total Redemptions', value: stats ? formatStatValue(stats.total_redemptions, 'number') : '—', icon: <Users size={18} />, color: '#3b82f6' },
    { label: 'Revenue Generated', value: stats ? formatStatValue(stats.revenue_generated, 'currency') : '—', icon: <DollarSign size={18} />, color: '#a855f7' },
    { label: 'Avg. Conversion', value: stats ? formatStatValue(stats.avg_conversion, 'percent') : '—', icon: <TrendingUp size={18} />, color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {items.map((stat) => (
        <GlassCard
          key={stat.label}
          className={`p-5 flex items-center gap-4 ${loading ? 'animate-pulse' : ''}`}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-opacity-20" style={{ backgroundColor: `${stat.color}33`, color: stat.color }}>
            {stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
