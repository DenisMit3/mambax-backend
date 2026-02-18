"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Rocket, Zap, Clock, Star, Crown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/useHaptic";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { authService } from "@/services/api";

interface BoostModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface BoostStatus {
    is_active: boolean;
    remaining_minutes: number;
    is_vip: boolean;
    boost_price_per_hour: number;
}

// Варианты длительности буста
const DURATION_OPTIONS = [
    { hours: 1, price: 25, label: "1 час", save: null },
    { hours: 3, price: 60, label: "3 часа", save: "20%" },
    { hours: 6, price: 100, label: "6 часов", save: "33%" },
    { hours: 12, price: 175, label: "12 часов", save: "42%" },
];

export function BoostModal({ isOpen, onClose }: BoostModalProps) {
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();

    const [status, setStatus] = useState<BoostStatus | null>(null);
    const [selected, setSelected] = useState(0);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Загрузка статуса буста при открытии
    useEffect(() => {
        if (!isOpen) return;
        setSuccess(false);
        setError(null);
        authService.getBoostStatus()
            .then(setStatus)
            .catch(() => setStatus(null));
    }, [isOpen]);

    // Форматирование оставшегося времени
    const formatRemaining = useCallback((minutes: number) => {
        if (minutes >= 60) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
        }
        return `${minutes}м`;
    }, []);

    const option = DURATION_OPTIONS[selected];
    // VIP получает 1ч бесплатно
    const isVipFree = status?.is_vip && option.hours === 1;
    const finalPrice = isVipFree ? 0 : option.price;

    const handleActivate = async () => {
        haptic.medium();
        setLoading(true);
        setError(null);

        try {
            const data = await authService.activateBoost(option.hours);

            if (data.success) {
                haptic.success();
                setSuccess(true);
                // Автозакрытие через 2с
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                haptic.error();
                setError("Не удалось активировать буст");
            }
        } catch (err: unknown) {
            haptic.error();
            const error = err as Error & { error?: string };
            const msg = error?.message || error?.error || "Произошла ошибка";
            setError(msg.includes("insufficient") ? "Недостаточно Stars" : msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0f0f11]/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={
                            prefersReducedMotion
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 300, damping: 25 }
                        }
                        className="relative w-full max-w-[360px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-700/50 shadow-2xl"
                    >
                        {/* Header с градиентом */}
                        <div className="relative p-8 pb-10 bg-gradient-to-br from-purple-600 via-orange-500 to-pink-500 text-center overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Ракета с анимацией */}
                            {success ? (
                                <motion.div
                                    initial={{ y: 0 }}
                                    animate={{ y: [0, -20, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                    className="text-6xl mb-3"
                                >
                                    🚀
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-6xl mb-3 drop-shadow-xl"
                                >
                                    🚀
                                </motion.div>
                            )}

                            <h2 className="text-2xl font-black text-white">
                                {success ? "Профиль на бусте!" : "Boost Profile"}
                            </h2>
                            <p className="text-white/80 text-sm font-medium mt-2">
                                {success
                                    ? "Вас увидят больше людей 🔥"
                                    : "Попадайте в топ выдачи и получайте больше лайков"}
                            </p>

                            {/* Текущий статус буста */}
                            {status?.is_active && !success && (
                                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold">
                                    <Zap size={12} className="fill-current" />
                                    Активен — {formatRemaining(status.remaining_minutes)} осталось
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {!success ? (
                                <>
                                    {/* VIP бейдж */}
                                    {status?.is_vip && (
                                        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                            <Crown size={14} className="text-amber-400" />
                                            <span className="text-xs font-bold text-amber-400">
                                                VIP — 1 час буста бесплатно каждый день
                                            </span>
                                        </div>
                                    )}

                                    {/* Варианты длительности */}
                                    <div className="grid grid-cols-2 gap-2 mb-5">
                                        {DURATION_OPTIONS.map((opt, i) => (
                                            <button
                                                key={opt.hours}
                                                onClick={() => {
                                                    haptic.light();
                                                    setSelected(i);
                                                }}
                                                className={cn(
                                                    "relative p-3 rounded-2xl border transition-all text-left",
                                                    selected === i
                                                        ? "bg-purple-500/15 border-purple-500/50 ring-1 ring-purple-500/30"
                                                        : "bg-slate-800/50 border-slate-700/30 hover:border-slate-600/50"
                                                )}
                                            >
                                                {opt.save && (
                                                    <div className="absolute -top-1.5 -right-1.5 bg-pink-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full">
                                                        -{opt.save}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Clock size={12} className="text-slate-400" />
                                                    <span className="text-sm font-bold text-white">{opt.label}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-amber-400 font-black text-lg">
                                                    {status?.is_vip && opt.hours === 1 ? (
                                                        <span className="text-emerald-400 text-sm">FREE</span>
                                                    ) : (
                                                        <>
                                                            {opt.price}
                                                            <Star size={14} className="fill-current" />
                                                        </>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Ошибка */}
                                    {error && (
                                        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] font-bold text-center uppercase tracking-widest">
                                            {error}
                                        </div>
                                    )}

                                    {/* Кнопка активации */}
                                    <button
                                        onClick={handleActivate}
                                        disabled={loading}
                                        className={cn(
                                            "w-full py-4 rounded-2xl font-black text-white transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2",
                                            loading
                                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                                : "bg-gradient-to-r from-purple-600 via-orange-500 to-pink-500 hover:shadow-xl"
                                        )}
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Rocket size={20} />
                                                {isVipFree ? "АКТИВИРОВАТЬ БЕСПЛАТНО" : `БУСТ ЗА ${finalPrice} ⭐`}
                                            </>
                                        )}
                                    </button>

                                    <p className="mt-3 text-[10px] text-slate-500 font-bold text-center uppercase tracking-widest leading-normal">
                                        Ваш профиль будет показан большему числу людей
                                    </p>
                                </>
                            ) : (
                                /* Успешное состояние */
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center py-6"
                                >
                                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                        <Check size={40} className="text-emerald-500" />
                                    </div>
                                    <p className="text-slate-300 text-sm font-black uppercase tracking-widest">
                                        Your profile is boosted! 🔥
                                    </p>
                                    <p className="text-slate-500 text-xs mt-2">
                                        {option.label} активного буста
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
