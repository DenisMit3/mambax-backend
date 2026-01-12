'use client';

import { motion } from 'framer-motion';
import { DollarSign, PieChart, TrendingUp, RefreshCw } from 'lucide-react';

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
}

export default function RevenueChart({
    data,
    onRefresh,
    onPeriodChange,
    selectedPeriod = 'month',
    isLoading
}: RevenueChartProps) {
    const formatCurrency = (amount: number) => {
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
        return `$${amount.toFixed(0)}`;
    };

    const colors = ['#3b82f6', '#a855f7', '#ec4899', '#f97316', '#10b981'];

    return (
        <div className="revenue-container glass-panel">
            <div className="revenue-header">
                <div className="revenue-title">
                    <DollarSign size={20} style={{ color: '#10b981' }} />
                    <h3>Revenue Breakdown</h3>
                </div>
                <div className="header-controls">
                    <div className="period-selector">
                        {['week', 'month', 'year'].map((period) => (
                            <button
                                key={period}
                                className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                                onClick={() => onPeriodChange?.(period)}
                            >
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                            </button>
                        ))}
                    </div>
                    {onRefresh && (
                        <button
                            className="refresh-btn"
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                        </button>
                    )}
                </div>
            </div>

            <div className="revenue-content">
                {/* Total */}
                <div className="total-revenue">
                    <span className="total-label">Total Revenue</span>
                    <span className="total-value">{formatCurrency(data?.total || 0)}</span>
                    <span className="total-period">This {selectedPeriod}</span>
                </div>

                {/* Donut-style breakdown */}
                <div className="breakdown-section">
                    <div className="donut-container">
                        <svg viewBox="0 0 100 100" className="donut-chart">
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
                                        stroke={colors[index % colors.length]}
                                        strokeLinecap="round"
                                        initial={{ strokeDasharray: 0 }}
                                        animate={{ strokeDasharray: `${strokeDasharray} ${circumference}` }}
                                        style={{
                                            strokeDashoffset,
                                            transform: 'rotate(-90deg)',
                                            transformOrigin: '50% 50%'
                                        }}
                                        transition={{ duration: 0.8, delay: index * 0.1 }}
                                    />
                                );
                            })}
                        </svg>
                        <div className="donut-center">
                            <PieChart size={24} color="#64748b" />
                        </div>
                    </div>

                    <div className="sources-list">
                        {data?.sources.map((source, index) => (
                            <motion.div
                                key={source.source}
                                className="source-item"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="source-info">
                                    <div
                                        className="source-color"
                                        style={{ background: colors[index % colors.length] }}
                                    />
                                    <span className="source-name">{source.source}</span>
                                </div>
                                <div className="source-values">
                                    <span className="source-amount">{formatCurrency(source.amount)}</span>
                                    <span className="source-percentage">{source.percentage}%</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .revenue-container {
                    padding: 24px;
                }

                .revenue-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .revenue-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .revenue-title h3 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #f1f5f9;
                }

                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .period-selector {
                    display: flex;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 10px;
                    padding: 4px;
                }

                .period-btn {
                    padding: 6px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .period-btn:hover {
                    color: #f1f5f9;
                }

                .period-btn.active {
                    background: rgba(59, 130, 246, 0.3);
                    color: #3b82f6;
                }

                .refresh-btn {
                    padding: 8px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 8px;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .revenue-content {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .total-revenue {
                    text-align: center;
                    padding: 20px;
                    background: rgba(16, 185, 129, 0.1);
                    border-radius: 16px;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }

                .total-label {
                    display: block;
                    font-size: 12px;
                    color: #94a3b8;
                    margin-bottom: 8px;
                }

                .total-value {
                    display: block;
                    font-size: 42px;
                    font-weight: 700;
                    color: #10b981;
                }

                .total-period {
                    display: block;
                    font-size: 12px;
                    color: #64748b;
                    margin-top: 4px;
                }

                .breakdown-section {
                    display: grid;
                    grid-template-columns: 200px 1fr;
                    gap: 24px;
                    align-items: center;
                }

                @media (max-width: 600px) {
                    .breakdown-section {
                        grid-template-columns: 1fr;
                    }
                }

                .donut-container {
                    position: relative;
                    width: 160px;
                    height: 160px;
                    margin: 0 auto;
                }

                .donut-chart {
                    width: 100%;
                    height: 100%;
                }

                .donut-center {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 60px;
                    height: 60px;
                    background: rgba(15, 23, 42, 0.8);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sources-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .source-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 12px;
                }

                .source-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .source-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 4px;
                }

                .source-name {
                    font-size: 14px;
                    color: #f1f5f9;
                }

                .source-values {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .source-amount {
                    font-size: 14px;
                    font-weight: 600;
                    color: #f1f5f9;
                }

                .source-percentage {
                    font-size: 12px;
                    color: #64748b;
                    min-width: 40px;
                    text-align: right;
                }

                .glass-panel {
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
