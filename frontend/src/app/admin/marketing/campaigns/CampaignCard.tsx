'use client';

// === Карточка кампании ===

import {
  Send,
  Pause,
  Play,
  Copy,
  BarChart3,
  Calendar,
  Users,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Campaign, typeConfig, statusConfig, formatNumber } from './types';

interface CampaignCardProps {
  campaign: Campaign;
  onAction: (id: string, action: string) => void;
  actionLoading: string | null;
}

export function CampaignCard({ campaign, onAction, actionLoading }: CampaignCardProps) {
  const type = typeConfig[campaign.type];
  const status = statusConfig[campaign.status];
  const isLoading = actionLoading === campaign.id;

  return (
    <GlassCard className={`p-6 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`} hover>
      {/* Тип + статус */}
      <div className="flex justify-between items-center mb-4">
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${type.color}20`, color: type.color }}
        >
          {type.icon}
          {type.label}
        </span>
        <span
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold capitalize"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          {campaign.status === 'active' && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
          {campaign.status}
        </span>
      </div>

      {/* Название */}
      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-2">{campaign.name}</h3>

      {/* Сегмент */}
      <div className="flex items-center gap-2 text-sm text-slate-500 capitalize mb-4">
        <Users size={14} />
        <span>{campaign.target_segment.replace(/_/g, ' ')}</span>
      </div>

      {/* Метрики */}
      {campaign.sent != null && (
        <div className="grid grid-cols-4 gap-3 py-4 border-t border-b border-[var(--admin-glass-border)] mb-4">
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {formatNumber(campaign.sent)}
            </span>
            <span className="text-[10px] text-slate-500">Sent</span>
          </div>
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {campaign.open_rate ?? 0}%
            </span>
            <span className="text-[10px] text-slate-500">Open Rate</span>
          </div>
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {campaign.ctr ?? 0}%
            </span>
            <span className="text-[10px] text-slate-500">CTR</span>
          </div>
          <div className="text-center">
            <span className="block text-base font-bold text-[var(--admin-text-primary)]">
              {campaign.converted ?? 0}
            </span>
            <span className="text-[10px] text-slate-500">Converted</span>
          </div>
        </div>
      )}

      {/* Запланировано */}
      {campaign.scheduled_at && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-500/10 rounded-xl text-blue-400 text-sm mb-4">
          <Calendar size={14} />
          <span>Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}</span>
        </div>
      )}

      {/* Действия */}
      <div className="flex gap-2 flex-wrap">
        {campaign.status === 'draft' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
            onClick={() => onAction(campaign.id, 'send')}
          >
            <Send size={14} /> Send Now
          </button>
        )}
        {campaign.status === 'active' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 transition-colors"
            onClick={() => onAction(campaign.id, 'pause')}
          >
            <Pause size={14} /> Pause
          </button>
        )}
        {campaign.status === 'paused' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            onClick={() => onAction(campaign.id, 'resume')}
          >
            <Play size={14} /> Resume
          </button>
        )}
        {campaign.status === 'completed' && (
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-colors"
            onClick={() => onAction(campaign.id, 'duplicate')}
          >
            <Copy size={14} /> Duplicate
          </button>
        )}
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
          onClick={() => onAction(campaign.id, 'view')}
        >
          <BarChart3 size={14} /> Analytics
        </button>
      </div>
    </GlassCard>
  );
}
