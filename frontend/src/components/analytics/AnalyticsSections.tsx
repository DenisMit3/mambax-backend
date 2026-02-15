'use client';

import { motion } from 'framer-motion';
import { Calendar, Target, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { AnalyticsData } from './types';

export function ViewsChart({ data }: { data: AnalyticsData }) {
    return (
        <motion.div className="mb-8" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Динамика просмотров</h3>
                <div className="h-48 flex items-end space-x-2">
                    {data.profileViews.chartData.map((point, index) => {
                        const maxViews = Math.max(...data.profileViews.chartData.map(p => p.views));
                        const height = (point.views / maxViews) * 100;
                        return (
                            <motion.div key={point.date || index}
                                className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg min-h-[4px]"
                                style={{ height: `${height}%` }}
                                initial={{ height: 0 }} animate={{ height: `${height}%` }}
                                transition={{ delay: index * 0.1, duration: 0.5 }} />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-400">
                    {data.profileViews.chartData.map((point, index) => (
                        <span key={point.date || index}>{point.date}</span>
                    ))}
                </div>
            </GlassCard>
        </motion.div>
    );
}

export function ActivityStats({ data, formatChange, getChangeColor }: {
    data: AnalyticsData; formatChange: (n: number) => string; getChangeColor: (n: number) => string;
}) {
    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Активность</h3>
                <div className="space-y-4">
                    {[
                        { label: 'Отправлено лайков', value: data.likes.sent, change: data.likes.changeSent },
                        { label: 'Отправлено сообщений', value: data.messages.sent, change: data.messages.changeSent },
                        { label: 'Процент ответов', value: `${data.messages.responseRate}%`, change: data.messages.changeResponseRate },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                            <span className="text-gray-300">{item.label}</span>
                            <div className="flex items-center space-x-2">
                                <span className="text-white font-semibold">{item.value}</span>
                                <span className={`text-sm ${getChangeColor(item.change)}`}>{formatChange(item.change)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </motion.div>
    );
}

export function PeakActivity({ data }: { data: AnalyticsData }) {
    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Пик активности</h3>
                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <div><p className="text-gray-300 text-sm">Лучший день</p><p className="text-white font-semibold">{data.peakActivity.day}</p></div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Target className="w-5 h-5 text-pink-400" />
                        <div><p className="text-gray-300 text-sm">Лучшее время</p><p className="text-white font-semibold">{data.peakActivity.hour}</p></div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <div><p className="text-gray-300 text-sm">Вовлеченность</p><p className="text-white font-semibold">{data.peakActivity.engagement}%</p></div>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}

export function Demographics({ data }: { data: AnalyticsData }) {
    return (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Демография ваших лайков</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">По возрасту</h4>
                        <div className="space-y-3">
                            {data.demographics.ageGroups.map((group, index) => (
                                <div key={group.range || index} className="flex items-center justify-between">
                                    <span className="text-gray-300">{group.range}</span>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                initial={{ width: 0 }} animate={{ width: `${group.percentage}%` }}
                                                transition={{ delay: index * 0.1, duration: 0.8 }} />
                                        </div>
                                        <span className="text-white font-semibold w-8 text-right">{group.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">По городам</h4>
                        <div className="space-y-3">
                            {data.demographics.locations.map((location, index) => (
                                <div key={location.city || index} className="flex items-center justify-between">
                                    <span className="text-gray-300">{location.city}</span>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                initial={{ width: 0 }} animate={{ width: `${location.percentage}%` }}
                                                transition={{ delay: index * 0.1, duration: 0.8 }} />
                                        </div>
                                        <span className="text-white font-semibold w-8 text-right">{location.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}
