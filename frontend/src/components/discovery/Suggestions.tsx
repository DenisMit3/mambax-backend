"use client";

import { motion } from "framer-motion";
import { Brain, Heart, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { useHaptic } from "@/hooks/useHaptic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FALLBACK_AVATAR } from "@/lib/constants";

/** AI-подобранный профиль */
interface Suggestion {
    id: string;
    name: string;
    age: number;
    photo: string;
    reason: string;
    compatibility_score: number;
}

interface SuggestionsProps {
    limit?: number;
    onLike?: (userId: string) => void;
}

export function Suggestions({ limit = 5, onLike }: SuggestionsProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

    const { data, isLoading } = useQuery({
        queryKey: ["suggestions", limit],
        queryFn: () =>
            httpClient.get<{ suggestions: Suggestion[] }>(`/api/suggestions?limit=${limit}`),
        staleTime: 1000 * 60 * 10, // 10 минут
    });

    // Обновить подборку
    const handleRefresh = () => {
        haptic.medium();
        setIsRefreshing(true);
        setLikedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["suggestions"] }).finally(() =>
            setIsRefreshing(false)
        );
    };

    // Лайк профиля
    const handleLike = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        haptic.medium();
        setLikedIds((prev) => new Set(prev).add(userId));
        onLike?.(userId);
    };

    // Переход к профилю
    const handleCardTap = (id: string) => {
        haptic.light();
        router.push(`/users/${id}`);
    };

    // --- Анимации ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: prefersReducedMotion ? 0 : 0.1 },
        },
    };

    const itemVariants = {
        hidden: prefersReducedMotion ? { opacity: 0 } : { y: 20, opacity: 0, scale: 0.97 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring" as const, stiffness: 280, damping: 22 },
        },
    };

    // --- Скелетон ---
    if (isLoading) {
        return (
            <div className="px-4 py-6">
                <div className="flex items-center gap-2 mb-4">
                    <Brain className="text-purple-400" size={20} />
                    <h2 className="text-lg font-black text-white">AI Picks for You</h2>
                </div>
                <div className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    const suggestions = data?.suggestions ?? [];
    if (suggestions.length === 0) return null;

    return (
        <div className="px-4 py-6">
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Brain className="text-purple-400" size={20} />
                        <Sparkles
                            size={10}
                            className="absolute -top-1 -right-1.5 text-pink-400 fill-pink-400"
                        />
                    </div>
                    <h2 className="text-lg font-black text-white">AI Picks for You</h2>
                    <ChevronRight className="text-slate-500" size={16} />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-full bg-slate-900/80 border border-slate-700/50 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    aria-label="Обновить подборку AI"
                >
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Вертикальный список карточек */}
            <motion.div
                className="flex flex-col gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {suggestions.map((s) => {
                    const liked = likedIds.has(s.id);
                    return (
                        <motion.div
                            key={s.id}
                            variants={itemVariants}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCardTap(s.id)}
                            className="relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer
                                bg-slate-900/60 backdrop-blur-xl border border-slate-700/40
                                hover:border-purple-500/30 transition-colors"
                        >
                            {/* Фото */}
                            <img
                                src={s.photo || FALLBACK_AVATAR}
                                alt={s.name}
                                loading="lazy"
                                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                            />

                            {/* Инфо */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-white text-sm font-bold truncate">
                                        {s.name}, {s.age}
                                    </p>
                                    {/* Совместимость */}
                                    <span className="flex items-center gap-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {Math.round(s.compatibility_score)}%
                                    </span>
                                </div>
                                {/* AI причина */}
                                <p className="text-slate-400 text-xs mt-0.5 truncate">
                                    <Sparkles size={10} className="inline text-pink-400 mr-1" />
                                    {s.reason}
                                </p>
                            </div>

                            {/* Кнопка лайка */}
                            <button
                                onClick={(e) => handleLike(e, s.id)}
                                disabled={liked}
                                className="p-2 rounded-full transition-all flex-shrink-0
                                    disabled:scale-110
                                    bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20"
                                aria-label={`Лайкнуть ${s.name}`}
                            >
                                <Heart
                                    size={18}
                                    className={
                                        liked
                                            ? "text-pink-400 fill-pink-400"
                                            : "text-pink-400"
                                    }
                                />
                            </button>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
}
