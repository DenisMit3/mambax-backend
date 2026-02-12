'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Percent,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  ToggleLeft,
  ToggleRight,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

// Интерфейс промокода (snake_case от API)
interface PromoCode {
  id: string;
  code: string;
  name: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_trial';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  first_purchase_only: boolean;
  applicable_plans: string[];
  revenue_generated: number;
}

// Статистика из API
interface PromoStats {
  active: number;
  total_redemptions: number;
  revenue_generated: number;
  avg_conversion: number;
}

// Ответ API
interface PromoListResponse {
  promo_codes: PromoCode[];
  stats: PromoStats;
}

// Форматирование чисел для статистики
function formatStatValue(value: number, type: 'number' | 'currency' | 'percent'): string {
  if (type === 'currency') {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  }
  if (type === 'percent') return `${value}%`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

// Скелетон загрузки для карточки
function PromoCardSkeleton() {
  return (
    <GlassCard className="p-6 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-9 w-32 bg-slate-700/40 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-7 w-7 bg-slate-700/40 rounded" />
          <div className="h-7 w-7 bg-slate-700/40 rounded" />
        </div>
      </div>
      <div className="h-6 w-40 bg-slate-700/40 rounded mb-3" />
      <div className="h-14 w-full bg-slate-700/40 rounded-xl mb-4" />
      <div className="space-y-3 mb-4">
        <div className="h-4 w-full bg-slate-700/40 rounded" />
        <div className="h-4 w-3/4 bg-slate-700/40 rounded" />
        <div className="h-4 w-1/2 bg-slate-700/40 rounded" />
      </div>
      <div className="flex justify-center">
        <div className="h-7 w-20 bg-slate-700/40 rounded-full" />
      </div>
    </GlassCard>
  );
}

// Компонент статистики
function PromoStatsBar({ stats, loading }: { stats: PromoStats | null; loading: boolean }) {
  const items = [
    { label: 'Active Codes', value: stats ? formatStatValue(stats.active, 'number') : '—', icon: <Tag size={18} />, color: '#10b981' },
    { label: 'Total Redemptions', value: stats ? formatStatValue(stats.total_redemptions, 'number') : '—', icon: <Users size={18} />, color: '#3b82f6' },
    { label: 'Revenue Generated', value: stats ? formatStatValue(stats.revenue_generated, 'currency') : '—', icon: <DollarSign size={18} />, color: '#a855f7' },
    { label: 'Avg. Conversion', value: stats ? formatStatValue(stats.avg_conversion, 'percent') : '—', icon: <TrendingUp size={18} />, color: '#f59e0b' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {items.map((stat) => (
        <GlassCard
          key={stat.label}
          className={`p-5 flex items-center gap-4 ${loading ? 'animate-pulse' : ''}`}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-opacity-20" style={{ backgroundColor: `${stat.color}33`, color: stat.color }}>
            {stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
            <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// Карточка промокода
function PromoCodeCard({ promo, onToggle, onEdit, toggling }: {
  promo: PromoCode;
  onToggle: (id: string) => void;
  onEdit: (promo: PromoCode) => void;
  toggling: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(promo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDiscountDisplay = () => {
    if (promo.discount_type === 'percentage') {
      return `${promo.discount_value}% OFF`;
    } else if (promo.discount_type === 'fixed_amount') {
      return `$${promo.discount_value} OFF`;
    } else {
      return `${promo.discount_value} Days Free`;
    }
  };

  const usagePercent = promo.max_uses ? (promo.current_uses / promo.max_uses) * 100 : 0;
  const isExpired = new Date(promo.valid_until) < new Date();
  const isExhausted = promo.max_uses && promo.current_uses >= promo.max_uses;
  const isToggling = toggling === promo.id;

  return (
    <GlassCard
      className={`p-6 transition-opacity duration-300 ${!promo.is_active ? 'opacity-75' : ''}`}
      hover={true}
    >
      <div className="flex justify-between items-center mb-4">
        <div
          className="flex items-center gap-2 px-3 py-2 bg-purple-500/15 border border-purple-500/30 rounded-lg text-purple-400 cursor-pointer hover:bg-purple-500/25 transition-colors group"
          onClick={copyCode}
        >
          <span className="font-mono font-bold text-sm tracking-widest">{promo.code}</span>
          {copied ? <CheckCircle size={14} /> : <Copy size={14} className="opacity-70 group-hover:opacity-100" />}
        </div>
        <div className="flex gap-2">
          <button className={styles.iconButton} onClick={() => onEdit(promo)}>
            <Edit size={14} />
          </button>
          <button
            className={`bg-transparent border-none cursor-pointer transition-colors ${promo.is_active ? 'text-emerald-500' : 'text-slate-500'} ${isToggling ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => onToggle(promo.id)}
            disabled={isToggling}
          >
            {promo.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-[var(--admin-text-primary)] mb-3">{promo.name}</h3>

      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 rounded-xl text-emerald-500 text-xl font-bold mb-4">
        {promo.discount_type === 'percentage' && <Percent size={20} />}
        {promo.discount_type === 'fixed_amount' && <DollarSign size={20} />}
        {promo.discount_type === 'free_trial' && <Gift size={20} />}
        <span>{getDiscountDisplay()}</span>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-between py-2 border-b border-[var(--admin-glass-border)]">
          <span className="text-sm text-[var(--admin-text-muted)]">Redemptions</span>
          <span className="text-sm font-medium text-[var(--admin-text-primary)]">
            {promo.current_uses.toLocaleString()}
            {promo.max_uses && ` / ${promo.max_uses.toLocaleString()}`}
          </span>
        </div>

        {promo.max_uses && (
          <div className="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${usagePercent}%`,
                background: usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : '#10b981'
              }}
            />
          </div>
        )}

        <div className="flex justify-between py-2 border-b border-[var(--admin-glass-border)]">
          <span className="text-sm text-[var(--admin-text-muted)]">Valid Until</span>
          <span className="text-sm font-medium text-[var(--admin-text-primary)]">
            {new Date(promo.valid_until).toLocaleDateString()}
          </span>
        </div>

        <div className="flex justify-between py-2">
          <span className="text-sm text-[var(--admin-text-muted)]">Revenue Generated</span>
          <span className="text-sm font-bold text-emerald-500">${promo.revenue_generated.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {promo.first_purchase_only && (
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-slate-700/30 text-slate-400">First Purchase</span>
        )}
        {promo.applicable_plans.map(plan => (
          <span
            key={plan}
            className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-slate-700/30 ${plan === 'gold' ? 'text-amber-500 bg-amber-500/10' :
              plan === 'platinum' ? 'text-purple-500 bg-purple-500/10' : 'text-slate-400'
              }`}
          >
            {plan}
          </span>
        ))}
      </div>

      <div className="flex justify-center mt-auto">
        {isExpired ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/50 text-slate-400"><Clock size={12} /> Expired</span>
        ) : isExhausted ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/50 text-slate-400"><XCircle size={12} /> Fully Used</span>
        ) : promo.is_active ? (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500"><CheckCircle size={12} /> Active</span>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-500"><Clock size={12} /> Paused</span>
        )}
      </div>
    </GlassCard>
  );
}

// Модалка создания промокода
function CreatePromoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: '',
    valid_from: '',
    valid_until: '',
    first_purchase_only: false,
    applicable_plans: ['gold', 'platinum']
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.monetization.promoCodes.create({
        code: formData.code,
        name: formData.name,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : undefined,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : undefined,
        first_purchase_only: formData.first_purchase_only,
        applicable_plans: formData.applicable_plans,
      });
      onCreated();
      onClose();
    } catch {
      setError('Не удалось создать промокод. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <GlassCard
        className="w-full max-w-lg overflow-hidden"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-[var(--admin-glass-border)]">
          <h3 className="text-xl font-semibold text-[var(--admin-text-primary)]">Create Promo Code</h3>
          <button className={styles.iconButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Promo Code</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Campaign Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Summer Sale"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Discount Type</label>
              <select
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="free_trial">Free Trial (days)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">
                {formData.discount_type === 'percentage' ? 'Percentage' :
                  formData.discount_type === 'fixed_amount' ? 'Amount ($)' : 'Days'}
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Valid From</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[var(--admin-text-muted)]">Valid Until</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[var(--admin-text-muted)]">Max Uses (leave empty for unlimited)</label>
            <input
              type="number"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-purple-500"
              value={formData.max_uses}
              onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
              placeholder="Unlimited"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="firstPurchaseOnly"
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-600"
              checked={formData.first_purchase_only}
              onChange={(e) => setFormData({ ...formData, first_purchase_only: e.target.checked })}
            />
            <label htmlFor="firstPurchaseOnly" className="text-sm text-[var(--admin-text-secondary)]">First purchase only</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-[var(--admin-glass-border)]">
          <button className={styles.secondaryButton} onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={submitting || !formData.code || !formData.name}
          >
            {submitting ? 'Creating...' : 'Create Promo Code'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Загрузка данных с API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.monetization.promoCodes.list(filter) as PromoListResponse;
      setPromoCodes(data.promo_codes);
      setStats(data.stats);
    } catch {
      setError('Не удалось загрузить промокоды');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Переключение активности промокода
  const togglePromo = async (id: string) => {
    setToggling(id);
    try {
      await adminApi.monetization.promoCodes.toggle(id);
      await fetchData();
    } catch {
      // Откат не нужен — данные перезагрузятся
    } finally {
      setToggling(null);
    }
  };

  // Фильтрация на клиенте (дополнительно к серверной)
  const filteredPromos = promoCodes.filter(p => {
    if (filter === 'active') return p.is_active;
    if (filter === 'expired') return !p.is_active || new Date(p.valid_until) < new Date();
    return true;
  });

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Promo Codes</h1>
          <p className={styles.headerDescription}>Create and manage discount campaigns</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Create Code
        </button>
      </div>

      {/* Stats */}
      <PromoStatsBar stats={stats} loading={loading} />

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'expired'] as const).map((f) => (
          <button
            key={f}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${filter === f
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
              }`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-[var(--admin-text-muted)]">{error}</p>
          <button className={styles.secondaryButton} onClick={fetchData}>
            <RefreshCw size={14} />
            Повторить
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PromoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Promo Codes Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPromos.map((promo) => (
            <PromoCodeCard
              key={promo.id}
              promo={promo}
              onToggle={togglePromo}
              onEdit={() => { }}
              toggling={toggling}
            />
          ))}
          {filteredPromos.length === 0 && (
            <div className="col-span-full text-center py-16 text-[var(--admin-text-muted)]">
              Промокоды не найдены
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePromoModal
            onClose={() => setShowCreateModal(false)}
            onCreated={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
