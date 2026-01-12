'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminApi, RetentionCohort } from '@/services/adminApi';
import RetentionHeatmap from '@/components/admin/analytics/RetentionHeatmap';
import { TrendingUp, TrendingDown, RefreshCw, Calendar, Download, Filter, HelpCircle } from 'lucide-react';

export default function RetentionPage() {
    const [loading, setLoading] = useState(true);
    const [cohorts, setCohorts] = useState<RetentionCohort[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.analytics.getRetention();
            setCohorts(response.cohorts || []);
        } catch (err) {
            console.error('Failed to fetch retention data:', err);
            setError('Failed to load retention data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const calculateAverageRetention = (day: 'd1' | 'd7' | 'd30') => {
        if (!cohorts.length) return 0;
        const sum = cohorts.reduce((acc, curr) => acc + (curr[day] || 0), 0);
        return (sum / cohorts.length).toFixed(1);
    };

    return (
        <div className="retention-page">
            <div className="page-header">
                <div>
                    <h1>Retention Analytics</h1>
                    <p>Track user retention cohorts and engagement over time</p>
                </div>
                <div className="header-controls">
                    <button className="btn-icon" onClick={fetchData} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    </button>
                    <button className="btn-primary">
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="metrics-grid">
                <div className="metric-card glass-panel">
                    <div className="metric-header">
                        <div className="metric-title">Day 1 Retention</div>
                        <HelpCircle size={16} className="info-icon" />
                    </div>
                    <div className="metric-value">{calculateAverageRetention('d1')}%</div>
                    <div className="metric-trend positive">
                        <TrendingUp size={16} />
                        <span>Avg last 30 days</span>
                    </div>
                </div>

                <div className="metric-card glass-panel">
                    <div className="metric-header">
                        <div className="metric-title">Day 7 Retention</div>
                        <HelpCircle size={16} className="info-icon" />
                    </div>
                    <div className="metric-value">{calculateAverageRetention('d7')}%</div>
                    <div className="metric-trend neutral">
                        <TrendingUp size={16} />
                        <span>Avg last 30 days</span>
                    </div>
                </div>

                <div className="metric-card glass-panel">
                    <div className="metric-header">
                        <div className="metric-title">Day 30 Retention</div>
                        <HelpCircle size={16} className="info-icon" />
                    </div>
                    <div className="metric-value">{calculateAverageRetention('d30')}%</div>
                    <div className="metric-trend negative">
                        <TrendingDown size={16} />
                        <span>Avg last 30 days</span>
                    </div>
                </div>
            </div>

            {/* Retention Heatmap */}
            <div className="heatmap-section">
                {loading ? (
                    <div className="loading-state glass-panel">
                        <RefreshCw size={32} className="spinning" />
                        <p>Loading retention data...</p>
                    </div>
                ) : error ? (
                    <div className="error-state glass-panel">
                        <p>{error}</p>
                        <button onClick={fetchData} className="retry-btn">Retry</button>
                    </div>
                ) : (
                    <RetentionHeatmap
                        data={cohorts}
                        isLoading={loading}
                        onRefresh={fetchData}
                    />
                )}
            </div>

            <style jsx>{`
                .retention-page {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .page-header h1 {
                    font-size: 24px;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 4px;
                }

                .page-header p {
                    color: #94a3b8;
                    font-size: 14px;
                }

                .header-controls {
                    display: flex;
                    gap: 12px;
                }

                .btn-icon {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-icon:hover {
                    background: rgba(59, 130, 246, 0.2);
                    color: #3b82f6;
                    border-color: #3b82f6;
                }

                .btn-primary {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 20px;
                    height: 40px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    font-weight: 500;
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .btn-primary:hover {
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    transform: translateY(-1px);
                }

                /* Metrics Grid */
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 24px;
                    margin-bottom: 32px;
                }

                .metric-card {
                    padding: 24px;
                    border-radius: 20px;
                }

                .metric-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .metric-title {
                    color: #94a3b8;
                    font-size: 14px;
                    font-weight: 500;
                }

                .info-icon {
                    color: #475569;
                    cursor: help;
                }

                .metric-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 12px;
                }

                .metric-trend {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                }

                .metric-trend.positive { color: #10b981; }
                .metric-trend.neutral { color: #f59e0b; }
                .metric-trend.negative { color: #ef4444; }

                /* Heatmap Section */
                .heatmap-section {
                    margin-bottom: 40px;
                }

                .loading-state, .error-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    border-radius: 20px;
                    text-align: center;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .glass-panel {
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                }
            `}</style>
        </div>
    );
}
