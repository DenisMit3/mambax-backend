'use client';

import { useState } from 'react';
import { X, ToggleLeft, ToggleRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from '../../../admin.module.css';
import type { Plan } from './types';

export function PlanEditor({ plan, onClose, onSave, onDelete }: {
    plan: Plan | null; onClose: () => void;
    onSave: (plan: Plan) => void; onDelete?: (id: string) => void;
}) {
    const [editedPlan, setEditedPlan] = useState<Plan>(plan || {
        id: '', name: '', tier: 'gold', price: 0, currency: 'XTR',
        duration: 30, subscribers: 0, mrr: 0, isActive: true, isPopular: false,
        features: {
            unlimited_swipes: false, see_who_likes_you: false,
            boosts_per_month: 0, super_likes_per_day: 0,
            incognito_mode: false, advanced_filters: false,
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <GlassCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-[var(--admin-glass-border)]">
                    <h3 className="text-xl font-semibold text-[var(--admin-text-primary)]">
                        {plan ? 'Редактировать план' : 'Создать план'}
                    </h3>
                    <button className={styles.iconButton} onClick={onClose}><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-[var(--admin-text-muted)] font-medium">Название плана</label>
                            <input type="text"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                                value={editedPlan.name}
                                onChange={(e) => setEditedPlan({ ...editedPlan, name: e.target.value })}
                                placeholder="Gold Plus" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-[var(--admin-text-muted)] font-medium">Уровень</label>
                            <select className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                                value={editedPlan.tier}
                                onChange={(e) => setEditedPlan({ ...editedPlan, tier: e.target.value as 'free' | 'gold' | 'platinum' })}>
                                <option value="free">Бесплатный</option>
                                <option value="gold">Gold</option>
                                <option value="platinum">Platinum</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-[var(--admin-text-muted)] font-medium">Цена (XTR)</label>
                            <input type="number"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                                value={editedPlan.price}
                                onChange={(e) => setEditedPlan({ ...editedPlan, price: parseFloat(e.target.value) })}
                                step="1" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-[var(--admin-text-muted)] font-medium">Длительность (дни)</label>
                            <input type="number"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-[var(--admin-text-primary)] focus:outline-none focus:border-blue-500"
                                value={editedPlan.duration}
                                onChange={(e) => setEditedPlan({ ...editedPlan, duration: parseInt(e.target.value) })} />
                        </div>
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-[var(--admin-text-primary)] mb-4">Функции</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(editedPlan.features).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl">
                                    <span className="text-sm text-[var(--admin-text-muted)] capitalize">{key.replace(/_/g, ' ')}</span>
                                    {typeof value === 'boolean' ? (
                                        <button className={`transition-colors ${value ? 'text-emerald-500' : 'text-slate-600'}`}
                                            onClick={() => setEditedPlan({
                                                ...editedPlan, features: { ...editedPlan.features, [key]: !value }
                                            })}>
                                            {value ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        </button>
                                    ) : (
                                        <input type="number" value={value as number}
                                            onChange={(e) => setEditedPlan({
                                                ...editedPlan, features: { ...editedPlan.features, [key]: parseInt(e.target.value) }
                                            })}
                                            className="w-16 px-2 py-1 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-center text-[var(--admin-text-primary)]" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center p-5 border-t border-[var(--admin-glass-border)]">
                    <div>
                        {plan && onDelete && (
                            <button className="px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                onClick={() => { if (confirm('Вы уверены, что хотите удалить этот план?')) { onDelete(plan.id); } }}>
                                Удалить план
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button className={styles.secondaryButton} onClick={onClose}>Отмена</button>
                        <button className={styles.primaryButton} onClick={() => onSave(editedPlan)}>
                            {plan ? 'Сохранить' : 'Создать план'}
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
