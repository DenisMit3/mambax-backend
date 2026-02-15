'use client';

import { Crown, Zap, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubscriptionCardProps {
    tier: string;
    expiresAt?: string;
}

export function SubscriptionCard({ tier, expiresAt }: SubscriptionCardProps) {
    const isFree = !tier || tier === 'free';

    if (isFree) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center">
                        <Zap size={20} className="text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Бесплатный план</p>
                        <p className="text-xs text-slate-500">Обновитесь для полного доступа</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-slate-400 font-medium">Free</span>
                </div>
            </motion.div>
        );
    }

    const isGold = tier === 'gold';
    const gradient = isGold
        ? 'from-amber-500/15 to-orange-500/10 border-amber-500/20'
        : 'from-purple-500/15 to-pink-500/10 border-purple-500/20';
    const iconColor = isGold ? 'text-amber-400' : 'text-purple-400';
    const bgColor = isGold ? 'bg-amber-500/10' : 'bg-purple-500/10';
    const badgeColor = isGold ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-2xl bg-gradient-to-br ${gradient} border`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
                    <Crown size={20} className={iconColor} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{isGold ? 'Gold' : 'Platinum'}</p>
                        <CheckCircle size={14} className={iconColor} />
                    </div>
                    {expiresAt && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <Clock size={10} className="text-slate-500" />
                            <p className="text-[10px] text-slate-500">
                                до {new Date(expiresAt).toLocaleDateString('ru-RU')}
                            </p>
                        </div>
                    )}
                </div>
                <span className={`px-3 py-1 rounded-full ${badgeColor} text-xs font-bold`}>
                    {isGold ? 'GOLD' : 'VIP'}
                </span>
            </div>
        </motion.div>
    );
}
