'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserX, Unlock, AlertCircle } from 'lucide-react';
import { authService } from '@/services/api';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface BlockedUser {
    id: string;
    name: string;
    photo_url?: string;
    blocked_at: string;
}

export default function BlockedUsersPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [users, setUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [unblocking, setUnblocking] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthed) return;
        authService.getBlockedUsers()
            .then(data => setUsers(data.blocked_users || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isAuthed]);

    const unblock = useCallback(async (userId: string) => {
        haptic.medium();
        setUnblocking(userId);
        try {
            await authService.unblockUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            console.error('Unblock failed:', e);
        } finally {
            setUnblocking(null);
        }
    }, [haptic]);

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => { haptic.light(); router.back(); }} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-semibold">Заблокированные</h1>
                    <span className="text-xs text-slate-500">{users.length}</span>
                </div>
            </div>

            <div className="px-4 pt-4">
                {users.length === 0 ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-24 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center mb-4">
                            <UserX className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-sm text-slate-400">Нет заблокированных пользователей</p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {users.map((user, i) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 100, height: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-white/5 mb-2"
                            >
                                <img
                                    src={user.photo_url || FALLBACK_AVATAR}
                                    alt={user.name}
                                    className="w-11 h-11 rounded-xl object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                    <p className="text-[10px] text-slate-500">
                                        Заблокирован {new Date(user.blocked_at).toLocaleDateString('ru-RU')}
                                    </p>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => unblock(user.id)}
                                    disabled={unblocking === user.id}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-medium hover:bg-white/10 transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <Unlock size={12} />
                                    {unblocking === user.id ? '...' : 'Разблокировать'}
                                </motion.button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
