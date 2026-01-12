'use client';

import { useState, useEffect } from 'react';
import { adminApi, FunnelStage } from '@/services/adminApi';
import FunnelChart from '@/components/admin/analytics/FunnelChart';
import { RefreshCw, Download, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FunnelsPage() {
    const [loading, setLoading] = useState(true);
    const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await adminApi.analytics.getFunnel();
            setFunnelData(response.funnel || []);
        } catch (err) {
            console.error('Failed to fetch funnel data:', err);
            setError('Failed to load funnel data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to get drop-off rate
    const getDropOff = (current: number, next: number) => {
        if (!current) return 0;
        return ((current - next) / current * 100).toFixed(1);
    }

    return (
        <div className="funnels-page">
            <div className="page-header">
                <div>
                    <h1>Conversion Funnels</h1>
                    <p>Analyze user conversion rates across key user journeys</p>
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

            <div className="funnel-layout">
                {/* Main Funnel Chart */}
                <div className="funnel-main">
                    {loading ? (
                        <div className="loading-state glass-panel">
                            <RefreshCw size={32} className="spinning" />
                            <p>Loading funnel data...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state glass-panel">
                            <p>{error}</p>
                            <button onClick={fetchData} className="retry-btn">Retry</button>
                        </div>
                    ) : (
                        <FunnelChart
                            data={funnelData}
                            isLoading={loading}
                        />
                    )}
                </div>

                {/* Analysis / Insights Side Panel */}
                <div className="funnel-insights">
                    <div className="glass-panel insights-card">
                        <h3>
                            <Info size={18} color="#3b82f6" />
                            Key Insights
                        </h3>
                        <div className="insights-list">
                            {funnelData.length >= 2 && (
                                <div className="insight-item">
                                    <span className="label">Largest Drop-off</span>
                                    {funnelData.map((stage, i) => {
                                        if (i === funnelData.length - 1) return null;
                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0] && (
                                            <p>
                                                Most users drop off between <strong>
                                                    {funnelData.map((stage, i) => {
                                                        if (i === funnelData.length - 1) return null;
                                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0]?.stage}
                                                </strong> and <strong>
                                                    {funnelData.map((stage, i) => {
                                                        if (i === funnelData.length - 1) return null;
                                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0]?.next}
                                                </strong> ({
                                                    funnelData.map((stage, i) => {
                                                        if (i === funnelData.length - 1) return null;
                                                        const drop = Number(getDropOff(stage.value, funnelData[i + 1].value));
                                                        return { stage: stage.stage, next: funnelData[i + 1].stage, drop };
                                                    }).filter(x => x).sort((a, b) => b!.drop - a!.drop)[0]?.drop
                                                }% Loss)
                                            </p>
                                        )}
                                </div>
                            )}

                            <div className="insight-item">
                                <span className="label">Overall Conversion</span>
                                <div className="big-stat">
                                    {funnelData.length > 0 ? funnelData[funnelData.length - 1].rate.toFixed(1) : 0}%
                                </div>
                                <p className="sub-text">From {funnelData[0]?.stage} to {funnelData[funnelData.length - 1]?.stage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .funnels-page {
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

                .funnel-layout {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 24px;
                }

                @media (max-width: 1024px) {
                    .funnel-layout {
                        grid-template-columns: 1fr;
                    }
                }

                .loading-state, .error-state {
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

                /* Insights */
                .insights-card {
                    padding: 24px;
                    border-radius: 20px;
                    height: 100%;
                }

                .insights-card h3 {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 18px;
                    font-weight: 600;
                    color: #f1f5f9;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
                }

                .insights-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .insight-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .insight-item .label {
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #94a3b8;
                    font-weight: 600;
                }

                .insight-item p {
                    font-size: 14px;
                    color: #cbd5e1;
                    line-height: 1.5;
                }

                .insight-item strong {
                    color: #f1f5f9;
                }

                .big-stat {
                    font-size: 42px;
                    font-weight: 700;
                    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .sub-text {
                    font-size: 13px;
                    color: #64748b;
                }
            `}</style>
        </div>
    );
}
