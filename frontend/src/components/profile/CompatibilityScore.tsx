'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { authService } from '@/services/api';

interface CompatibilityScoreProps {
    userId: string;
    compact?: boolean;
}

interface CompatibilityData {
    score: number;
    breakdown: { interests: number; age: number; location: number; activity: number };
    tips: string[];
}

// Цвет по уровню совместимости
const getScoreColor = (score: number) => {
    if (score >= 80) return { ring: '#a855f7', bg: 'from-purple-500/20 to-amber-500/20', text: 'text-purple-400', label: 'Идеально!' };
    if (score >= 60) return { ring: '#22c55e', bg: 'from-green-500/20 to-emerald-500/20', text: 'text-green-400', label: 'Хорошо' };
    if (score >= 30) return { ring: '#eab308', bg: 'from-yellow-500/20 to-orange-500/20', text: 'text-yellow-400', label: 'Средне' };
    return { ring: '#ef4444', bg: 'from-red-500/20 to-rose-500/20', text: 'text-red-400', label: 'Мало общего' };
};

// Иконки для категорий
const breakdownConfig = [
    { key: 'interests' as const, label: 'Интересы', icon: Heart },
    { key: 'age' as const, label: 'Возраст', icon: Calendar },
    { key: 'location' as const, label: 'Локация', icon: MapPin },
    { key: 'activity' as const, label: 'Активность', icon: TrendingUp },
];

// SVG-кольцо прогресса
const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const CompatibilityScore = ({ userId, compact = false }: CompatibilityScoreProps) => {
    const [data, setData] = useState<CompatibilityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        authService.getCompatibility(userId)
            .then(res => { if (!cancelled) setData(res); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    const colors = getScoreColor(data.score);
    const offset = CIRCUMFERENCE - (data.score / 100) * CIRCUMFERENCE;

    return (
        <div className={`rounded-2xl bg-slate-900 p-4 ${!compact ? 'space-y-4' : ''}`}>
            {/* Кольцо с процентом */}
            <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {/* Фоновое кольцо */}
                        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#334155" strokeWidth="6" />
                        {/* Анимированное кольцо прогресса */}
                        <motion.circle
                            cx="50" cy="50" r={RADIUS}
                            fill="none"
                            stroke={colors.ring}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={CIRCUMFERENCE}
                            initial={{ strokeDashoffset: CIRCUMFERENCE }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                    </svg>
                    {/* Число в центре */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            className={`text-xl font-bold ${colors.text}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {data.score}%
                        </motion.span>
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <Sparkles className={`w-4 h-4 ${colors.text}`} />
                        <span className="text-sm font-medium text-slate-200">Совместимость</span>
                    </div>
                    <p className={`text-xs mt-0.5 ${colors.text}`}>{colors.label}</p>
                </div>
            </div>

            {/* Детализация по категориям */}
            {!compact && (
                <motion.div
                    className="space-y-2.5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    {breakdownConfig.map(({ key, label, icon: Icon }) => {
                        const value = data.breakdown[key];
                        const barColor = getScoreColor(value);
                        return (
                            <div key={key} className="flex items-center gap-2.5">
                                <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className="text-xs text-slate-400 w-20 flex-shrink-0">{label}</span>
                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: barColor.ring }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${value}%` }}
                                        transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500 w-8 text-right">{value}%</span>
                            </div>
                        );
                    })}
                </motion.div>
            )}

            {/* Советы */}
            {!compact && data.tips.length > 0 && (
                <motion.div
                    className="space-y-1.5 pt-2 border-t border-slate-800"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    <p className="text-xs font-medium text-slate-400">Советы</p>
                    {data.tips.map((tip, i) => (
                        <p key={tip} className="text-xs text-slate-500 flex gap-1.5">
                            <span className="text-purple-400">•</span>
                            {tip}
                        </p>
                    ))}
                </motion.div>
            )}
        </div>
    );
};
