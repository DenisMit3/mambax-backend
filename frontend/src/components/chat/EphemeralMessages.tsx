"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Clock, X, Check } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

interface EphemeralToggleProps {
    isEnabled: boolean;
    seconds: number;
    onToggle: (enabled: boolean) => void;
    onChangeSeconds: (seconds: number) => void;
}

const TIMER_OPTIONS = [
    { value: 5, label: "5с" },
    { value: 10, label: "10с" },
    { value: 30, label: "30с" },
    { value: 60, label: "1м" },
    { value: 300, label: "5м" },
];

export function EphemeralToggle({ isEnabled, seconds, onToggle, onChangeSeconds }: EphemeralToggleProps) {
    const haptic = useHaptic();
    const [showOptions, setShowOptions] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (isEnabled) {
                        onToggle(false);
                        setShowOptions(false);
                    } else {
                        setShowOptions(!showOptions);
                    }
                    haptic.light();
                }}
                className={`p-2 rounded-xl transition-colors ${
                    isEnabled
                        ? "bg-purple-500/20 border border-purple-500/40 text-purple-400"
                        : "bg-white/10 border border-white/10 text-slate-400 hover:text-white"
                }`}
                title={isEnabled ? `Исчезающие: ${seconds}с (нажми чтобы выключить)` : "Исчезающие сообщения"}
            >
                <Timer size={16} />
                {isEnabled && (
                    <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[8px] font-black px-1 rounded-full">
                        {seconds}с
                    </span>
                )}
            </button>

            <AnimatePresence>
                {showOptions && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute bottom-full mb-2 right-0 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-xl min-w-[160px] z-50"
                    >
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-2 pb-1.5">
                            Таймер исчезновения
                        </p>
                        {TIMER_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    haptic.light();
                                    onChangeSeconds(opt.value);
                                    onToggle(true);
                                    setShowOptions(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                                    isEnabled && seconds === opt.value
                                        ? "bg-purple-500/20 text-purple-300"
                                        : "text-slate-300 hover:bg-slate-800"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Clock size={12} />
                                    <span>{opt.label}</span>
                                </div>
                                {isEnabled && seconds === opt.value && <Check size={14} className="text-purple-400" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface EphemeralTimerBadgeProps {
    seconds: number;
    startedAt: Date;
    onExpired: () => void;
}

export function EphemeralTimerBadge({ seconds, startedAt, onExpired }: EphemeralTimerBadgeProps) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = (Date.now() - startedAt.getTime()) / 1000;
            const left = Math.max(0, seconds - elapsed);
            setRemaining(Math.ceil(left));
            if (left <= 0) {
                clearInterval(interval);
                onExpired();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [seconds, startedAt, onExpired]);

    const progress = remaining / seconds;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1 bg-purple-500/20 px-2 py-0.5 rounded-full"
        >
            <Timer size={10} className="text-purple-400" />
            <span className={`text-[10px] font-bold ${remaining <= 3 ? "text-red-400" : "text-purple-300"}`}>
                {remaining}с
            </span>
            <div className="w-8 h-1 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-purple-400 rounded-full"
                    style={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.1 }}
                />
            </div>
        </motion.div>
    );
}
