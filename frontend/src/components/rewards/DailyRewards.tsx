'use client';

import { useState, useEffect, useCallback } from "react";
import { Gift, Star, Flame, Calendar, X, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptic } from "@/hooks/useHaptic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { authService } from "@/services/api";

// Расписание наград по умолчанию (7 дней)
const FALLBACK_SCHEDULE = [5, 10, 15, 20, 25, 35, 50];

interface DailyRewardsProps {
    isOpen: boolean;
    onClose: () => void;
}

// Частицы конфетти
interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    rotation: number;
}

const CONFETTI_COLORS = [
    "#a855f7", "#ec4899", "#f59e0b", "#22d3ee",
    "#34d399", "#f472b6", "#818cf8", "#fb923c",
];

function generateConfetti(count: number): Particle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -(Math.random() * 20 + 10),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
    }));
}

export function DailyRewards({ isOpen, onClose }: DailyRewardsProps) {
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();

    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [canClaim, setCanClaim] = useState(false);
    const [streak, setStreak] = useState(0);
    const [todayReward, setTodayReward] = useState(0);
    const [schedule, setSchedule] = useState<number[]>(FALLBACK_SCHEDULE);
    const [newBalance, setNewBalance] = useState<number | null>(null);
    const [claimed, setClaimed] = useState(false);
    const [confetti, setConfetti] = useState<Particle[]>([]);

    // Загрузка статуса наград
    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const data = await authService.getDailyRewardStatus();
            setCanClaim(data.can_claim);
            setStreak(data.streak);
            setTodayReward(data.today_reward);
            if (data.rewards_schedule?.length) {
                setSchedule(data.rewards_schedule);
            }
        } catch {
            // Используем fallback значения
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setClaimed(false);
            setNewBalance(null);
            setConfetti([]);
            fetchStatus();
        }
    }, [isOpen, fetchStatus]);

    // Забрать награду
    const handleClaim = async () => {
        if (!canClaim || claiming) return;
        haptic.medium();
        setClaiming(true);

        try {
            const data = await authService.claimDailyReward();
            if (data.success) {
                haptic.success();
                setClaimed(true);
                setCanClaim(false);
                setStreak(data.new_streak);
                setNewBalance(data.new_balance);

                // Конфетти
                if (!prefersReducedMotion) {
                    setConfetti(generateConfetti(40));
                }
            }
        } catch {
            haptic.error();
        } finally {
            setClaiming(false);
        }
    };

    // Текущий день в расписании (0-indexed)
    const currentDayIndex = streak % schedule.length;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Модальное окно */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 24 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 24 }}
                        transition={prefersReducedMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 320, damping: 26 }
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-[380px] rounded-3xl overflow-hidden bg-[#0f0f11] border border-white/10 shadow-2xl"
                    >
                        {/* Конфетти */}
                        {confetti.length > 0 && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
                                {confetti.map((p) => (
                                    <motion.div
                                        key={p.id}
                                        initial={{
                                            x: `${p.x}%`,
                                            y: `${p.y}%`,
                                            rotate: p.rotation,
                                            opacity: 1,
                                        }}
                                        animate={{
                                            y: "110%",
                                            rotate: p.rotation + 360,
                                            opacity: 0,
                                        }}
                                        transition={{
                                            duration: 1.8 + Math.random() * 1.2,
                                            ease: "easeIn",
                                        }}
                                        style={{
                                            position: "absolute",
                                            width: p.size,
                                            height: p.size,
                                            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                                            backgroundColor: p.color,
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Декоративный градиент */}
                        <div className="absolute -top-24 -right-24 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Шапка */}
                        <div className="relative p-6 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center shadow-lg shadow-purple-500/25">
                                        <Gift size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white tracking-wide">
                                            Ежедневная награда
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            Заходи каждый день
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Streak */}
                            {!loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/20"
                                >
                                    <Flame size={18} className="text-orange-400" />
                                    <span className="text-sm font-black text-orange-300">
                                        {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд
                                    </span>
                                    <span className="text-lg">🔥</span>
                                </motion.div>
                            )}
                        </div>

                        {/* Контент */}
                        <div className="px-6 pb-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-purple-400" size={28} />
                                </div>
                            ) : (
                                <>
                                    {/* Календарь наград на 7 дней */}
                                    <div className="grid grid-cols-7 gap-1.5 mb-5">
                                        {schedule.map((reward, i) => {
                                            const isPast = i < currentDayIndex;
                                            const isCurrent = i === currentDayIndex;
                                            const isFuture = i > currentDayIndex;

                                            return (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className={`
                                                        relative flex flex-col items-center py-2.5 px-1 rounded-xl border transition-all
                                                        ${isCurrent
                                                            ? 'bg-gradient-to-b from-purple-500/25 to-pink-500/15 border-purple-500/50 shadow-lg shadow-purple-500/10'
                                                            : isPast
                                                                ? 'bg-white/5 border-white/5'
                                                                : 'bg-white/[0.02] border-white/5'
                                                        }
                                                    `}
                                                >
                                                    {/* Номер дня */}
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${
                                                        isCurrent ? 'text-purple-300' : 'text-slate-500'
                                                    }`}>
                                                        Д{i + 1}
                                                    </span>

                                                    {/* Иконка */}
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                                                        isPast
                                                            ? 'bg-emerald-500/20'
                                                            : isCurrent
                                                                ? 'bg-purple-500/30'
                                                                : 'bg-white/5'
                                                    }`}>
                                                        {isPast ? (
                                                            <Check size={14} className="text-emerald-400" />
                                                        ) : isCurrent ? (
                                                            <Star size={14} className="text-purple-300 fill-purple-300" />
                                                        ) : (
                                                            <Calendar size={12} className="text-slate-600" />
                                                        )}
                                                    </div>

                                                    {/* Количество */}
                                                    <span className={`text-[11px] font-black ${
                                                        isCurrent
                                                            ? 'text-white'
                                                            : isPast
                                                                ? 'text-slate-400'
                                                                : 'text-slate-600'
                                                    }`}>
                                                        {reward}
                                                    </span>

                                                    {/* Индикатор текущего дня */}
                                                    {isCurrent && (
                                                        <motion.div
                                                            layoutId="current-day"
                                                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-purple-500 border-2 border-slate-950"
                                                            animate={!prefersReducedMotion ? { scale: [1, 1.3, 1] } : {}}
                                                            transition={{ repeat: Infinity, duration: 2 }}
                                                        />
                                                    )}

                                                    {/* Затемнение для будущих */}
                                                    {isFuture && (
                                                        <div className="absolute inset-0 rounded-xl bg-[#0f0f11]/30 pointer-events-none" />
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* Награда сегодня */}
                                    <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-center">
                                        {claimed ? (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center gap-1"
                                            >
                                                <span className="text-2xl">🎉</span>
                                                <span className="text-sm font-black text-emerald-400">
                                                    +{todayReward} Stars получено!
                                                </span>
                                                {newBalance !== null && (
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        Баланс: {newBalance} ⭐
                                                    </span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                <Star size={16} className="text-amber-400 fill-amber-400" />
                                                <span className="text-sm font-black text-white">
                                                    Сегодня: {todayReward} Stars
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Кнопка забрать */}
                                    <motion.button
                                        whileTap={!prefersReducedMotion ? { scale: 0.97 } : {}}
                                        onClick={handleClaim}
                                        disabled={!canClaim || claiming || claimed}
                                        className={`
                                            w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest
                                            transition-all flex items-center justify-center gap-2
                                            ${canClaim && !claimed
                                                ? 'bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                                                : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        {claiming ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : claimed ? (
                                            <>
                                                <Check size={18} />
                                                Получено
                                            </>
                                        ) : canClaim ? (
                                            <>
                                                <Gift size={18} />
                                                Забрать награду
                                            </>
                                        ) : (
                                            <>
                                                <Calendar size={18} />
                                                Приходи завтра
                                            </>
                                        )}
                                    </motion.button>

                                    {/* Подсказка */}
                                    <p className="mt-3 text-center text-[10px] text-slate-600 font-medium">
                                        Заходи каждый день, чтобы увеличить награду
                                    </p>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
