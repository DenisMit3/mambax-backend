'use client';

import { Image, MessageCircle, AlertTriangle, Filter } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { QueueItem, ContentFilter, PriorityFilter } from './types';

interface ModerationFiltersProps {
  filter: ContentFilter;
  priority: PriorityFilter;
  queue: QueueItem[];
  onFilterChange: (filter: ContentFilter) => void;
  onPriorityChange: (priority: PriorityFilter) => void;
}

export function ModerationFilters({ filter, priority, queue, onFilterChange, onPriorityChange }: ModerationFiltersProps) {
  return (
    <GlassCard className="flex flex-wrap items-center justify-between gap-4 p-4 mb-6">
      <div className="flex gap-2 p-1.5 bg-slate-800/50 rounded-xl border border-[var(--admin-glass-border)]">
        {(['all', 'photo', 'chat', 'report'] as const).map((type) => (
          <button
            key={type}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all ${filter === type
              ? 'bg-purple-500/20 text-purple-500'
              : 'text-[var(--admin-text-muted)] hover:bg-slate-700/30 hover:text-[var(--admin-text-primary)]'
              }`}
            onClick={() => onFilterChange(type)}
          >
            {type === 'all' && 'Все'}
            {type === 'photo' && <><Image size={14} /> Фото</>}
            {type === 'chat' && <><MessageCircle size={14} /> Чат</>}
            {type === 'report' && <><AlertTriangle size={14} /> Жалобы</>}
            <span className={`px-2 py-0.5 rounded-md text-[11px] ${filter === type ? 'bg-purple-500/30' : 'bg-slate-700/50'}`}>
              {type === 'all'
                ? queue.length
                : queue.filter(i => i.type === type).length}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as PriorityFilter)}
          className="pl-4 pr-10 py-2.5 bg-slate-800/50 border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none cursor-pointer hover:border-[var(--admin-glass-border-hover)] transition-colors appearance-none"
        >
          <option value="all">Все приоритеты</option>
          <option value="high">Высокий приоритет</option>
          <option value="medium">Средний приоритет</option>
          <option value="low">Низкий приоритет</option>
        </select>
        <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none" />
      </div>
    </GlassCard>
  );
}
