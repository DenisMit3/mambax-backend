'use client';

import { Search, X, MoreVertical, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { FilterState, ViewMode } from './types';

interface UsersFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onResetPage: () => void;
}

// Панель фильтров и поиска
export function UsersFilters({ filters, onFiltersChange, viewMode, onViewModeChange, onResetPage }: UsersFiltersProps) {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
    if (key !== 'search') onResetPage();
  };

  return (
    <GlassCard className="p-4 mb-6 sticky top-[80px] z-20 bg-[var(--admin-glass-bg)] backdrop-blur-xl border border-[var(--admin-glass-border)] rounded-2xl">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        {/* Поиск */}
        <div className="relative flex-1 min-w-[300px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)]" />
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-[var(--admin-text-primary)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans text-sm"
          />
          {filters.search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]" onClick={() => updateFilter('search', '')}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Селекты фильтров + переключатель вида */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none min-w-[120px]"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активен</option>
            <option value="suspended">Приостановлен</option>
            <option value="banned">Заблокирован</option>
            <option value="pending">Ожидание</option>
          </select>

          <select
            value={filters.subscription}
            onChange={(e) => updateFilter('subscription', e.target.value)}
            className="px-3 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none min-w-[120px]"
          >
            <option value="all">Все планы</option>
            <option value="free">Бесплатный</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>

          <select
            value={filters.verified}
            onChange={(e) => updateFilter('verified', e.target.value)}
            className="px-3 py-2.5 bg-[var(--admin-glass-bg-light)] border border-[var(--admin-glass-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none min-w-[120px]"
          >
            <option value="all">Все верификации</option>
            <option value="verified">Верифицирован</option>
            <option value="unverified">Не верифицирован</option>
          </select>

          <div className="h-8 w-px bg-[var(--admin-glass-border)] mx-1" />

          {/* Переключатель table/grid */}
          <div className="flex bg-[var(--admin-glass-bg-light)] rounded-lg p-1 border border-[var(--admin-glass-border)]">
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-[var(--admin-glass-bg-hover)] text-[var(--admin-text-primary)] shadow-sm' : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]'}`}
            >
              <MoreVertical size={18} className="rotate-90" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[var(--admin-glass-bg-hover)] text-[var(--admin-text-primary)] shadow-sm' : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text-primary)]'}`}
            >
              <Users size={18} />
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
