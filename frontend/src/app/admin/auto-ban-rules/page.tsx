'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, Plus } from 'lucide-react';
import { adminApi } from '@/services/admin';
import styles from '../admin.module.css';
import { type AutoBanRule, type BanRuleFormData, INITIAL_FORM_DATA } from './types';
import { BanRuleStats } from './BanRuleStats';
import { BanRuleForm } from './BanRuleForm';
import { BanRulesTable } from './BanRulesTable';

export default function AutoBanRulesPage() {
    const [rules, setRules] = useState<AutoBanRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<AutoBanRule | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<BanRuleFormData>(INITIAL_FORM_DATA);

    // Загрузка правил
    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.autoBanRules.list();
            setRules(data.rules || []);
        } catch (err) {
            console.error('Failed to load rules:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchRules().then(() => {
            if (cancelled) return;
        });
        return () => { cancelled = true; };
    }, [fetchRules]);

    // Сброс формы
    const resetForm = () => {
        setFormData(INITIAL_FORM_DATA);
        setEditingRule(null);
        setShowForm(false);
    };

    // Открыть редактирование
    const openEdit = (rule: AutoBanRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            description: rule.description || '',
            trigger_type: rule.trigger_type,
            threshold: rule.threshold,
            time_window_hours: rule.time_window_hours,
            action: rule.action,
            action_duration_hours: rule.action_duration_hours,
            is_enabled: rule.is_enabled,
            priority: rule.priority,
        });
        setShowForm(true);
    };

    // Сохранение правила
    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingRule) {
                await adminApi.autoBanRules.update(editingRule.id, formData);
            } else {
                await adminApi.autoBanRules.create(formData);
            }
            resetForm();
            fetchRules();
        } catch (err) {
            console.error('Failed to save rule:', err);
        } finally {
            setSaving(false);
        }
    };

    // Удаление правила
    const handleDelete = async (id: string) => {
        if (!confirm('Удалить это правило?')) return;
        try {
            await adminApi.autoBanRules.delete(id);
            fetchRules();
        } catch (err) {
            console.error('Failed to delete rule:', err);
        }
    };

    // Переключение активности
    const handleToggle = async (id: string) => {
        try {
            await adminApi.autoBanRules.toggle(id);
            fetchRules();
        } catch (err) {
            console.error('Failed to toggle rule:', err);
        }
    };

    const enabledCount = rules.filter(r => r.is_enabled).length;
    const totalTriggered = rules.reduce((s, r) => s + r.times_triggered, 0);

    return (
        <div className={styles.pageContent}>
            {/* Заголовок */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="text-slate-200" style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bot size={24} /> Auto-Ban Rules
                    </h1>
                    <p className="text-slate-500" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Автоматические правила блокировки пользователей
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.6rem 1.2rem', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    }}
                >
                    <Plus size={16} /> Новое правило
                </button>
            </div>

            {/* Статистика */}
            <BanRuleStats
                totalRules={rules.length}
                enabledCount={enabledCount}
                totalTriggered={totalTriggered}
            />

            {/* Форма создания/редактирования */}
            <BanRuleForm
                show={showForm}
                isEditing={!!editingRule}
                formData={formData}
                saving={saving}
                onFormChange={setFormData}
                onSave={handleSave}
                onClose={resetForm}
            />

            {/* Список правил */}
            <BanRulesTable
                rules={rules}
                loading={loading}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
            />
        </div>
    );
}
