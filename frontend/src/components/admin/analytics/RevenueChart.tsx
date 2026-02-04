'use client';

import { motion } from 'framer-motion';
import { DollarSign, PieChart, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueSource {
    source: string;
    amount: number;
    percentage: number;
}

interface RevenueBreakdownData {
    period: string;
    total: number;
    sources: RevenueSource[];
    by_day?: { date: string; amount: number }[];
}

interface RevenueChartProps {
    data?: RevenueBreakdownData;
    onRefresh?: () => void;
    onPeriodChange?: (period: string) => void;
    selectedPeriod?: string;
    isLoading?: boolean;
    className?: string;
}

const COLORS = ['#3b82f6', '#a855f7', '#ec4899', '#f97316', '#10b981'];

export default function RevenueChart({
    data,
    onRefresh,
    onPeriodChange,
    selectedPeriod = 'month',
    isLoading,
    className
}: RevenueChartProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
            notation: amount >= 10000 ? 'compact' : 'standard'
        }).format(amount);
    };

    return (
        <div className={cn("p-6 bg-slate-900/65 backdrop-blur-xl border border-slate-700/20 rounded-2xl", className)}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <DollarSign size={20} className="text-emerald-500" />
                    <h3 className="text-lg font-semibold text-slate-100">Revenue Breakdown</h3>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800/50 rounded-lg p-1">
                        {['week', 'month', 'year'].map((period) => (
                            <button
                                key={period}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    selectedPeriod === period
                                        ? "bg-blue-500/20 text-blue-500"
                                        : "text-slate-400 hover:text-slate-200"
                                )}
                                onClick={() => onPeriodChange?.(period)}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </button>
                        ))}
                    </div>
                    {onRefresh && (
                        <button
                            className="p-2 bg-slate-800/50 border border-slate-700/20 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Total */}
                <div className="text-center p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <span className="block text-xs text-slate-400 mb-2">Total Revenue</span>
                    <span className="block text-4xl font-bold text-emerald-500 tracking-tight">
                        {formatCurrency(data?.total || 0)}
                    </span>
                    <span className="block text-xs text-slate-500 mt-1">This {selectedPeriod}</span>
                </div>

                {/* Donut-style breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 items-center">
                    <div className="relative w-40 h-40 mx-auto">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                            {data?.sources.map((source, index) => {
                                const offset = data.sources
                                    .slice(0, index)
                                    .reduce((acc, s) => acc + s.percentage, 0);
                                const circumference = 2 * Math.PI * 35;
                                const strokeDasharray = (source.percentage / 100) * circumference;
                                const strokeDashoffset = -(offset / 100) * circumference;

                                return (
                                    <motion.circle
                                        key={source.source}
                                        cx="50"
                                        cy="50"
                                        r="35"
                                        fill="none"
                                        strokeWidth="12"
                                        stroke={COLORS[index % COLORS.length]}
                                        strokeLinecap="round"
                                        initial={{ strokeDasharray: 0 }}
                                        animate={{ strokeDasharray: `${strokeDasharray} ${circumference}` }}
                                        style={{ strokeDashoffset }}
                                        transition={{ duration: 0.8, delay: index * 0.1 }}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 bg-slate-900/90 rounded-full flex items-center justify-center">
                                <PieChart size={24} className="text-slate-500" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {data?.sources.map((source, index) => (
                            <motion.div
                                key={source.source}
                                className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-md"
                                        style={{ background: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="text-sm text-slate-200">{source.source}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold text-slate-200">
                                        {formatCurrency(source.amount)}
                                    </span>
                                    <span className="text-xs text-slate-500 w-10 text-right">
                                        {source.percentage}%
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
