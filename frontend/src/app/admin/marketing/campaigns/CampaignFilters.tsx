'use client';

// === Фильтры кампаний по статусу и типу ===

interface CampaignFiltersProps {
  filterStatus: string;
  filterType: string;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

export function CampaignFilters({ filterStatus, filterType, onStatusChange, onTypeChange }: CampaignFiltersProps) {
  const selectClass = 'px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500';

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-400">Status:</label>
        <select
          className={selectClass}
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">Все</option>
          <option value="draft">Черновик</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Активна</option>
          <option value="paused">Paused</option>
          <option value="completed">Завершено</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-400">Type:</label>
        <select
          className={selectClass}
          value={filterType}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="push">Push</option>
          <option value="email">Email</option>
          <option value="in_app">In-App</option>
          <option value="sms">SMS</option>
        </select>
      </div>
    </div>
  );
}
