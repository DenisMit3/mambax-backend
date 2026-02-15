'use client';

import { Users, Crown, DollarSign, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { RevenueMetrics } from '@/services/admin';

export function SubscriptionStats({ metrics }: { metrics: RevenueMetrics | null }) {
    if (!metrics) return <div className="h-32 bg-white/5 animate-pulse rounded-xl mb-8" />;

    const totalSubs = metrics.subscription_breakdown.free.count +
        metrics.subscription_breakdown.gold.count +
        metrics.subscription_breakdown.platinum.count;
    const premiumSubs = metrics.subscription_breakdown.gold.count +
        metrics.subscription_breakdown.platinum.count;

    const stats = [
        { label: 'Всего подписчиков', value: totalSubs.toLocaleString(), icon: <Users size={18} />, color: '#3b82f6' },
        { label: 'Премиум пользователи', value: premiumSubs.toLocaleString(), icon: <Crown size={18} />, color: '#f59e0b' },
        { label: 'Месячный доход', value: `$${metrics.month.toLocaleString()}`, icon: <DollarSign size={18} />, color: '#10b981' },
        { label: 'ARPPU', value: `$${metrics.arppu.toFixed(2)}`, icon: <TrendingUp size={18} />, color: '#a855f7' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
                <GlassCard key={stat.label} className="p-5">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${stat.color}33`, color: stat.color }}>
                            {stat.icon}
                        </div>
                    </div>
                    <div>
                        <span className="block text-2xl font-bold text-[var(--admin-text-primary)]">{stat.value}</span>
                        <span className="text-xs text-[var(--admin-text-muted)]">{stat.label}</span>
                    </div>
                </GlassCard>
            ))}
        </div>
    );
}
