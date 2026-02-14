'use client';

import { Clock, Eye, CheckCircle, XCircle, Zap, TrendingUp, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { ModerationStats as ModerationStatsType } from '@/services/adminApi';

interface ModerationStatsProps {
  stats: ModerationStatsType | null;
  loading: boolean;
}

export function ModerationStats({ stats, loading }: ModerationStatsProps) {
  const displayStats = [
    { label: 'Ожидание', value: stats?.pending ?? 0, icon: <Clock size={18} />, color: '#f97316' },
    { label: 'Проверено сегодня', value: stats?.today_reviewed ?? 0, icon: <Eye size={18} />, color: '#3b82f6' },
    { label: 'Одобрено', value: stats?.approved ?? 0, icon: <CheckCircle size={18} />, color: '#10b981' },
    { label: 'Отклонено', value: stats?.rejected ?? 0, icon: <XCircle size={18} />, color: '#ef4444' },
    { label: 'AI обработано', value: stats?.ai_processed ?? 0, icon: <Zap size={18} />, color: '#a855f7' },
    { label: 'Точность', value: stats ? `${stats.accuracy}%` : '0%', icon: <TrendingUp size={18} />, color: '#10b981' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {displayStats.map((stat, index) => (
        <GlassCard
          key={stat.label}
          className="flex items-center gap-3.5 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${stat.color}20`, color: stat.color }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[var(--admin-text-primary)]">{loading ? '...' : stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
