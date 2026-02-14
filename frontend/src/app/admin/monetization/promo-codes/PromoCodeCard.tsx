'use client';

import { useState } from 'react';
import {
  Percent,
  DollarSign,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PromoCode } from './types';
import styles from '../../admin.module.css';

// === Скелетон загрузки для карточки ===

export function PromoCardSkeleton() {
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

// === Карточка промокода ===

interface PromoCodeCardProps {
  promo: PromoCode;
  onToggle: (id: string) => void;
  onEdit: (promo: PromoCode) => void;
  toggling: string | null;
}

export function PromoCodeCard({ promo, onToggle, onEdit, toggling }: PromoCodeCardProps) {
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
