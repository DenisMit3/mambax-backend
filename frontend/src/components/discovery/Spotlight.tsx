"use client";

import { motion } from "framer-motion";
import { Sparkles, BadgeCheck, Heart, ChevronRight, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { useHaptic } from "@/hooks/useHaptic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FALLBACK_AVATAR } from "@/lib/constants";

/** Профиль в Spotlight */
interface SpotlightProfile {
    id: string;
    name: string;
    age: number;
    bio?: string;
    is_verified: boolean;
    photos: string[];
    compatibility_score: number;
}

interface SpotlightProps {
    limit?: number;
}

export function Spotlight({ limit = 10 }: SpotlightProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["spotlight", limit],
        queryFn: () =>
            httpClient.get<{ profiles: SpotlightProfile[] }>(`/api/spotlight?limit=${limit}`),
        staleTime: 1000 * 60 * 5, // 5 минут
    });

    // Обновить список
    const handleRefresh = () => {
        haptic.medium();
        setIsRefreshing(true);
        queryClient.invalidateQueries({ queryKey: ["spotlight"] }).finally(() =>
            setIsRefreshing(false)
        );
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
            transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 },
        },
    };

    const itemVariants = {
        hidden: prefersReducedMotion ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.95 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: prefersReducedMotion
                ? { duration: 0 }
                : { type: "spring" as const, stiffness: 260, damping: 20 },
        },
    };

    // --- Скелетон ---
    if (isLoading) {
        return (
            <div className="px-4 py-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-amber-400" size={20} />
                    <h2 className="text-lg font-black text-white">Spotlight</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="w-36 h-52 flex-shrink-0 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    const profiles = data?.profiles ?? [];
    if (profiles.length === 0) return null;

    return (
        <div className="px-4 py-6">
            {/* Заголовок */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-400 fill-amber-400" size={20} />
                    <h2 className="text-lg font-black text-white">Spotlight</h2>
                    <ChevronRight className="text-slate-500" size={16} />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-full bg-slate-900/80 border border-slate-700/50 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    aria-label="Обновить Spotlight"
                >
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Карусель */}
            <motion.div
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {profiles.map((profile) => (
                    <motion.div
                        key={profile.id}
                        variants={itemVariants}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleCardTap(profile.id)}
                        className="relative flex-shrink-0 w-36 h-52 rounded-2xl overflow-hidden cursor-pointer group snap-start"
                    >
                        {/* Фото */}
                        <img
                            src={profile.photos[0] || FALLBACK_AVATAR}
                            alt={profile.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />

                        {/* Стеклянный оверлей */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {/* Совместимость */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full">
                            <Heart size={10} className="text-pink-400 fill-pink-400" />
                            <span className="text-[10px] font-bold text-pink-300">
                                {Math.round(profile.compatibility_score)}%
                            </span>
                        </div>

                        {/* Верификация */}
                        {profile.is_verified && (
                            <div className="absolute top-2 right-2">
                                <BadgeCheck size={18} className="text-blue-400 fill-blue-400/20" />
                            </div>
                        )}

                        {/* Имя + возраст */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white text-sm font-black truncate">
                                {profile.name}, {profile.age}
                            </p>
                        </div>

                        {/* Hover-эффект */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
