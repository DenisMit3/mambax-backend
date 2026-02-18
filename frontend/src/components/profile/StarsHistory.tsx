'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowUpRight, ArrowDownLeft, Zap, Gift, Crown, ShoppingBag } from 'lucide-react';
import { authService } from '@/services/api';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
    boost_purchase: { icon: Zap, color: 'text-amber-400' },
    gift_sent: { icon: Gift, color: 'text-purple-400' },
    gift_received: { icon: Gift, color: 'text-green-400' },
    premium_purchase: { icon: Crown, color: 'text-yellow-400' },
    daily_reward: { icon: Star, color: 'text-orange-400' },
    referral_bonus: { icon: ArrowDownLeft, color: 'text-blue-400' },
    purchase: { icon: ShoppingBag, color: 'text-pink-400' },
};

interface StarsHistoryProps {
    balance: number;
}

export function StarsHistory({ balance }: StarsHistoryProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        authService.getStarsHistory()
            .then(data => setTransactions(data.transactions || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const visible = expanded ? transactions : transactions.slice(0, 5);

    return (
        <div className="mb-6">
            {/* Balance header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Баланс звёзд</p>
                <div className="flex items-center gap-1.5">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-white">{balance}</span>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 rounded-xl bg-[#0f0f11] animate-pulse" />
                    ))}
                </div>
            ) : transactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#0f0f11] border border-white/5 text-center">
                    <Star size={24} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Нет транзакций</p>
                </div>
            ) : (
                <>
                    <div className="space-y-1.5">
                        {visible.map((tx, i) => {
                            const config = TYPE_CONFIG[tx.type] || { icon: Star, color: 'text-slate-400' };
                            const Icon = config.icon;
                            const isIncome = tx.amount > 0;
                            return (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0f0f11] border border-white/5"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                        <Icon size={14} className={config.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-white truncate">{tx.description}</p>
                                        <p className="text-[10px] text-slate-600">
                                            {new Date(tx.created_at).toLocaleDateString('ru-RU', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                                        {isIncome ? '+' : ''}{tx.amount} ⭐
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>

                    {transactions.length > 5 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-white transition text-center"
                        >
                            {expanded ? 'Свернуть' : `Показать все (${transactions.length})`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
