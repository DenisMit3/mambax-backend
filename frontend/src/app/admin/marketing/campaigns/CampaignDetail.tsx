'use client';

// === Модалка аналитики кампании ===

import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Campaign, typeConfig, statusConfig, formatNumber } from './types';

interface CampaignDetailModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export function CampaignDetailModal({ campaign, onClose }: CampaignDetailModalProps) {
  const type = typeConfig[campaign.type];
  const status = statusConfig[campaign.status];

  const metrics = [
    { label: 'Sent', value: campaign.sent ?? 0 },
    { label: 'Delivered', value: campaign.delivered ?? 0 },
    { label: 'Opened', value: campaign.opened ?? 0 },
    { label: 'Clicked', value: campaign.clicked ?? 0 },
    { label: 'Converted', value: campaign.converted ?? 0 },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px]"
      >
        <GlassCard className="w-full max-h-[90vh] overflow-y-auto">
          {/* Заголовок */}
          <div className="flex justify-between items-center p-5 border-b border-[var(--admin-glass-border)]">
            <div className="flex items-center gap-3">
              <BarChart3 size={20} className="text-purple-400" />
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">Campaign Analytics</h3>
            </div>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 transition-colors"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Название и тип */}
            <div>
              <h4 className="text-xl font-bold text-[var(--admin-text-primary)] mb-2">{campaign.name}</h4>
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${type.color}20`, color: type.color }}
                >
                  {type.icon} {type.label}
                </span>
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold capitalize"
                  style={{ backgroundColor: status.bg, color: status.color }}
                >
                  {campaign.status}
                </span>
              </div>
            </div>

            {/* Сегмент */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users size={14} />
              <span>Segment: <span className="text-[var(--admin-text-primary)] capitalize">{campaign.target_segment.replace(/_/g, ' ')}</span></span>
            </div>

            {/* Даты */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/40 rounded-xl">
                <div className="text-[10px] text-slate-500 mb-1">Created</div>
                <div className="text-sm text-[var(--admin-text-primary)]">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </div>
              </div>
              {campaign.scheduled_at && (
                <div className="p-3 bg-slate-800/40 rounded-xl">
                  <div className="text-[10px] text-slate-500 mb-1">Scheduled</div>
                  <div className="text-sm text-[var(--admin-text-primary)]">
                    {new Date(campaign.scheduled_at).toLocaleString()}
                  </div>
                </div>
              )}
              {campaign.completed_at && (
                <div className="p-3 bg-slate-800/40 rounded-xl">
                  <div className="text-[10px] text-slate-500 mb-1">Завершено</div>
                  <div className="text-sm text-[var(--admin-text-primary)]">
                    {new Date(campaign.completed_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Метрики */}
            {campaign.sent != null && (
              <div>
                <h5 className="text-sm font-semibold text-slate-400 mb-3">Performance Metrics</h5>
                <div className="grid grid-cols-3 gap-3">
                  {metrics.map((m) => (
                    <div key={m.label} className="text-center p-3 bg-slate-800/40 rounded-xl">
                      <div className="text-lg font-bold text-[var(--admin-text-primary)]">{formatNumber(m.value)}</div>
                      <div className="text-[10px] text-slate-500">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rates */}
            {(campaign.open_rate != null || campaign.ctr != null || campaign.conversion_rate != null) && (
              <div className="grid grid-cols-3 gap-3">
                {campaign.open_rate != null && (
                  <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="text-lg font-bold text-emerald-400">{campaign.open_rate}%</div>
                    <div className="text-[10px] text-slate-500">Open Rate</div>
                  </div>
                )}
                {campaign.ctr != null && (
                  <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="text-lg font-bold text-blue-400">{campaign.ctr}%</div>
                    <div className="text-[10px] text-slate-500">CTR</div>
                  </div>
                )}
                {campaign.conversion_rate != null && (
                  <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="text-lg font-bold text-purple-400">{campaign.conversion_rate}%</div>
                    <div className="text-[10px] text-slate-500">Конверсия</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Футер */}
          <div className="flex justify-end p-5 border-t border-[var(--admin-glass-border)]">
            <button
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
