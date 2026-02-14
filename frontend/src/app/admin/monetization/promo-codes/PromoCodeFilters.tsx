'use client';

import { PromoFilter } from './types';

interface PromoCodeFiltersProps {
  filter: PromoFilter;
  onFilterChange: (filter: PromoFilter) => void;
}

// Фильтры промокодов (all / active / expired)
export function PromoCodeFilters({ filter, onFilterChange }: PromoCodeFiltersProps) {
  const filters: PromoFilter[] = ['all', 'active', 'expired'];

  return (
    <div className="flex gap-2 mb-6">
      {filters.map((f) => (
        <button
          key={f}
          className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${filter === f
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
            }`}
          onClick={() => onFilterChange(f)}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
  );
}
