"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Lock, Crown, ArrowLeft, Clock, Users, RefreshCw } from "lucide-react";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ErrorState } from "@/components/ui/ErrorState";

// Тип просмотра профиля
interface Viewer {
    id: string;
    name: string;
    age: number;
    photo: string;
    viewed_at: string;
    is_online: boolean;
}

// Форматирование "время назад"
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    return `${days} д`;
}

export default function WhoViewedMePage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [viewers, setViewers] = useState<Viewer[]>([]);
    const [total, setTotal] = useState(0);
    const [isVip, setIsVip] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchViewers = useCallback(async () => {
        try {
            setError(false);
            const data = await authService.getWhoViewedMe(20);
            setViewers(data.viewers);
            setTotal(data.total);
            setIsVip(data.is_vip);
        } catch (e) {
            console.error("[Views] Ошибка загрузки:", e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthed) fetchViewers();
    }, [fetchViewers, isAuthed]);

    const handleRefresh = () => {
        haptic.light();
        setRefreshing(true);
        fetchViewers();
    };

    const handleCardTap = (id: string) => {
        if (!isVip) return;
        haptic.medium();
        router.push(`/users/${id}`);
    };

    // Скелетон загрузки
    if (isChecking || loading) {
        return (
            <div className="min-h-dvh bg-black">
                <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
                    <div className="h-5 w-40 rounded bg-slate-800 animate-pulse" />
                </header>
                <div className="grid grid-cols-2 gap-3 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-900 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={fetchViewers} />;
    }

    return (
        <div className="min-h-dvh bg-black pb-24">
            {/* Шапка */}
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { haptic.light(); router.back(); }}
                            className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                            <h1 className="text-white font-semibold text-lg flex items-center gap-2">
                                <Eye className="w-5 h-5 text-purple-400" />
                                Кто смотрел
                            </h1>
                            {total > 0 && (
                                <p className="text-slate-400 text-xs">{total} просмотров</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </header>

            {/* Пустое состояние */}
            {viewers.length === 0 && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center px-6 pt-32 text-center"
                >
                    <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-slate-600" />
                    </div>
                    <h2 className="text-white font-semibold text-lg mb-2">Пока никто не смотрел</h2>
                    <p className="text-slate-400 text-sm max-w-[260px]">
                        Обновите фото и заполните профиль, чтобы привлечь внимание
                    </p>
                </motion.div>
            )}

            {/* Сетка карточек */}
            {viewers.length > 0 && (
                <div className="grid grid-cols-2 gap-3 p-4">
                    <AnimatePresence mode="popLayout">
                        {viewers.map((viewer, i) => (
                            <motion.div
                                key={viewer.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => handleCardTap(viewer.id)}
                                className={`relative aspect-[3/4] rounded-2xl overflow-hidden ${isVip ? "cursor-pointer active:scale-[0.97]" : ""} transition-transform`}
                            >
                                {/* Фото */}
                                <img
                                    src={viewer.photo}
                                    alt={isVip ? viewer.name : ""}
                                    className={`w-full h-full object-cover ${!isVip ? "blur-lg scale-110" : ""}`}
                                />

                                {/* Градиент снизу (VIP) */}
                                {isVip && (
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                                )}

                                {/* Инфо (VIP) */}
                                {isVip && (
                                    <div className="absolute bottom-0 inset-x-0 p-3">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {viewer.is_online && (
                                                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                                            )}
                                            <p className="text-white font-semibold text-sm truncate">
                                                {viewer.name}, {viewer.age}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-300 text-xs">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(viewer.viewed_at)}
                                        </div>
                                    </div>
                                )}

                                {/* Оверлей замка (не VIP) */}
                                {!isVip && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full bg-slate-900/80 flex items-center justify-center">
                                            <Lock className="w-6 h-6 text-purple-400" />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* CTA для не-VIP */}
            {!isVip && viewers.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="px-4 mt-2"
                >
                    <button
                        onClick={() => { haptic.medium(); router.push("/settings/subscription"); }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                        <Crown className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold">Открыть с VIP</span>
                    </button>
                    <p className="text-slate-500 text-xs text-center mt-2">
                        Узнайте, кто интересуется вашим профилем
                    </p>
                </motion.div>
            )}
        </div>
    );
}
