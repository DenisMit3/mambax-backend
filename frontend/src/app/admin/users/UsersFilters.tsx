'use client';

import { Search, X, LayoutGrid, LayoutList } from 'lucide-react';
import { FilterState, ViewMode } from './types';

interface UsersFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onResetPage: () => void;
}

export default function UsersFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  onResetPage,
}: UsersFiltersProps) {
  // Обновление фильтра с автосбросом страницы (кроме поиска)
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
    if (key !== 'search') {
      onResetPage();
    }
  };

  const selectClass =
    'bg-white/5 border border-white/10 rounded-xl text-white text-sm px-3 py-2.5 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer min-w-[140px]';

  return (
    <div className="bg-[#0f1225]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Поиск */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Поиск по имени, email, ID..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-sm pl-10 pr-9 py-2.5 placeholder:text-white/30 focus:border-blue-500 focus:outline-none"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Фильтр по статусу */}
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className={selectClass}
        >
          <option value="all" className="bg-[#1a1a2e] text-white">Все статусы</option>
          <option value="active" className="bg-[#1a1a2e] text-white">Активен</option>
          <option value="suspended" className="bg-[#1a1a2e] text-white">Приостановлен</option>
          <option value="banned" className="bg-[#1a1a2e] text-white">Заблокирован</option>
          <option value="pending" className="bg-[#1a1a2e] text-white">Ожидание</option>
        </select>

        {/* Фильтр по подписке */}
        <select
          value={filters.subscription}
          onChange={(e) => updateFilter('subscription', e.target.value)}
          className={selectClass}
        >
          <option value="all" className="bg-[#1a1a2e] text-white">Все планы</option>
          <option value="free" className="bg-[#1a1a2e] text-white">Бесплатный</option>
          <option value="gold" className="bg-[#1a1a2e] text-white">Gold</option>
          <option value="platinum" className="bg-[#1a1a2e] text-white">Platinum</option>
        </select>

        {/* Фильтр по верификации */}
        <select
          value={filters.verified}
          onChange={(e) => updateFilter('verified', e.target.value)}
          className={selectClass}
        >
          <option value="all" className="bg-[#1a1a2e] text-white">Все</option>
          <option value="verified" className="bg-[#1a1a2e] text-white">Верифицирован</option>
          <option value="unverified" className="bg-[#1a1a2e] text-white">Не верифицирован</option>
        </select>

        {/* Фильтр по fraud-риску */}
        <select
          value={filters.fraudRisk}
          onChange={(e) => updateFilter('fraudRisk', e.target.value)}
          className={selectClass}
        >
          <option value="all" className="bg-[#1a1a2e] text-white">Все риски</option>
          <option value="low" className="bg-[#1a1a2e] text-white">Низкий</option>
          <option value="medium" className="bg-[#1a1a2e] text-white">Средний</option>
          <option value="high" className="bg-[#1a1a2e] text-white">Высокий</option>
        </select>

        {/* Разделитель */}
        <div className="w-px h-8 bg-white/10" />

        {/* Переключатель вида */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewModeChange('table')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
            title="Таблица"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
            title="Сетка"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
