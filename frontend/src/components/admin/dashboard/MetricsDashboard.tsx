'use client';

import { motion } from 'framer-motion';
import { Activity, Users, Zap, TrendingUp, DollarSign, MessageCircle, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { GlassCard } from '@/components/ui/GlassCard';
import adminApi, { DashboardMetrics } from '@/services/admin';
import { cn } from '@/lib/utils';

// Metric Card Component
interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    color?: string;
    delay?: number;
}

const MetricCard = ({ title, value, icon: Icon, trend, color = "blue", delay = 0 }: MetricCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
    >
        <GlassCard className="p-5 h-full relative overflow-hidden group hover:bg-slate-800/60 transition-colors">
            <div className={cn(
                "absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity",
                `text-${color}-500`
            )}>
                <Icon size={80} />
            </div>

            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2 rounded-lg bg-opacity-20", `bg-${color}-500/20`)}>
                    <Icon size={24} className={`text-${color}-400`} />
                </div>
                {trend && (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>

            <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-100">{value}</h3>
            </div>
        </GlassCard>
    </motion.div>
);

const MetricsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-2xl animate-pulse" />
        ))}
    </div>
);

export const MetricsDashboard = () => {
    const { data: metrics, isLoading, isError } = useQuery<DashboardMetrics>({
        queryKey: ['admin', 'metrics'],
        queryFn: async () => {
            // In a real app, I'd rely on the global error handler or boundary
            try {
                const res = await adminApi.dashboard.getMetrics();
                return res || {
                    total_users: 0, active_today: 0, new_matches: 0,
                    messages_sent: 0, revenue_today: 0, premium_users: 0,
                    pending_moderation: 0, reports_today: 0, traffic_history: []
                };
            } catch (error) {
                console.error("Failed to fetch dashboard metrics", error);
                throw error; // Let react-query handle the error state
            }
        },
        refetchInterval: 30000, // Real-time ish
    });

    if (isLoading) return <MetricsSkeleton />;

    if (isError) {
        return (
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-red-400 font-semibold">Не удалось загрузить метрики</h3>
                <p className="text-red-300/60 text-sm">Please check your connection and try again.</p>
            </div>
        );
    }

    const m = metrics!;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Всего пользователей"
                    value={m.total_users.toLocaleString()}
                    icon={Users}
                    color="blue"
                    delay={0.1}
                />
                <MetricCard
                    title="Активных сегодня"
                    value={m.active_today.toLocaleString()}
                    icon={Activity}
                    color="emerald"
                    delay={0.2}
                />
                <MetricCard
                    title="Revenue Today"
                    value={`$${m.revenue_today.toLocaleString()}`}
                    icon={DollarSign}
                    color="purple"
                    delay={0.3}
                />
                <MetricCard
                    title="New Matches"
                    value={m.new_matches.toLocaleString()}
                    icon={Zap}
                    color="amber"
                    delay={0.4}
                />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Messages"
                    value={m.messages_sent.toLocaleString()}
                    icon={MessageCircle}
                    color="pink"
                    delay={0.5}
                />
                <MetricCard
                    title="Types (Reports)"
                    value={m.reports_today}
                    icon={ShieldAlert}
                    color="red"
                    delay={0.6}
                />
                {/* Placeholder for future metrics */}
                <MetricCard
                    title="Metrics Health"
                    value="98%"
                    icon={TrendingUp}
                    color="cyan"
                    delay={0.7}
                />
            </div>
        </div>
    );
};
