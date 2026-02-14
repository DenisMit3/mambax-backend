'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RefreshCw } from 'lucide-react';
import { TRIGGER_TYPES, ACTIONS, type BanRuleFormData } from './types';

interface BanRuleFormProps {
    show: boolean;
    isEditing: boolean;
    formData: BanRuleFormData;
    saving: boolean;
    onFormChange: (updater: (prev: BanRuleFormData) => BanRuleFormData) => void;
    onSave: () => void;
    onClose: () => void;
}

// Модальная форма создания/редактирования правила
export function BanRuleForm({ show, isEditing, formData, saving, onFormChange, onSave, onClose }: BanRuleFormProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'rgba(15, 23, 42, 0.95)', borderRadius: '16px',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                            padding: '2rem', width: '500px', maxHeight: '90vh', overflowY: 'auto',
                        }}
                    >
                        {/* Заголовок */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="text-slate-200" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                {isEditing ? 'Редактировать правило' : 'Новое правило'}
                            </h2>
                            <button onClick={onClose} className="text-slate-500" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Название */}
                            <div>
                                <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Название</label>
                                <input
                                    value={formData.name}
                                    onChange={e => onFormChange(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Бан за 5+ жалоб"
                                    className="text-slate-200"
                                    style={{
                                        width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                                        background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(148, 163, 184, 0.15)',
                                        fontSize: '0.85rem', outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Описание */}
                            <div>
                                <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Описание</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => onFormChange(p => ({ ...p, description: e.target.value }))}
                                    rows={2}
                                    className="text-slate-200"
                                    style={{
                                        width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                                        background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(148, 163, 184, 0.15)',
                                        fontSize: '0.85rem', outline: 'none', resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Триггер */}
                            <div>
                                <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Триггер</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {TRIGGER_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => onFormChange(p => ({ ...p, trigger_type: t.value }))}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                                padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.78rem',
                                                background: formData.trigger_type === t.value ? `${t.color}30` : 'rgba(30, 41, 59, 0.5)',
                                                border: `1px solid ${formData.trigger_type === t.value ? t.color : 'rgba(148, 163, 184, 0.1)'}`,
                                                color: formData.trigger_type === t.value ? t.color : '#94a3b8',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {t.icon} {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Порог + Окно */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Порог</label>
                                    <input
                                        type="number"
                                        value={formData.threshold}
                                        onChange={e => onFormChange(p => ({ ...p, threshold: parseInt(e.target.value) || 0 }))}
                                        min={1}
                                        className="text-slate-200"
                                        style={{
                                            width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                                            background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(148, 163, 184, 0.15)',
                                            fontSize: '0.85rem', outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Окно (часы)</label>
                                    <input
                                        type="number"
                                        value={formData.time_window_hours}
                                        onChange={e => onFormChange(p => ({ ...p, time_window_hours: parseInt(e.target.value) || 1 }))}
                                        min={1}
                                        className="text-slate-200"
                                        style={{
                                            width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                                            background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(148, 163, 184, 0.15)',
                                            fontSize: '0.85rem', outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Действие */}
                            <div>
                                <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Действие</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {ACTIONS.map(a => (
                                        <button
                                            key={a.value}
                                            onClick={() => onFormChange(p => ({ ...p, action: a.value }))}
                                            style={{
                                                flex: 1, padding: '0.5rem', borderRadius: '8px', fontSize: '0.8rem',
                                                background: formData.action === a.value ? `${a.color}25` : 'rgba(30, 41, 59, 0.5)',
                                                border: `1px solid ${formData.action === a.value ? a.color : 'rgba(148, 163, 184, 0.1)'}`,
                                                color: formData.action === a.value ? a.color : '#94a3b8',
                                                cursor: 'pointer', fontWeight: 600,
                                            }}
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Длительность + Приоритет */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Длительность (часы)</label>
                                    <input
                                        type="number"
                                        value={formData.action_duration_hours ?? ''}
                                        onChange={e => onFormChange(p => ({ ...p, action_duration_hours: e.target.value ? parseInt(e.target.value) : null }))}
                                        placeholder="Пусто = навсегда"
                                        className="text-slate-200"
                                        style={{
                                            width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                                            background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(148, 163, 184, 0.15)',
                                            fontSize: '0.85rem', outline: 'none',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-400" style={{ fontSize: '0.78rem', marginBottom: '0.3rem', display: 'block' }}>Приоритет</label>
                                    <input
                                        type="number"
                                        value={formData.priority}
                                        onChange={e => onFormChange(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                                        className="text-slate-200"
                                        style={{
                                            width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                                            background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(148, 163, 184, 0.15)',
                                            fontSize: '0.85rem', outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Кнопка сохранения */}
                            <button
                                onClick={onSave}
                                disabled={saving || !formData.name}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.7rem', borderRadius: '10px', width: '100%',
                                    background: saving ? 'rgba(99, 102, 241, 0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                                    fontWeight: 600, fontSize: '0.85rem', marginTop: '0.5rem',
                                }}
                            >
                                {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                                {isEditing ? 'Сохранить' : 'Создать'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
