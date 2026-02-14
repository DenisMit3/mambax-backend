"use client";

import { useState, useEffect } from "react";
import { X, Zap, Star, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/useHaptic";
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { authService } from "@/services/api";

interface BuySwipesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onSuccess?: () => void;
    mode?: 'swipes' | 'superlike' | 'boost';
}

const FALLBACK_PRICING = {
    swipes: { price: 10, count: 10, label: "Swipe Pack", icon: "❤️", gradient: "from-neon-pink to-neon-red" },
    superlike: { price: 5, count: 1, label: "Super Like", icon: "⭐", gradient: "from-neon-blue to-neon-purple" },
    boost: { price: 25, count: 1, label: "1 Hour Boost", icon: "🚀", gradient: "from-neon-orange to-primary-red" }
};

export function BuySwipesModal({
    isOpen,
    onClose,
    currentBalance,
    onSuccess,
    mode = 'swipes'
}: BuySwipesModalProps) {
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [pricing, setPricing] = useState(FALLBACK_PRICING);

    // Load dynamic pricing from API
    useEffect(() => {
        if (!isOpen) return;
        authService.getPricing()
            .then((data) => {
                if (data) {
                    setPricing(prev => ({
                        swipes: {
                            ...prev.swipes,
                            price: data.swipe_pack?.price ?? prev.swipes.price,
                            count: data.swipe_pack?.count ?? prev.swipes.count,
                        },
                        superlike: {
                            ...prev.superlike,
                            price: data.superlike?.price ?? prev.superlike.price,
                            count: data.superlike?.count ?? prev.superlike.count,
                        },
                        boost: {
                            ...prev.boost,
                            price: data.boost?.price_per_hour ?? prev.boost.price,
                        },
                    }));
                }
            })
            .catch((e) => console.warn('Operation failed:', e)); // fallback to hardcoded
    }, [isOpen]);

    const item = pricing[mode];
    const canAfford = currentBalance >= item.price;

    const handlePurchase = async () => {
        haptic.medium();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
            const endpoint = mode === 'swipes'
                ? '/api_proxy/payments/buy-swipes'
                : mode === 'superlike'
                    ? '/api_proxy/payments/buy-superlike'
                    : '/api_proxy/payments/activate-boost';

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: mode === 'boost' ? JSON.stringify({ duration_hours: 1 }) : undefined
            });

            const data = await response.json();

            if (data.success) {
                haptic.success();
                setSuccess(true);
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1500);
            } else {
                haptic.error();
                setError(data.error === 'insufficient_balance'
                    ? `Not enough Stars. Need ${data.required}, have ${data.available}`
                    : data.error || 'Purchase failed');
            }
        } catch (err: unknown) {
            haptic.error();
            const error = err as Error;
            setError(error.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-[340px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-700/50 shadow-2xl"
                    >
                        {/* Header */}
                        <div className={cn("relative p-8 pb-12 bg-gradient-to-br text-center overflow-hidden", item.gradient)}>
                            <div className="absolute top-0 right-0 p-4">
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-6xl mb-4 drop-shadow-xl"
                            >
                                {item.icon}
                            </motion.div>

                            <h2 className="text-2xl font-black text-white decoration-amber-400">
                                {success ? 'Success!' : `Get ${item.label}`}
                            </h2>
                            <p className="text-white/80 text-sm font-medium mt-2 leading-tight">
                                {success
                                    ? mode === 'swipes'
                                        ? `+${item.count} swipes added!`
                                        : mode === 'superlike'
                                            ? 'Super Like activated!'
                                            : 'Your profile is now boosted!'
                                    : mode === 'swipes'
                                        ? 'Keep swiping with extra swipes'
                                        : mode === 'superlike'
                                            ? 'Stand out with a Super Like'
                                            : 'Get more visibility for 1 hour'
                                }
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {!success ? (
                                <>
                                    {/* Price Card */}
                                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex justify-between items-center mb-6">
                                        <div>
                                            <div className="text-sm font-black text-white uppercase tracking-wider">
                                                {mode === 'swipes' ? `${item.count} Swipes` : item.label}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                                Instant Activation
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-2xl font-black text-amber-400">
                                            {item.price}
                                            <Star size={20} className="fill-current" />
                                        </div>
                                    </div>

                                    {/* Balance */}
                                    <div className="flex justify-between items-center mb-6 px-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Balance</span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            canAfford ? "text-amber-400" : "text-rose-500"
                                        )}>
                                            {currentBalance} ⭐
                                        </span>
                                    </div>

                                    {error && (
                                        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] font-bold text-center uppercase tracking-widest">
                                            {error}
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <button
                                        onClick={handlePurchase}
                                        disabled={!canAfford || loading}
                                        className={cn(
                                            "w-full py-4 rounded-2xl font-black text-white transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2",
                                            canAfford && !loading
                                                ? cn("bg-gradient-to-r hover:shadow-lg", item.gradient)
                                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                        )}
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : canAfford ? (
                                            <>
                                                <Zap size={20} className="fill-current" />
                                                BUY NOW
                                            </>
                                        ) : (
                                            'NOT ENOUGH STARS'
                                        )}
                                    </button>

                                    {!canAfford && (
                                        <p className="mt-4 text-[10px] text-slate-500 font-bold text-center uppercase tracking-widest leading-normal">
                                            Top up your Stars balance<br />to continue swiping
                                        </p>
                                    )}
                                </>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-center py-6"
                                >
                                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                        <CheckCircle2 size={40} className="text-emerald-500" />
                                    </div>
                                    <div className="flex justify-center gap-1 mb-2">
                                        {[...Array(3)].map((_, i) => (
                                            <Sparkles key={i} size={16} className="text-amber-400 animate-pulse" />
                                        ))}
                                    </div>
                                    <p className="text-slate-300 text-sm font-black uppercase tracking-widest">
                                        {mode === 'swipes' ? 'Happy swiping! 💕' : mode === 'superlike' ? 'Use it wisely! 💙' : 'You\'re on fire! 🔥'}
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
