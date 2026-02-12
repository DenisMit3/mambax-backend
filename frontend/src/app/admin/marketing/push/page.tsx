'use client';

import { useState } from 'react';
import { Send, Bell, Users, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminApi } from '@/services/adminApi';
import styles from '../../admin.module.css';

// Сегменты аудитории
const SEGMENTS = [
    { value: '', label: 'Все пользователи' },
    { value: 'premium', label: 'Премиум подписчики' },
    { value: 'inactive_30d', label: 'Неактивные (30 дней)' },
    { value: 'new', label: 'Новые пользователи' },
];

type Toast = { type: 'success' | 'error'; message: string } | null;

export default function PushNotificationsPage() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [segment, setSegment] = useState('');
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<Toast>(null);

    // Показать toast на 4 секунды
    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, message: msg });
        setTimeout(() => setToast(null), 4000);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        setSending(true);
        try {
            await adminApi.marketing.sendPush(title, message, segment || undefined);
            showToast('success', 'Уведомление успешно отправлено!');
            setTitle('');
            setMessage('');
            setSegment('');
        } catch {
            showToast('error', 'Ошибка отправки. Попробуйте ещё раз.');
        } finally {
            setSending(false);
        }
    };

    // Лейбл выбранного сегмента для превью
    const segmentLabel = SEGMENTS.find(s => s.value === segment)?.label ?? SEGMENTS[0].label;

    return (
        <div className={styles.pageContainer}>
            {/* Заголовок */}
            <div className={styles.headerSection}>
                <div>
                    <h1 className={styles.headerTitle}>Push-уведомления</h1>
                    <p className={styles.headerDescription}>
                        Отправляйте уведомления пользователям по сегментам
                    </p>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`
                    fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl
                    shadow-lg backdrop-blur-md border transition-all animate-in slide-in-from-top-2
                    ${toast.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/15 border-red-500/30 text-red-400'}
                `}>
                    {toast.type === 'success'
                        ? <CheckCircle size={18} />
                        : <XCircle size={18} />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Контент: форма + превью */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 max-w-[1000px]">

                {/* Форма */}
                <GlassCard hover={false} className="p-6">
                    <form onSubmit={handleSend} className="flex flex-col gap-5">
                        {/* Сегмент */}
                        <div className={styles.formGroup}>
                            <label>
                                <Users size={14} className="inline mr-1.5 opacity-60" />
                                Аудитория
                            </label>
                            <select
                                value={segment}
                                onChange={e => setSegment(e.target.value)}
                            >
                                {SEGMENTS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Заголовок */}
                        <div className={styles.formGroup}>
                            <label>
                                <Bell size={14} className="inline mr-1.5 opacity-60" />
                                Заголовок
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Например: Специальное предложение!"
                                required
                            />
                        </div>

                        {/* Текст сообщения */}
                        <div className={styles.formGroup}>
                            <label>Текст сообщения</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Введите текст уведомления..."
                                rows={4}
                                className="resize-y"
                                required
                            />
                        </div>

                        {/* Кнопка отправки */}
                        <button
                            type="submit"
                            disabled={sending || !title.trim() || !message.trim()}
                            className={`${styles.primaryButton} w-full justify-center py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                        >
                            {sending
                                ? <><Loader2 size={16} className="animate-spin" /> Отправка...</>
                                : <><Send size={16} /> Отправить уведомление</>}
                        </button>
                    </form>
                </GlassCard>

                {/* Превью — мокап телефона */}
                <div>
                    <h3 className="text-slate-300 text-sm font-medium mb-3">Предпросмотр</h3>
                    <div className="bg-slate-950 rounded-[20px] p-4 h-[400px] border-4 border-slate-700 relative overflow-hidden">
                        {/* Статус-бар телефона */}
                        <div className="flex justify-between text-[10px] text-slate-500 mb-4 px-1">
                            <span>9:41</span>
                            <div className="flex gap-1 items-center">
                                <div className="w-4 h-2 border border-slate-600 rounded-sm relative">
                                    <div className="absolute inset-0.5 bg-emerald-500 rounded-[1px]" />
                                </div>
                            </div>
                        </div>

                        {/* Карточка уведомления */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 transition-all">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span className="font-medium uppercase tracking-wide">SoulMate</span>
                                <span>сейчас</span>
                            </div>
                            <div className="font-semibold text-[13px] text-slate-100 mb-0.5 min-h-[18px]">
                                {title || 'Заголовок уведомления'}
                            </div>
                            <div className="text-xs text-slate-300 min-h-[16px] line-clamp-3">
                                {message || 'Текст сообщения будет здесь...'}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                                <Users size={10} />
                                {segmentLabel}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
