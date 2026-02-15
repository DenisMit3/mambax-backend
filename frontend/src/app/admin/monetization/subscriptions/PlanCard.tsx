'use client';

import { Crown, CheckCircle, XCircle, Edit, Star } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../../admin.module.css';
import type { Plan } from './types';

const featureLabels: Record<string, string> = {
    unlimited_swipes: 'Безлимитные свайпы',
    see_who_likes_you: 'Кто тебя лайкнул',
    boosts_per_month: 'Бустов/месяц',
    super_likes_per_day: 'Суперлайков/день',
    incognito_mode: 'Режим инкогнито',
    advanced_filters: 'Расширенные фильтры',
};

const tierColors = {
    free: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
    gold: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
    platinum: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
};

export function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: (plan: Plan) => void }) {
    const colors = tierColors[plan.tier as keyof typeof tierColors] || tierColors.free;
    const features = plan.features || {};

    return (
        <GlassCard className="p-6 relative transition-transform duration-300 hover:scale-[1.01]"
            style={{ borderColor: colors.border, borderWidth: '2px' }}>
            {plan.tier === 'gold' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-semibold rounded-full shadow-lg">
                    <Star size={12} fill="white" /> Самый популярный
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    style={{ background: colors.bg, color: colors.color }}>
                    <Crown size={14} /> {plan.tier}
                </div>
                <button className={styles.iconButton} onClick={() => onEdit(plan)}>
                    <Edit size={14} />
                </button>
            </div>
            <h3 className="text-2xl font-bold text-[var(--admin-text-primary)] mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-0.5 mb-5">
                <span className="text-4xl font-bold text-[var(--admin-text-primary)]">{plan.price}</span>
                <span className="text-lg text-[var(--admin-text-muted)] ml-1">{plan.currency}</span>
                {plan.duration > 0 && <span className="text-sm text-[var(--admin-text-muted)] ml-1">/{plan.duration} days</span>}
            </div>
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-[var(--admin-glass-border)] mb-4">
                <div className="text-center">
                    <span className="block text-lg font-bold text-[var(--admin-text-primary)]">{plan.subscribers.toLocaleString()}</span>
                    <span className="text-[11px] text-[var(--admin-text-muted)]">Подписчики</span>
                </div>
                <div className="text-center">
                    <span className="block text-lg font-bold text-[var(--admin-text-primary)]">{Math.round(plan.mrr).toLocaleString()}</span>
                    <span className="text-[11px] text-[var(--admin-text-muted)]">Расч. доход</span>
                </div>
            </div>
            <div className="flex flex-col gap-2 mb-4">
                {Object.entries(features).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-[var(--admin-text-muted)]">{featureLabels[key] || key.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-[var(--admin-text-primary)]">
                            {typeof value === 'boolean' ? (
                                value ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-slate-500" />
                            ) : (value === 999 ? '∞' : value)}
                        </span>
                    </div>
                ))}
            </div>
            <div className="text-center">
                {plan.isActive ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500"><CheckCircle size={12} /> Активен</span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-500"><XCircle size={12} /> Неактивен</span>
                )}
            </div>
        </GlassCard>
    );
}
