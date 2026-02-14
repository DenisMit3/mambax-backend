"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Star, Crown, Clock, ArrowLeft, Zap, Info, RefreshCw, AlertTriangle } from "lucide-react";
import { authService } from "@/services/api";
import { useHaptic } from "@/hooks/useHaptic";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface SuperlikeInfo {
    remaining: number;
    daily_limit: number;
    is_vip: boolean;
    resets_at: string;
}

export default function SuperlikePage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();
    const [info, setInfo] = useState<SuperlikeInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState("");

    useEffect(() => {
        if (isAuthed) loadInfo();
    }, [isAuthed]);

    const loadInfo = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await authService.getSuperlikeInfo();
            setInfo(data);
        } catch (err) {
            console.error("Не удалось загрузить информацию о суперлайках:", err);
            setError("Не удалось загрузить данные. Проверьте подключение к интернету.");
            setInfo(null);
        } finally {
            setLoading(false);
        }
    };

    // Таймер обратного отсчёта до сброса
    const updateCountdown = useCallback(() => {
        if (!info?.resets_at) return;
        const diff = new Date(info.resets_at).getTime() - Date.now();
        if (diff <= 0) {
            setCountdown("Обновлено!");
            return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${h}ч ${m}м ${s}с`);
    }, [info?.resets_at]);

    useEffect(() => {
        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [updateCountdown]);

    // Прогресс-кольцо: процент использованных суперлайков
    const used = info ? info.daily_limit - info.remaining : 0;
    const progress = info ? used / info.daily_limit : 0;
    const circumference = 2 * Math.PI * 54;
    const strokeOffset = circumference * (1 - progress);

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    // Экран ошибки с кнопкой повтора
    if (error) {
        return (
            <div className="min-h-[100dvh] bg-black text-white">
                <div className="flex items-center gap-3 p-4">
                    <button
                        onClick={() => { haptic.light(); router.back(); }}
                        className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center"
                    >
                        <ArrowLeft size={20} className="text-slate-300" />
                    </button>
                    <h1 className="text-lg font-bold">Superlike</h1>
                </div>
                <div className="flex flex-col items-center justify-center px-6 pt-24 text-center">
                    <AlertTriangle size={48} className="text-yellow-500 mb-4" />
                    <p className="text-slate-300 text-base mb-6">{error}</p>
                    <button
                        onClick={loadInfo}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold active:scale-95 transition"
                    >
                        <RefreshCw size={18} />
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-black text-white">
            {/* Хедер */}
            <div className="flex items-center gap-3 p-4">
                <button
                    onClick={() => { haptic.light(); router.back(); }}
                    className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center"
                >
                    <ArrowLeft size={20} className="text-slate-300" />
                </button>
                <h1 className="text-lg font-bold">Superlike</h1>
            </div>

            {/* Звезда с анимацией + прогресс-кольцо */}
            <motion.div
                className="flex flex-col items-center pt-4 pb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* SVG прогресс-кольцо */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="6" />
                        <motion.circle
                            cx="60" cy="60" r="54"
                            fill="none"
                            stroke="url(#superlikeGrad)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: strokeOffset }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                        <defs>
                            <linearGradient id="superlikeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Пульсирующая звезда */}
                    <motion.div
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Star size={48} className="text-blue-400 fill-blue-500 drop-shadow-[0_0_16px_rgba(59,130,246,0.5)]" />
                    </motion.div>
                </div>

                {/* Счётчик */}
                <motion.div
                    className="mt-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <p className="text-3xl font-bold">
                        <span className="text-blue-400">{info?.remaining}</span>
                        <span className="text-slate-500 text-xl"> / {info?.daily_limit}</span>
                    </p>
                    <p className="text-sm text-slate-400 mt-1">суперлайков осталось</p>
                </motion.div>
            </motion.div>

            {/* Таймер сброса */}
            <motion.div
                className="mx-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <Clock size={20} className="text-purple-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-slate-400">Обновление через</p>
                    <p className="text-lg font-bold text-white">{countdown}</p>
                </div>
            </motion.div>

            {/* VIP бейдж */}
            <motion.div
                className="mx-5 mt-3 p-4 rounded-2xl border flex items-center gap-3"
                style={{
                    background: info?.is_vip
                        ? "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(168,85,247,0.08))"
                        : "#0f172a",
                    borderColor: info?.is_vip ? "rgba(234,179,8,0.3)" : "#1e293b",
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                    <Crown size={20} className={info?.is_vip ? "text-yellow-400" : "text-slate-500"} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                            {info?.is_vip ? "VIP активен" : "Обычный аккаунт"}
                        </p>
                        {info?.is_vip && (
                            <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 text-[11px] font-bold">
                                VIP
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {info?.is_vip ? "5 суперлайков в день" : "1 суперлайк в день"}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <Zap size={14} className={info?.is_vip ? "text-yellow-400" : "text-slate-600"} />
                    <span className={`text-lg font-bold ${info?.is_vip ? "text-yellow-400" : "text-slate-500"}`}>
                        {info?.is_vip ? "5" : "1"}
                    </span>
                    <span className="text-xs text-slate-500">/день</span>
                </div>
            </motion.div>

            {/* Что такое Superlike */}
            <motion.div
                className="mx-5 mt-6 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Info size={16} className="text-blue-400" />
                    <h2 className="text-base font-bold">Что такое Superlike?</h2>
                </div>
                <div className="space-y-2.5">
                    {[
                        { icon: Star, color: "text-blue-400", text: "Ваш профиль выделяется среди остальных" },
                        { icon: Zap, color: "text-purple-400", text: "В 3 раза больше шансов на мэтч" },
                        { icon: Crown, color: "text-yellow-400", text: "VIP получает 5 суперлайков вместо 1" },
                    ].map((item, i) => (
                        <motion.div
                            key={item.text}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/60"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + i * 0.1 }}
                        >
                            <item.icon size={18} className={item.color} />
                            <p className="text-sm text-slate-300">{item.text}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* CTA кнопка — Get VIP */}
            {!info?.is_vip && (
                <motion.div
                    className="px-5 pt-4 pb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                >
                    <button
                        onClick={() => { haptic.medium(); router.push("/profile/premium"); }}
                        className="w-full py-4 rounded-2xl font-bold text-base border-0 cursor-pointer text-white"
                        style={{
                            background: "linear-gradient(135deg, #3b82f6, #a855f7, #eab308)",
                        }}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Crown size={20} />
                            Получить VIP — 5 суперлайков в день
                        </span>
                    </button>
                </motion.div>
            )}
        </div>
    );
}
