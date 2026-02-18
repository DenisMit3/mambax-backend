'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Eye, Heart, Star, MessageCircle, TrendingUp,
    TrendingDown, Minus, BarChart3, Users, Zap
} from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface AnalyticsData {
    views_today: number;
    views_week: number;
    views_trend: number;
    likes_received_today: number;
    likes_received_week: number;
    likes_trend: number;
    matches_week: number;
    matches_trend: number;
    messages_received_week: number;
    superlikes_received_week: number;
    profile_score: number;
    top_viewers_age_range: string;
    peak_activity_hour: string;
}

function TrendBadge({ value }: { value: number }) {
    if (value > 0) return (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-400">
            <TrendingUp size={10} />+{value}%
        </span>
    );
    if (value < 0) return (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400">
            <TrendingDown size={10} />{value}%
        </span>
    );
    return (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
            <Minus size={10} />0%
        </span>
    );
}

export default function ProfileAnalyticsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthed) return;
        authService.getProfileAnalytics()
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isAuthed]);

    if (isChecking || loading) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center px-6">
                <BarChart3 size={48} className="text-slate-600 mb-4" />
                <p className="text-slate-400 text-sm">Аналитика пока недоступна</p>
                <button onClick={() => router.back()} className="mt-4 text-purple-400 text-sm">Назад</button>
            </div>
        );
    }

    const stats = [
        { icon: Eye, label: 'Просмотры сегодня', value: data.views_today, trend: data.views_trend, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { icon: Eye, label: 'Просмотры за неделю', value: data.views_week, trend: data.views_trend, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { icon: Heart, label: 'Лайки сегодня', value: data.likes_received_today, trend: data.likes_trend, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        { icon: Heart, label: 'Лайки за неделю', value: data.likes_received_week, trend: data.likes_trend, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        { icon: Users, label: 'Матчи за неделю', value: data.matches_week, trend: data.matches_trend, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { icon: MessageCircle, label: 'Сообщения за неделю', value: data.messages_received_week, trend: 0, color: 'text-green-400', bg: 'bg-green-500/10' },
        { icon: Star, label: 'Суперлайки за неделю', value: data.superlikes_received_week, trend: 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ];

    return (
        <div className="min-h-dvh bg-black text-white pb-24">
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => { haptic.light(); router.back(); }} className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <BarChart3 size={18} className="text-purple-400" />
                        <h1 className="text-lg font-semibold">Аналитика профиля</h1>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-6">
                {/* Profile score */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-[#ff4b91]/10 to-[#ff9e4a]/10 border border-[#ff4b91]/20 text-center"
                >
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Рейтинг профиля</p>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-black text-white">{data.profile_score}</span>
                        <span className="text-lg text-slate-500">/100</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${data.profile_score}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] rounded-full"
                        />
                    </div>
                </motion.div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                    {stats.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="p-3.5 rounded-2xl bg-[#0f0f11] border border-white/5"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                                        <Icon size={14} className={stat.color} />
                                    </div>
                                    <TrendBadge value={stat.trend} />
                                </div>
                                <p className="text-xl font-bold text-white">{stat.value}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Insights */}
                <section>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">Инсайты</p>
                    <div className="space-y-2">
                        {data.top_viewers_age_range && (
                            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0f0f11] border border-white/5">
                                <Users size={16} className="text-purple-400 shrink-0" />
                                <div>
                                    <p className="text-xs font-medium text-white">Основная аудитория</p>
                                    <p className="text-[10px] text-slate-500">{data.top_viewers_age_range} лет</p>
                                </div>
                            </div>
                        )}
                        {data.peak_activity_hour && (
                            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0f0f11] border border-white/5">
                                <Zap size={16} className="text-amber-400 shrink-0" />
                                <div>
                                    <p className="text-xs font-medium text-white">Пик активности</p>
                                    <p className="text-[10px] text-slate-500">{data.peak_activity_hour}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
