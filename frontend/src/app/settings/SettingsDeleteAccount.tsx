'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { authService } from '@/services/api';
import { SectionWrapper, Loader } from './SettingsShared';
import type { DeletionReason } from './settingsTypes';

// Секция удаления аккаунта
export function SettingsDeleteAccount() {
    const [reasons, setReasons] = useState<DeletionReason[]>([]);
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletionStatus, setDeletionStatus] = useState<{ scheduled: boolean; delete_at?: string } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        Promise.all([
            authService.getDeletionReasons().catch(() => ({ reasons: [] })),
            authService.getDeletionStatus().catch(() => null),
        ]).then(([reasonsData, status]) => {
            if (reasonsData && typeof reasonsData === 'object' && 'reasons' in reasonsData) {
                setReasons((reasonsData as { reasons: DeletionReason[] }).reasons);
            }
            if (status && typeof status === 'object' && 'scheduled' in status) {
                setDeletionStatus(status as { scheduled: boolean; delete_at?: string });
            }
        }).finally(() => setLoading(false));
    }, []);

    const handleDelete = async () => {
        if (!selectedReason) return;
        setSubmitting(true);
        try {
            await authService.requestAccountDeletion(selectedReason, feedback || undefined);
            setDeletionStatus({ scheduled: true });
            setShowConfirm(false);
        } catch (e) {
            console.error('Deletion request failed:', e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        try {
            await authService.cancelAccountDeletion();
            setDeletionStatus(null);
        } catch (e) {
            console.error('Cancel deletion failed:', e);
        }
    };

    if (loading) return <Loader />;

    // Удаление уже запланировано
    if (deletionStatus?.scheduled) {
        return (
            <SectionWrapper>
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center">
                    <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-white font-bold mb-2">Удаление запланировано</h3>
                    {deletionStatus.delete_at && (
                        <p className="text-sm text-slate-400 mb-4">
                            Аккаунт будет удалён {new Date(deletionStatus.delete_at).toLocaleDateString('ru-RU')}
                        </p>
                    )}
                    <p className="text-xs text-slate-500 mb-6">У вас есть 30 дней, чтобы передумать</p>
                    <button
                        onClick={handleCancel}
                        className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition"
                    >
                        Отменить удаление
                    </button>
                </div>
            </SectionWrapper>
        );
    }

    return (
        <SectionWrapper>
            <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle size={20} className="text-red-500" />
                    <span className="text-red-400 font-bold text-sm">Внимание</span>
                </div>
                <p className="text-xs text-slate-400">
                    После запроса на удаление у вас будет 30 дней, чтобы отменить решение. По истечении срока все данные будут безвозвратно удалены.
                </p>
            </div>

            {/* Выбор причины */}
            <div className="space-y-2 mb-4">
                <p className="text-sm text-slate-300 font-medium px-1">Почему вы хотите уйти?</p>
                {reasons.map((reason) => (
                    <button
                        key={reason.value}
                        onClick={() => setSelectedReason(reason.value)}
                        className={`w-full p-3 rounded-xl text-left text-sm transition flex items-center gap-3 ${
                            selectedReason === reason.value
                                ? 'bg-red-500/20 border border-red-500/30 text-white'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                    >
                        <span>{reason.emoji}</span>
                        <span>{reason.label}</span>
                    </button>
                ))}
            </div>

            {/* Обратная связь */}
            <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Расскажите подробнее (необязательно)..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-slate-600 resize-none h-24 focus:outline-none focus:border-white/20 transition mb-4"
            />

            {/* Кнопка удаления */}
            <button
                onClick={() => setShowConfirm(true)}
                disabled={!selectedReason}
                className="w-full py-3 rounded-xl bg-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
                Удалить аккаунт
            </button>

            {/* Модалка подтверждения */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-white/10"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold">Подтверждение</h3>
                                <button onClick={() => setShowConfirm(false)} className="text-slate-500 hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm text-slate-400 mb-6">
                                Вы уверены? Аккаунт будет удалён через 30 дней. В течение этого времени вы сможете отменить решение.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/20 transition"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition disabled:opacity-50"
                                >
                                    {submitting ? 'Удаление...' : 'Удалить'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </SectionWrapper>
    );
}
