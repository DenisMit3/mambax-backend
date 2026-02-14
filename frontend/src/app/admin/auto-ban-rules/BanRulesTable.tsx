'use client';

import { motion } from 'framer-motion';
import { Edit, Trash2, ToggleLeft, ToggleRight, Bot, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { type AutoBanRule, getTriggerInfo, getActionInfo, formatDuration } from './types';

interface BanRulesTableProps {
    rules: AutoBanRule[];
    loading: boolean;
    onEdit: (rule: AutoBanRule) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
}

// Список правил автобана с загрузкой и пустым состоянием
export function BanRulesTable({ rules, loading, onEdit, onDelete, onToggle }: BanRulesTableProps) {
    if (loading) {
        return (
            <div className="text-slate-500" style={{ textAlign: 'center', padding: '3rem' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '0.5rem' }}>Загрузка правил...</p>
            </div>
        );
    }

    if (rules.length === 0) {
        return (
            <GlassCard>
                <div className="text-slate-500" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Bot size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Нет правил автоматической блокировки</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Создайте первое правило для автоматизации модерации</p>
                </div>
            </GlassCard>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rules.map((rule, i) => {
                const trigger = getTriggerInfo(rule.trigger_type);
                const action = getActionInfo(rule.action);
                return (
                    <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <GlassCard>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem' }}>
                                {/* Переключатель */}
                                <button
                                    onClick={() => onToggle(rule.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                                    title={rule.is_enabled ? 'Отключить' : 'Включить'}
                                >
                                    {rule.is_enabled
                                        ? <ToggleRight size={28} className="text-emerald-500" />
                                        : <ToggleLeft size={28} className="text-slate-600" />
                                    }
                                </button>

                                {/* Иконка триггера */}
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: `${trigger.color}20`, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    <span style={{ color: trigger.color }}>{trigger.icon}</span>
                                </div>

                                {/* Информация */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '0.9rem', fontWeight: 600,
                                        color: rule.is_enabled ? '#e2e8f0' : '#64748b',
                                    }}>
                                        {rule.name}
                                    </div>
                                    <div className="text-slate-500" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                        {trigger.label}: ≥{rule.threshold} за {rule.time_window_hours}ч →{' '}
                                        <span style={{ color: action.color, fontWeight: 600 }}>{action.label}</span>
                                        {' '}({formatDuration(rule.action_duration_hours)})
                                    </div>
                                </div>

                                {/* Статистика */}
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div className="text-slate-200" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                        {rule.times_triggered}
                                    </div>
                                    <div className="text-slate-500" style={{ fontSize: '0.65rem' }}>срабатываний</div>
                                </div>

                                {/* Кнопки действий */}
                                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                                    <button
                                        onClick={() => onEdit(rule)}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                                            color: '#818cf8', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}
                                        title="Редактировать"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(rule.id)}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                            color: '#f87171', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}
                                        title="Удалить"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                );
            })}
        </div>
    );
}
