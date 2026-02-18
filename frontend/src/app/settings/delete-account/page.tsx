'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, AlertTriangle, Clock, X, Check } from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface DeletionReason {
    value: string;
    label: string;
    emoji: string;
}

export default function DeleteAccountPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [reasons, setReasons] = useState<DeletionReason[]>([]);
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deletionStatus, setDeletionStatus] = useState<{ scheduled: boolean; delete_at?: string } | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!isAuthed) return;
        Promise.all([
            authService.getDeletionReasons().catch(() => ({ reasons: [] })),
            authService.getDeletionStatus().catch(() => ({ scheduled: false })),
        ]).then(([r, s]: any[]) => {
            setReasons(r.reasons || []);
            setDeletionStatus(s);
        }).finally(() => setLoading(false));
    }, [isAuthed]);

    const requestDeletion = useCallback(async () => {
        if (!selectedReason || deleting) return;
        setDeleting(true);
        haptic.error();
        try {
            await authService.requestAccountDeletion(selectedReason, feedback || undefined);
            setDeletionStatus({ scheduled: true });
            setShowConfirm(false);
        } catch (e) {
            console.error('Deletion request failed:', e);
        } finally {
            setDeleting(false);
        }
    }, [selectedReason, feedback, deleting, haptic]);

    const cancelDeletion = useCallback(async () => {
        setCancelling(true);
        haptic.success();
        try {
            await authService.cancelAccountDeletion();
            setDeletionStatus({ scheduled: false });
        } catch (e) {
            console.error('Cancel deletion failed:', e);
        } finally {
            setCancelling(false);
        }
    }, [haptic]);

    if (isChecking || loading) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Already scheduled for deletion
    if (deletionStatus?.scheduled) {
        return (
            <div className="min-h-dvh bg-black text-white pb-24">
                <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold">Удаление аккаунта</h1>
                    </div>
                </div>
                <div className="px-4 pt-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Удаление запланировано</h2>
                    <p className="text-sm text-slate-400 mb-1">Ваш аккаунт будет удалён через 30 дней.</p>
                    {deletionStatus.delete_at && (
                        <p className="text-xs text-slate-500 mb-6">
                            Дата удаления: {new Date(deletionStatus.delete_at).toLocaleDateString('ru-RU')}
                        </p>
                    )}
                    <p className="text-xs text-slate-500 mb-8 max-w-xs">
                        Вы можете отменить удаление в любой момент до этой даты. После удаления все данные будут безвозвратно утеряны.
                    </p>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={cancelDeletion}
                        disabled={cancelling}
                        className="w-full max-w-xs py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-sm disabled:opacity-50"
                    >
                        {cancelling ? 'Отмена...' : 'Отменить удаление'}
                    </motion.button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-black text-white pb-24">
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => { haptic.light(); router.back(); }} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold">Удаление аккаунта</h1>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-6">
                {/* Warning */}
                <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-400 mb-1">Внимание</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                После удаления аккаунта все ваши данные, матчи, сообщения и подписки будут безвозвратно удалены. У вас будет 30 дней чтобы передумать.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Reason selection */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-3">Причина удаления</p>
                    <div className="space-y-2">
                        {reasons.map(reason => (
                            <motion.button
                                key={reason.value}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { haptic.light(); setSelectedReason(reason.value); }}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-left ${
                                    selectedReason === reason.value
                                        ? 'bg-red-500/10 border-red-500/30'
                                        : 'bg-[#0f0f11] border-white/5 hover:border-white/10'
                                }`}
                            >
                                <span className="text-lg">{reason.emoji}</span>
                                <span className="text-sm font-medium text-white flex-1">{reason.label}</span>
                                {selectedReason === reason.value && (
                                    <Check size={16} className="text-red-400" />
                                )}
                            </motion.button>
                        ))}
                    </div>
                </section>

                {/* Feedback */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">Комментарий (необязательно)</p>
                    <textarea
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Расскажите, что мы можем улучшить..."
                        className="w-full bg-[#0f0f11] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-red-500/30 transition"
                    />
                </section>

                {/* Delete button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { haptic.error(); setShowConfirm(true); }}
                    disabled={!selectedReason}
                    className="w-full py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm disabled:opacity-30 transition"
                >
                    <span className="flex items-center justify-center gap-2">
                        <Trash2 size={16} />
                        Удалить аккаунт
                    </span>
                </motion.button>
            </div>

            {/* Confirmation modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
                        onClick={() => setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm bg-slate-900 rounded-2xl p-6 border border-white/10"
                        >
                            <div className="flex justify-center mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle size={28} className="text-red-400" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-center mb-2">Вы уверены?</h3>
                            <p className="text-sm text-slate-400 text-center mb-6">
                                Это действие нельзя отменить после 30 дней. Все данные будут удалены.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={requestDeletion}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50"
                                >
                                    {deleting ? 'Удаление...' : 'Удалить'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
