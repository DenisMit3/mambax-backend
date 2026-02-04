/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from "react";
import { X, Star, Loader2 } from "lucide-react";
import { useTelegram } from "@/lib/telegram";
import { authService } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";

const PACKAGES = [
    { id: 'starter', stars: 100, price: 100, label: 'Starter', popular: false },
    { id: 'pro', stars: 500, price: 500, label: 'Pro', popular: true },
    { id: 'whale', stars: 2500, price: 2500, label: 'Whale', popular: false },
];

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onSuccess?: () => void;
}

export function TopUpModal({ isOpen, onClose, currentBalance, onSuccess }: TopUpModalProps) {
    const { webApp, hapticFeedback } = useTelegram();
    const [loadingPkg, setLoadingPkg] = useState<string | null>(null);

    const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
        hapticFeedback.impactOccurred('heavy');
        setLoadingPkg(pkg.id);

        try {
            // 1. Create Invoice
            const invoice = await authService.createInvoice(pkg.stars, pkg.label);

            // 2. Open Telegram Interface (only if inside Telegram WebApp with supported version)
            const webApp = window.Telegram?.WebApp as any;
            const tgVersion = parseFloat(webApp?.version || '0');
            const supportsInvoice = webApp && typeof webApp.openInvoice === 'function' && tgVersion >= 6.1;

            if (supportsInvoice) {
                webApp.openInvoice(invoice.invoice_link, (status: string) => {
                    if (status === 'paid') {
                        hapticFeedback.notificationOccurred('success');
                        if (onSuccess) onSuccess();
                        onClose();
                        // Ideally we should listen to WS for balance update, but reload works for now
                        setTimeout(() => window.location.reload(), 1000);
                    } else if (status === 'cancelled' || status === 'failed') {
                        hapticFeedback.notificationOccurred('error');
                    }
                });
            } else {
                // Browser Fallback (Open link directly for dev/testing)
                if (invoice.invoice_link) {
                    window.open(invoice.invoice_link, '_blank');
                }
                console.info('[Dev Mode] Telegram openInvoice not available. Invoice link opened in new tab.');
            }

        } catch (error) {
            console.error("Payment setup failed", error);
            alert("Не удалось создать платеж. Попробуйте позже.");
        } finally {
            setLoadingPkg(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-[#0f1115] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl"
                        >
                            {/* Decor */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-wider">
                                    Пополнение
                                </h3>
                                <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Balance Card */}
                            <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-500/20 flex items-center gap-4 relative overflow-hidden">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                    <Star fill="currentColor" size={24} />
                                </div>
                                <div>
                                    <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Текущий баланс</div>
                                    <div className="text-2xl font-black text-white">{currentBalance} STARS</div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 relative z-10">
                                {PACKAGES.map((pkg) => (
                                    <button
                                        key={pkg.id}
                                        disabled={loadingPkg !== null}
                                        onClick={() => handlePurchase(pkg)}
                                        className={`relative w-full group overflow-hidden rounded-2xl p-4 border transition-all duration-300 flex items-center justify-between
                                            ${pkg.popular
                                                ? 'bg-gradient-to-r from-amber-500/20 to-orange-600/10 border-amber-500/50 hover:border-amber-500'
                                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}
                                            ${loadingPkg && loadingPkg !== pkg.id ? 'opacity-50' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pkg.popular ? 'bg-amber-500 text-black' : 'bg-white/10 text-white'}`}>
                                                <Star size={18} fill="currentColor" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-bold text-lg leading-none">{pkg.stars} STARS</div>
                                                <div className="text-slate-400 text-xs font-mono mt-1">{pkg.price} XTR</div>
                                            </div>
                                        </div>

                                        {loadingPkg === pkg.id ? (
                                            <Loader2 className="animate-spin text-white" />
                                        ) : (
                                            <div className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${pkg.popular ? 'bg-amber-500 text-black' : 'bg-white/10 text-white group-hover:bg-white/20'}`}>
                                                Купить
                                            </div>
                                        )}

                                        {pkg.popular && (
                                            <div className="absolute top-0 right-0 bg-amber-500 text-[9px] font-black text-black px-2 py-0.5 rounded-bl-lg">
                                                HIT
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="text-center text-[10px] text-slate-500">
                                Оплата производится через Telegram Stars (XTR).<br />
                                Средства зачисляются мгновенно.
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
