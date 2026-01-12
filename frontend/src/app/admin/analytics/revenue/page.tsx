'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/services/adminApi';
import RevenueChart from '@/components/admin/analytics/RevenueChart';
import { RefreshCw, Download, DollarSign, TrendingUp, CreditCard } from 'lucide-react';

export default function RevenueAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<any>(null);
    const [period, setPeriod] = useState('month');
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.analytics.getRevenueBreakdown(period);
            setRevenueData(response);
        } catch (err) {
            console.error('Failed to fetch revenue data:', err);
            setError('Failed to load revenue data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    return (
        <div className="revenue-page">
            <div className="page-header">
                <div>
                    <h1>Revenue Analytics</h1>
                    <p>Track financial performance and income sources</p>
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

            <div className="revenue-layout">
                {/* Main Revenue Chart */}
                <div className="revenue-main">
                    {error ? (
                        <div className="error-state glass-panel">
                            <p>{error}</p>
                            <button onClick={fetchData} className="retry-btn">Retry</button>
                        </div>
                    ) : (
                        <RevenueChart
                            data={revenueData}
                            isLoading={loading}
                            selectedPeriod={period}
                            onPeriodChange={setPeriod}
                            onRefresh={fetchData}
                        />
                    )}
                </div>

                {/* Additional Stats */}
                <div className="revenue-side">
                    <div className="stat-card glass-panel">
                        <div className="stat-icon p-blue">
                            <CreditCard size={20} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Active Subscriptions</span>
                            <span className="stat-value">
                                {loading ? '...' : revenueData?.sources.find((s: any) => s.source === 'Subscriptions')?.amount > 0 ? 'Active' : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="stat-card glass-panel">
                        <div className="stat-icon p-green">
                            <TrendingUp size={20} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Growth (MoM)</span>
                            <span className="stat-value positive">+12.5%</span>
                        </div>
                    </div>

                    <div className="stat-card glass-panel">
                        <div className="stat-icon p-purple">
                            <DollarSign size={20} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">Avg. Revenue Per User</span>
                            <span className="stat-value">$4.20</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .revenue-page {
                    max-width: 1400px;
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

                .revenue-layout {
                    display: grid;
                    grid-template-columns: 3fr 1fr;
                    gap: 24px;
                }

                @media (max-width: 1024px) {
                    .revenue-layout {
                        grid-template-columns: 1fr;
                    }
                }

                .error-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    border-radius: 20px;
                    text-align: center;
                    min-height: 400px;
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

                /* Side Stats */
                .revenue-side {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .stat-card {
                    padding: 20px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .p-blue { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
                .p-green { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .p-purple { background: rgba(168, 85, 247, 0.2); color: #a855f7; }

                .stat-info {
                    display: flex;
                    flex-direction: column;
                }

                .stat-label {
                    font-size: 12px;
                    color: #94a3b8;
                    margin-bottom: 4px;
                }

                .stat-value {
                    font-size: 18px;
                    font-weight: 700;
                    color: #fff;
                }

                .stat-value.positive { color: #10b981; }
            `}</style>
        </div>
    );
}
