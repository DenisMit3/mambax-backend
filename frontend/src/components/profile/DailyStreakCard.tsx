'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Gift, Star } from 'lucide-react';
import { authService } from '@/services/api';

interface DailyRewardState {
    can_claim: boolean;
    streak: number;
    today_reward: number;
    next_reward: number;
    rewards_schedule: number[];
}

export function DailyStreakCard() {
    const [state, setState] = useState<DailyRewardState | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [justClaimed, setJustClaimed] = useState(false);

    useEffect(() => {
        authService.getDailyRewardStatus()
            .then(setState)
            .catch(() => {});
    }, []);

    const claim = async () => {
        if (!state?.can_claim || claiming) return;
        setClaiming(true);
        try {
            const res = await authService.claimDailyReward();
            if (res.success) {
                setJustClaimed(true);
                setState(prev => prev ? {
                    ...prev,
                    can_claim: false,
                    streak: res.new_streak,
                } : null);
                setTimeout(() => setJustClaimed(false), 3000);
            }
        } catch (e) {
            console.error('Claim failed:', e);
        } finally {
            setClaiming(false);
        }
    };

    if (!state) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20"
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                    <Flame size={20} className="text-orange-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">Серия входов</p>
                        <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[11px] font-bold">
                            {state.streak} 🔥
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        {state.can_claim ? `Получите ${state.today_reward} ⭐ сегодня!` : 'Приходите завтра за наградой'}
                    </p>
                </div>
            </div>

            {/* Streak dots */}
            <div className="flex gap-1.5 mb-3">
                {(state.rewards_schedule || [1, 2, 3, 5, 5, 10, 15]).map((reward, i) => (
                    <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full transition-colors ${
                            i < state.streak
                                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                : i === state.streak && state.can_claim
                                    ? 'bg-orange-500/40 animate-pulse'
                                    : 'bg-white/10'
                        }`}
                    />
                ))}
            </div>

            {/* Claim button */}
            {state.can_claim && (
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={claim}
                    disabled={claiming}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
                >
                    {claiming ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : justClaimed ? (
                        <>
                            <Star size={16} className="fill-white" />
                            Получено!
                        </>
                    ) : (
                        <>
                            <Gift size={16} />
                            Забрать {state.today_reward} ⭐
                        </>
                    )}
                </motion.button>
            )}
        </motion.div>
    );
}
