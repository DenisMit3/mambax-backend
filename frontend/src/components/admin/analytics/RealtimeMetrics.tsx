'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, TrendingUp, TrendingDown, Zap, RefreshCw } from 'lucide-react';

interface RealtimeData {
    timestamp: string;
    active_now: number;
    dau: number;
    wau: number;
    mau: number;
    trend: {
        dau_change: number;
        wau_change: number;
        mau_change: number;
    };
}

interface RealtimeMetricsProps {
    data?: RealtimeData;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export default function RealtimeMetrics({ data, onRefresh, isLoading }: RealtimeMetricsProps) {
    const [pulse, setPulse] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setPulse(prev => !prev);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const metrics = [
        {
            label: 'Active Now',
            value: data?.active_now || 0,
            change: null,
            icon: <Zap size={20} />,
            color: '#10b981',
            isLive: true
        },
        {
            label: 'DAU',
            value: data?.dau || 0,
            change: data?.trend?.dau_change || 0,
            icon: <Users size={20} />,
            color: '#3b82f6'
        },
        {
            label: 'WAU',
            value: data?.wau || 0,
            change: data?.trend?.wau_change || 0,
            icon: <Activity size={20} />,
            color: '#a855f7'
        },
        {
            label: 'MAU',
            value: data?.mau || 0,
            change: data?.trend?.mau_change || 0,
            icon: <Users size={20} />,
            color: '#f97316'
        }
    ];

    return (
        <div className="realtime-container glass-panel">
            <div className="realtime-header">
                <div className="realtime-title">
                    <Activity size={20} style={{ color: '#10b981' }} />
                    <h3>Real-time Metrics</h3>
                    <div className={`live-indicator ${pulse ? 'pulse' : ''}`}>
                        <span className="live-dot" />
                        LIVE
                    </div>
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

            <div className="metrics-grid">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.label}
                        className="metric-card"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="metric-icon" style={{ background: `${metric.color}20`, color: metric.color }}>
                            {metric.icon}
                        </div>
                        <div className="metric-content">
                            <div className="metric-value">
                                {formatNumber(metric.value)}
                                {metric.isLive && (
                                    <span className={`live-badge ${pulse ? 'pulse' : ''}`} />
                                )}
                            </div>
                            <div className="metric-label">{metric.label}</div>
                        </div>
                        {metric.change !== null && (
                            <div className={`metric-change ${metric.change >= 0 ? 'positive' : 'negative'}`}>
                                {metric.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {Math.abs(metric.change)}%
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {data?.timestamp && (
                <div className="last-updated">
                    Last updated: {new Date(data.timestamp).toLocaleTimeString()}
                </div>
            )}

            <style jsx>{`
                .realtime-container {
                    padding: 24px;
                }

                .realtime-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .realtime-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .realtime-title h3 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #f1f5f9;
                }

                .live-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: rgba(16, 185, 129, 0.15);
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #10b981;
                    letter-spacing: 0.5px;
                }

                .live-dot {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    transition: opacity 0.3s;
                }

                .live-indicator.pulse .live-dot {
                    opacity: 0.5;
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

                .refresh-btn:hover {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                }

                @media (max-width: 1000px) {
                    .metrics-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                .metric-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 16px;
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    transition: all 0.2s;
                }

                .metric-card:hover {
                    border-color: rgba(148, 163, 184, 0.3);
                    transform: translateY(-2px);
                }

                .metric-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .metric-content {
                    flex: 1;
                }

                .metric-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #f1f5f9;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .live-badge {
                    width: 8px;
                    height: 8px;
                    background: #10b981;
                    border-radius: 50%;
                    animation: pulse-animation 2s infinite;
                }

                @keyframes pulse-animation {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }

                .metric-label {
                    font-size: 13px;
                    color: #94a3b8;
                    margin-top: 2px;
                }

                .metric-change {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .metric-change.positive {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                }

                .metric-change.negative {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }

                .last-updated {
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid rgba(148, 163, 184, 0.1);
                    font-size: 12px;
                    color: #64748b;
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
