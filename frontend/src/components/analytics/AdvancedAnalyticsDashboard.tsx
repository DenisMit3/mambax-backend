'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { TrendingUp, Users, Heart, Eye, Star, Award } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { ViewsChart, ActivityStats, PeakActivity, Demographics } from './AnalyticsSections';
import type { AnalyticsData, AdvancedAnalyticsDashboardProps } from './types';

export type { AnalyticsData, AdvancedAnalyticsDashboardProps } from './types';

const METRIC_CARDS = [
    { id: 'views', title: 'Просмотры профиля', icon: Eye, color: 'from-blue-500 to-cyan-500',
        getValue: (data: AnalyticsData) => data.profileViews.total, getChange: (data: AnalyticsData) => data.profileViews.change },
    { id: 'likes', title: 'Полученные лайки', icon: Heart, color: 'from-pink-500 to-red-500',
        getValue: (data: AnalyticsData) => data.likes.received, getChange: (data: AnalyticsData) => data.likes.changeReceived },
    { id: 'matches', title: 'Матчи', icon: Users, color: 'from-green-500 to-emerald-500',
        getValue: (data: AnalyticsData) => data.likes.matches, getChange: (data: AnalyticsData) => data.likes.changeMatches },
    { id: 'super_likes', title: 'Super Likes', icon: Star, color: 'from-yellow-500 to-orange-500',
        getValue: (data: AnalyticsData) => data.superLikes.received, getChange: (data: AnalyticsData) => data.superLikes.changeReceived },
];

const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const formatChange = (change: number) => `${change >= 0 ? '+' : ''}${change}%`;
const getChangeColor = (change: number) => change >= 0 ? 'text-green-400' : 'text-red-400';

export const AdvancedAnalyticsDashboard = ({ data, isPremium, onUpgradeToPremium }: AdvancedAnalyticsDashboardProps) => {
    const { hapticFeedback } = useTelegram();
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

    const handlePeriodChange = (period: 'week' | 'month' | 'year') => {
        setSelectedPeriod(period);
        hapticFeedback.light();
    };

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
                <motion.div className="text-center max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <TrendingUp className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Продвинутая аналитика</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Получите детальную статистику по вашему профилю, узнайте кто вас лайкает и оптимизируйте свою стратегию знакомств
                    </p>
                    <AnimatedButton onClick={onUpgradeToPremium} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3">
                        <Award className="w-5 h-5 mr-2" /> Получить Premium
                    </AnimatedButton>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
            <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Аналитика</h1>
                <p className="text-gray-400">Детальная статистика вашего профиля</p>
            </motion.div>

            {/* Period Selector */}
            <motion.div className="flex space-x-2 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {(['week', 'month', 'year'] as const).map((period) => (
                    <AnimatedButton key={period} variant={selectedPeriod === period ? 'primary' : 'secondary'} size="sm"
                        onClick={() => handlePeriodChange(period)}
                        className={selectedPeriod === period ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}>
                        {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год'}
                    </AnimatedButton>
                ))}
            </motion.div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {METRIC_CARDS.map((metric, index) => {
                    const IconComponent = metric.icon;
                    const value = metric.getValue(data);
                    const change = metric.getChange(data);
                    return (
                        <motion.div key={metric.id} initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}>
                            <GlassCard className="p-6 cursor-pointer hover:scale-105 transition-transform">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                    <div className={`text-sm font-semibold ${getChangeColor(change)}`}>{formatChange(change)}</div>
                                </div>
                                <div className="text-2xl font-bold text-white mb-1">{formatNumber(value)}</div>
                                <div className="text-sm text-gray-400">{metric.title}</div>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            <ViewsChart data={data} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ActivityStats data={data} formatChange={formatChange} getChangeColor={getChangeColor} />
                <PeakActivity data={data} />
            </div>

            <Demographics data={data} />
        </div>
    );
};
