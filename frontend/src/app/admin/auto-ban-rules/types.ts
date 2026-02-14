import { Flag, AlertTriangle, MessageCircle, Clock, Users } from 'lucide-react';
import { createElement } from 'react';

// Интерфейс правила автобана
export interface AutoBanRule {
    id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    threshold: number;
    time_window_hours: number;
    action: string;
    action_duration_hours: number | null;
    is_enabled: boolean;
    priority: number;
    times_triggered: number;
    last_triggered_at: string | null;
    created_at: string | null;
}

// Данные формы создания/редактирования
export interface BanRuleFormData {
    name: string;
    description: string;
    trigger_type: string;
    threshold: number;
    time_window_hours: number;
    action: string;
    action_duration_hours: number | null;
    is_enabled: boolean;
    priority: number;
}

// Начальное состояние формы
export const INITIAL_FORM_DATA: BanRuleFormData = {
    name: '',
    description: '',
    trigger_type: 'reports_count',
    threshold: 5,
    time_window_hours: 24,
    action: 'suspend',
    action_duration_hours: null,
    is_enabled: true,
    priority: 0,
};

// Типы триггеров
export const TRIGGER_TYPES = [
    { value: 'reports_count', label: 'Кол-во жалоб', icon: createElement(Flag, { size: 16 }), color: '#ef4444' },
    { value: 'fraud_score', label: 'Fraud Score', icon: createElement(AlertTriangle, { size: 16 }), color: '#f97316' },
    { value: 'spam_messages', label: 'Спам-сообщения', icon: createElement(MessageCircle, { size: 16 }), color: '#eab308' },
    { value: 'inactive_days', label: 'Дни неактивности', icon: createElement(Clock, { size: 16 }), color: '#6366f1' },
    { value: 'multiple_accounts', label: 'Мульти-аккаунты', icon: createElement(Users, { size: 16 }), color: '#8b5cf6' },
];

// Типы действий
export const ACTIONS = [
    { value: 'warn', label: 'Предупреждение', color: '#eab308' },
    { value: 'suspend', label: 'Приостановка', color: '#f97316' },
    { value: 'ban', label: 'Бан', color: '#ef4444' },
];

// Хелпер — информация о триггере
export function getTriggerInfo(type: string) {
    return TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[0];
}

// Хелпер — информация о действии
export function getActionInfo(action: string) {
    return ACTIONS.find(a => a.value === action) || ACTIONS[0];
}

// Хелпер — форматирование длительности
export function formatDuration(hours: number | null): string {
    if (!hours) return 'Навсегда';
    if (hours < 24) return `${hours}ч`;
    const days = Math.floor(hours / 24);
    return `${days}д`;
}
