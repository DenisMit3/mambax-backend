'use client';

import {
  Image,
  MessageCircle,
  AlertTriangle,
  Clock,
  Zap,
  Flag,
  SkipForward,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { QueueItem } from './types';

interface ModerationContentCardProps {
  item: QueueItem;
  onAction: (action: string, item: QueueItem) => void;
  onSelect: (item: QueueItem) => void;
}

const priorityColors = {
  high: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  medium: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  low: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
};

const typeIcons = {
  photo: <Image size={16} />,
  chat: <MessageCircle size={16} />,
  report: <AlertTriangle size={16} />,
};

function getScoreColor(score: number) {
  if (score >= 80) return '#ef4444';
  if (score >= 50) return '#f97316';
  return '#10b981';
}

export function ModerationContentCard({ item, onAction, onSelect }: ModerationContentCardProps) {
  return (
    <GlassCard
      className="p-0 overflow-hidden group hover:border-neon-purple/30 hover:shadow-neon-purple/15 transition-all duration-300"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      layout
    >
      {/* Превью контента */}
      <div className="relative h-[180px] flex items-center justify-center bg-slate-800/50 border-b border-[var(--admin-glass-border)] cursor-pointer" onClick={() => onSelect(item)}>
        {item.type === 'photo' && (
          <div className="flex flex-col items-center gap-2 text-[var(--admin-text-muted)]">
            <Image size={32} />
            <span className="text-xs">Фото контент</span>
          </div>
        )}
        {item.type === 'chat' && (
          <div className="flex flex-col items-center gap-3 p-5 text-center">
            <MessageCircle size={24} className="text-blue-500" />
            <p className="text-[13px] text-[var(--admin-text-muted)] italic">&quot;{item.description || 'Chat message...'}&quot;</p>
          </div>
        )}
        {item.type === 'report' && (
          <div className="flex flex-col items-center gap-3 p-5 text-center">
            <AlertTriangle size={24} className="text-orange-500" />
            <p className="text-[13px] text-[var(--admin-text-muted)] italic">{item.reason || 'Жалоба отправлена'}</p>
          </div>
        )}

        {/* AI Score Badge */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full"
          style={{
            background: `${getScoreColor(item.ai_score)}20`,
            color: getScoreColor(item.ai_score)
          }}
        >
          <Zap size={14} />
          {item.ai_score}%
        </div>
      </div>

      {/* Информация */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase"
            style={{ background: `${priorityColors[item.priority]?.bg || priorityColors.low.bg}`, color: priorityColors[item.priority]?.color || priorityColors.low.color }}
          >
            {typeIcons[item.type] || typeIcons.report}
            <span>{item.type}</span>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-xl uppercase"
            style={priorityColors[item.priority] || priorityColors.low}
          >
            {item.priority}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-neon-blue to-neon-purple">
            {item.user_name?.charAt(0) || 'U'}
          </div>
          <span className="text-sm text-[var(--admin-text-primary)]">{item.user_name || 'Неизвестно'}</span>
        </div>

        {item.ai_flags && item.ai_flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {item.ai_flags.map(flag => (
              <span key={flag} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase bg-red-500/15 text-red-500">
                <Flag size={10} /> {flag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-[var(--admin-text-secondary)]">
          <Clock size={12} />
          {new Date(item.created_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Действия */}
      <div className="flex gap-2 p-3 bg-slate-800/30 border-t border-[var(--admin-glass-border)]">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-neon-green/15 text-neon-green hover:bg-neon-green/30 hover:shadow-neon-green/30"
          onClick={() => onAction('approve', item)}
        >
          <ThumbsUp size={18} />
          <span className="hidden sm:inline">Одобрить</span>
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-[13px] font-medium transition-all bg-primary-red/15 text-primary-red hover:bg-primary-red/30 hover:shadow-primary-red/30"
          onClick={() => onAction('reject', item)}
        >
          <ThumbsDown size={18} />
          <span className="hidden sm:inline">Отклонить</span>
        </button>
        <button
          className="flex-none p-2.5 rounded-xl text-[var(--admin-text-muted)] bg-slate-500/15 hover:bg-slate-500/30 transition-all"
          onClick={() => onAction('skip', item)}
        >
          <SkipForward size={16} />
        </button>
      </div>
    </GlassCard>
  );
}
