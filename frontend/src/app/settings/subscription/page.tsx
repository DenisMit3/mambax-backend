"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Check, Zap, Star, Shield, Eye, Rocket, X, AlertTriangle } from "lucide-react";
import { authService } from "@/services/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface Subscription {
    plan: string | null;
    status: "active" | "cancelled" | "expired" | null;
    expires_at: string | null;
    auto_renew: boolean;
    features: string[];
}

const PLANS = [
    {
        id: "basic",
        name: "Basic",
        price: 0,
        period: "бесплатно",
        features: ["10 свайпов/день", "Базовый чат", "1 суперлайк/неделю"],
        color: "from-slate-500 to-slate-600",
    },
    {
        id: "plus",
        name: "Plus",
        price: 299,
        period: "/мес",
        features: ["Безлимит свайпов", "Кто смотрел профиль", "5 суперлайков/день", "Отмена свайпа", "Без рекламы"],
        color: "from-blue-500 to-cyan-500",
        popular: true,
    },
    {
        id: "premium",
        name: "Премиум",
        price: 599,
        period: "/мес",
        features: ["Всё из Plus", "Приоритет в ленте", "Буст каждую неделю", "Инкогнито режим", "Расширенные фильтры", "VIP-поддержка"],
        color: "from-amber-500 to-orange-500",
    },
];

export default function SubscriptionPage() {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [showCancel, setShowCancel] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isAuthed) return;
        authService.getSubscription()
            .then(setSubscription)
            .catch(() => setSubscription({ plan: null, status: null, expires_at: null, auto_renew: false, features: [] }))
            .finally(() => setLoading(false));
    }, [isAuthed]);

    const handleSubscribe = async (planId: string) => {
        if (planId === "basic") return;
        setProcessing(true);
        try {
            await authService.subscribe(planId);
            const updated = await authService.getSubscription();
            setSubscription(updated);
            setSelectedPlan(null);
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        setProcessing(true);
        try {
            await authService.cancelSubscription();
            const updated = await authService.getSubscription();
            setSubscription(updated);
            setShowCancel(false);
        } catch (e) {
            console.error(e);
        } finally {
            setProcessing(false);
        }
    };

    if (loading || isChecking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const currentPlan = subscription?.plan || "basic";

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-4 px-4 py-4">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold">Подписка</h1>
                </div>
            </div>

            <div className="px-4 py-6 space-y-6">
                {/* Current Status */}
                {subscription?.status === "active" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Crown size={20} className="text-amber-400" />
                            <span className="font-bold text-amber-400">
                                {PLANS.find(p => p.id === currentPlan)?.name || currentPlan}
                            </span>
                        </div>
                        <p className="text-sm text-slate-400">
                            {subscription.auto_renew
                                ? `Следующее списание: ${new Date(subscription.expires_at || "").toLocaleDateString("ru")}`
                                : `Действует до: ${new Date(subscription.expires_at || "").toLocaleDateString("ru")}`
                            }
                        </p>
                        {subscription.auto_renew && (
                            <button
                                onClick={() => setShowCancel(true)}
                                className="mt-3 text-sm text-red-400 hover:text-red-300 transition"
                            >
                                Отменить подписку
                            </button>
                        )}
                    </motion.div>
                )}

                {/* Plans */}
                <div className="space-y-4">
                    {PLANS.map((plan, i) => {
                        const isCurrent = currentPlan === plan.id;
                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative p-5 rounded-2xl border transition-all ${
                                    isCurrent
                                        ? "border-amber-500/40 bg-amber-500/5"
                                        : "border-white/10 bg-white/5 hover:border-white/20"
                                }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-xs font-bold">
                                        Популярный
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black">
                                                {plan.price === 0 ? "Free" : `${plan.price}⭐`}
                                            </span>
                                            {plan.price > 0 && (
                                                <span className="text-sm text-slate-500">{plan.period}</span>
                                            )}
                                        </div>
                                    </div>
                                    {isCurrent && (
                                        <div className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                                            Текущий
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 mb-4">
                                    {plan.features.map((f) => (
                                        <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                                            <Check size={14} className="text-green-400 flex-shrink-0" />
                                            {f}
                                        </div>
                                    ))}
                                </div>

                                {!isCurrent && plan.price > 0 && (
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={processing}
                                        className={`w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r ${plan.color} text-white active:scale-[0.98] transition-transform disabled:opacity-50`}
                                    >
                                        {processing ? "Обработка..." : "Подключить"}
                                    </button>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Cancel Modal */}
            <AnimatePresence>
                {showCancel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setShowCancel(false)}
                    >
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-slate-900 rounded-t-3xl p-6 border-t border-white/10"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle size={24} className="text-amber-400" />
                                <h3 className="text-lg font-bold">Отменить подписку?</h3>
                            </div>
                            <p className="text-sm text-slate-400 mb-6">
                                Вы потеряете доступ к премиум-функциям после окончания текущего периода.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancel(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/10 font-bold text-sm"
                                >
                                    Оставить
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={processing}
                                    className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-sm disabled:opacity-50"
                                >
                                    {processing ? "..." : "Отменить"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
