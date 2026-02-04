'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { TrendingUp, Users, Heart, Eye, Star, Calendar, Award, Target } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

interface AnalyticsData {
    profileViews: {
        total: number;
        change: number;
        chartData: { date: string; views: number }[];
    };
    likes: {
        received: number;
        sent: number;
        matches: number;
        changeReceived: number;
        changeSent: number;
        changeMatches: number;
    };
    superLikes: {
        received: number;
        sent: number;
        changeReceived: number;
        changeSent: number;
    };
    messages: {
        sent: number;
        received: number;
        responseRate: number;
        changeSent: number;
        changeReceived: number;
        changeResponseRate: number;
    };
    peakActivity: {
        day: string;
        hour: string;
        engagement: number;
    };
    demographics: {
        ageGroups: { range: string; percentage: number }[];
        locations: { city: string; percentage: number }[];
    };
}

interface AdvancedAnalyticsDashboardProps {
    data: AnalyticsData;
    isPremium: boolean;
    onUpgradeToPremium: () => void;
}

const METRIC_CARDS = [
    {
        id: 'views',
        title: 'Просмотры профиля',
        icon: Eye,
        color: 'from-blue-500 to-cyan-500',
        getValue: (data: AnalyticsData) => data.profileViews.total,
        getChange: (data: AnalyticsData) => data.profileViews.change
    },
    {
        id: 'likes',
        title: 'Полученные лайки',
        icon: Heart,
        color: 'from-pink-500 to-red-500',
        getValue: (data: AnalyticsData) => data.likes.received,
        getChange: (data: AnalyticsData) => data.likes.changeReceived
    },
    {
        id: 'matches',
        title: 'Матчи',
        icon: Users,
        color: 'from-green-500 to-emerald-500',
        getValue: (data: AnalyticsData) => data.likes.matches,
        getChange: (data: AnalyticsData) => data.likes.changeMatches
    },
    {
        id: 'super_likes',
        title: 'Super Likes',
        icon: Star,
        color: 'from-yellow-500 to-orange-500',
        getValue: (data: AnalyticsData) => data.superLikes.received,
        getChange: (data: AnalyticsData) => data.superLikes.changeReceived
    }
];

export const AdvancedAnalyticsDashboard = ({
    data,
    isPremium,
    onUpgradeToPremium
}: AdvancedAnalyticsDashboardProps) => {
    const { hapticFeedback } = useTelegram();
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
    const [selectedMetric, setSelectedMetric] = useState('views');

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change}%`;
    };

    const getChangeColor = (change: number) => {
        return change >= 0 ? 'text-green-400' : 'text-red-400';
    };

    const handlePeriodChange = (period: 'week' | 'month' | 'year') => {
        setSelectedPeriod(period);
        hapticFeedback.light();
    };

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
                <motion.div
                    className="text-center max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <TrendingUp className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Продвинутая аналитика
                    </h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Получите детальную статистику по вашему профилю, узнайте кто вас лайкает и оптимизируйте свою стратегию знакомств
                    </p>
                    <AnimatedButton
                        onClick={onUpgradeToPremium}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3"
                    >
                        <Award className="w-5 h-5 mr-2" />
                        Получить Premium
                    </AnimatedButton>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
            {/* Header */}
            <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-white mb-2">Аналитика</h1>
                <p className="text-gray-400">Детальная статистика вашего профиля</p>
            </motion.div>

            {/* Period Selector */}
            <motion.div
                className="flex space-x-2 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                {(['week', 'month', 'year'] as const).map((period) => (
                    <AnimatedButton
                        key={period}
                        variant={selectedPeriod === period ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handlePeriodChange(period)}
                        className={selectedPeriod === period ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}
                    >
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
                        <motion.div
                            key={metric.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                delay: index * 0.1,
                                duration: 0.4,
                                ease: 'easeOut'
                            }}
                        >
                            <GlassCard className="p-6 cursor-pointer hover:scale-105 transition-transform">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${metric.color} flex items-center justify-center`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                    <div className={`text-sm font-semibold ${getChangeColor(change)}`}>
                                        {formatChange(change)}
                                    </div>
                                </div>

                                <div className="text-2xl font-bold text-white mb-1">
                                    {formatNumber(value)}
                                </div>
                                <div className="text-sm text-gray-400">
                                    {metric.title}
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Chart Section */}
            <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <GlassCard className="p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Динамика просмотров</h3>

                    {/* Simple Chart Visualization */}
                    <div className="h-48 flex items-end space-x-2">
                        {data.profileViews.chartData.map((point, index) => {
                            const maxViews = Math.max(...data.profileViews.chartData.map(p => p.views));
                            const height = (point.views / maxViews) * 100;

                            return (
                                <motion.div
                                    key={index}
                                    className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg min-h-[4px]"
                                    style={{ height: `${height}%` }}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                />
                            );
                        })}
                    </div>

                    <div className="flex justify-between mt-4 text-xs text-gray-400">
                        {data.profileViews.chartData.map((point, index) => (
                            <span key={index}>{point.date}</span>
                        ))}
                    </div>
                </GlassCard>
            </motion.div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Activity Stats */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <GlassCard className="p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Активность</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-300">Отправлено лайков</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-white font-semibold">{data.likes.sent}</span>
                                    <span className={`text-sm ${getChangeColor(data.likes.changeSent)}`}>
                                        {formatChange(data.likes.changeSent)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-300">Отправлено сообщений</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-white font-semibold">{data.messages.sent}</span>
                                    <span className={`text-sm ${getChangeColor(data.messages.changeSent)}`}>
                                        {formatChange(data.messages.changeSent)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-300">Процент ответов</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-white font-semibold">{data.messages.responseRate}%</span>
                                    <span className={`text-sm ${getChangeColor(data.messages.changeResponseRate)}`}>
                                        {formatChange(data.messages.changeResponseRate)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Peak Activity */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <GlassCard className="p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Пик активности</h3>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-5 h-5 text-purple-400" />
                                <div>
                                    <p className="text-gray-300 text-sm">Лучший день</p>
                                    <p className="text-white font-semibold">{data.peakActivity.day}</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Target className="w-5 h-5 text-pink-400" />
                                <div>
                                    <p className="text-gray-300 text-sm">Лучшее время</p>
                                    <p className="text-white font-semibold">{data.peakActivity.hour}</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                <div>
                                    <p className="text-gray-300 text-sm">Вовлеченность</p>
                                    <p className="text-white font-semibold">{data.peakActivity.engagement}%</p>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Demographics */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                <GlassCard className="p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Демография ваших лайков</h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Age Groups */}
                        <div>
                            <h4 className="text-lg font-semibold text-white mb-4">По возрасту</h4>
                            <div className="space-y-3">
                                {data.demographics.ageGroups.map((group, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-gray-300">{group.range}</span>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${group.percentage}%` }}
                                                    transition={{ delay: index * 0.1, duration: 0.8 }}
                                                />
                                            </div>
                                            <span className="text-white font-semibold w-8 text-right">
                                                {group.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Locations */}
                        <div>
                            <h4 className="text-lg font-semibold text-white mb-4">По городам</h4>
                            <div className="space-y-3">
                                {data.demographics.locations.map((location, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-gray-300">{location.city}</span>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${location.percentage}%` }}
                                                    transition={{ delay: index * 0.1, duration: 0.8 }}
                                                />
                                            </div>
                                            <span className="text-white font-semibold w-8 text-right">
                                                {location.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};
