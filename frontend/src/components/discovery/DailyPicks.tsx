"use client";

import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { useSwipeStatus } from "@/hooks/useDiscovery";
import { useHaptic } from "@/hooks/useHaptic";
import { FALLBACK_AVATAR } from "@/lib/constants";
import { Toast } from '@/components/ui/Toast';

interface DailyPick {
    id: string;
    name: string;
    age: number;
    photos: string[];
    compatibility_score: number;
    common_interests: string[];
    ai_reasoning: string;
}

export function DailyPicks() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const haptic = useHaptic();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [vipRequired, setVipRequired] = useState(false);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
    const { data: swipeStatus } = useSwipeStatus();
    const isVip = swipeStatus?.is_vip ?? false;

    const { data, isLoading } = useQuery({
        queryKey: ["daily-picks"],
        queryFn: async () => {
            // Используем httpClient вместо прямого fetch
            return httpClient.get<{ picks: DailyPick[] }>("/api/discover/daily-picks");
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 часа
    });

    const refreshMutation = useMutation({
        mutationFn: async () => {
            return httpClient.post<{ success: boolean; is_vip_feature?: boolean; message?: string }>("/api/discover/daily-picks/refresh");
        },
        onSuccess: (data) => {
            if (data.success === false && data.is_vip_feature) {
                setVipRequired(true);
                setTimeout(() => setVipRequired(false), 3000);
            } else {
                queryClient.invalidateQueries({ queryKey: ["daily-picks"] });
            }
            setIsRefreshing(false);
        },
        onError: (error: Error) => {
            setToast({message: error.message, type: 'error'});
            setIsRefreshing(false);
        },
    });

    if (isLoading) {
        return (
            <div className="px-4 py-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-amber-400" size={20} />
                    <h2 className="text-lg font-black text-white">Подборка дня</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="w-32 h-48 flex-shrink-0 rounded-2xl" />
                    ))}
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
    );
}

    const picks = data?.picks || [];
    const prefersReducedMotion = useReducedMotion();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: prefersReducedMotion ? 0 : 0.1
            }
        }
    };

    const itemVariants = {
        hidden: prefersReducedMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring' as const, stiffness: 300, damping: 20 }
        }
    };

    if (picks.length === 0) return null;

    return (
        <div className="px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-amber-400 fill-amber-400" size={20} />
                    <h2 className="text-lg font-black text-white">Подборка дня</h2>
                </div>
                <button
                    onClick={() => {
                        haptic.medium();
                        setIsRefreshing(true);
                        refreshMutation.mutate();
                    }}
                    disabled={isRefreshing}
                    className="relative p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    title={isVip ? "Обновить подборку" : "VIP: обновить подборку"}
                >
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                    {!isVip && (
                        <Crown size={10} className="absolute -top-1 -right-1 text-amber-400 fill-amber-400" />
                    )}
                </button>
                {vipRequired && (
                    <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-amber-400 font-bold"
                    >
                        VIP only ✨
                    </motion.span>
                )}
            </div>

            {/* Picks Carousel */}
            <motion.div
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {picks.map((pick: DailyPick) => (
                    <motion.div
                        key={pick.id}
                        variants={itemVariants}
                        className="relative flex-shrink-0 w-32 h-48 rounded-2xl overflow-hidden cursor-pointer group snap-start"
                        onClick={() => {
                            // Navigate to profile
                            router.push(`/users/${pick.id}`);
                        }}
                    >
                        {/* Image */}
                        <img
                            src={pick.photos[0] || FALLBACK_AVATAR}
                            alt={pick.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />

                        {/* AI Badge */}
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] px-2 py-1 rounded-full flex items-center gap-1">
                            <Sparkles size={10} className="text-white fill-white" />
                            <span className="text-[10px] font-black text-white">AI</span>
                        </div>

                        {/* Compatibility Score */}
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                            <span className="text-xs font-black text-green-400">
                                {Math.round(pick.compatibility_score)}%
                            </span>
                        </div>

                        {/* Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-white text-sm font-black truncate">
                                {pick.name}, {pick.age}
                            </p>
                            {pick.common_interests.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                    {pick.common_interests.slice(0, 2).map((interest) => (
                                        <span
                                            key={interest}
                                            className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full"
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hover: AI Reasoning */}
                        <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                            <p className="text-white text-xs text-center">{pick.ai_reasoning}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
