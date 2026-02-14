'use client';

// === Карточки статистики кампаний + скелетон загрузки ===

import {
  Megaphone,
  Send,
  MousePointerClick,
  Target,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CampaignStatsData, formatNumber } from './types';

// --- Скелетон загрузки карточки ---

export function CampaignCardSkeleton() {
  return (
    <GlassCard className="p-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-7 w-20 bg-slate-700/40 rounded-full" />
        <div className="h-6 w-16 bg-slate-700/40 rounded-full" />
      </div>
      <div className="h-5 w-48 bg-slate-700/40 rounded mb-2" />
      <div className="h-4 w-32 bg-slate-700/40 rounded mb-4" />
      <div className="grid grid-cols-4 gap-3 py-4 border-t border-b border-slate-700/20 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-5 w-10 bg-slate-700/40 rounded" />
            <div className="h-3 w-8 bg-slate-700/40 rounded" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-slate-700/40 rounded-lg" />
        <div className="h-8 w-24 bg-slate-700/40 rounded-lg" />
      </div>
    </GlassCard>
  );
}

// --- Компонент статистики ---

interface CampaignStatsProps {
  stats: CampaignStatsData | null;
  loading: boolean;
}

export function CampaignStats({ stats, loading }: CampaignStatsProps) {
  const items = [
    { label: 'Active Campaigns', value: stats ? stats.active.toString() : '—', icon: <Megaphone size={18} />, color: '#10b981' },
    { label: 'Total Sent (Week)', value: stats ? formatNumber(stats.total_sent_week) : '—', icon: <Send size={18} />, color: '#3b82f6' },
    { label: 'Avg Open Rate', value: stats ? `${stats.avg_open_rate}%` : '—', icon: <MousePointerClick size={18} />, color: '#a855f7' },
    { label: 'Conversions', value: stats ? formatNumber(stats.conversions) : '—', icon: <Target size={18} />, color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {items.map((stat) => (
        <GlassCard
          key={stat.label}
          className={`p-5 flex items-center gap-4 ${loading ? 'animate-pulse' : ''}`}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
          >
            {stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
