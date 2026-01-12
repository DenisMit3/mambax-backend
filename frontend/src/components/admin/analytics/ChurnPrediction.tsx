'use client';

import { motion } from 'framer-motion';
import { Brain, AlertTriangle, TrendingDown, Lightbulb, RefreshCw } from 'lucide-react';

interface ChurnPredictionData {
    prediction_date: string;
    model_version: string;
    confidence: number;
    at_risk_users: number;
    high_risk_count: number;
    medium_risk_count: number;
    predicted_churn_30d: number;
    top_churn_factors: {
        factor: string;
        impact: number;
    }[];
    recommendations: string[];
}

interface ChurnPredictionProps {
    data?: ChurnPredictionData;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export default function ChurnPrediction({ data, onRefresh, isLoading }: ChurnPredictionProps) {
    if (!data) {
        return (
            <div className="churn-container glass-panel">
                <div className="loading-state">Loading AI predictions...</div>
            </div>
        );
    }

    return (
        <div className="churn-container glass-panel">
            <div className="churn-header">
                <div className="churn-title">
                    <Brain size={20} style={{ color: '#a855f7' }} />
                    <h3>AI Churn Prediction</h3>
                    <span className="model-badge">Model {data.model_version}</span>
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

            <div className="churn-grid">
                {/* Risk Summary */}
                <div className="risk-summary">
                    <div className="risk-card high">
                        <AlertTriangle size={24} />
                        <div className="risk-content">
                            <span className="risk-value">{data.high_risk_count.toLocaleString()}</span>
                            <span className="risk-label">High Risk</span>
                        </div>
                    </div>
                    <div className="risk-card medium">
                        <TrendingDown size={24} />
                        <div className="risk-content">
                            <span className="risk-value">{data.medium_risk_count.toLocaleString()}</span>
                            <span className="risk-label">Medium Risk</span>
                        </div>
                    </div>
                    <div className="churn-forecast">
                        <span className="forecast-label">Predicted 30-Day Churn</span>
                        <span className="forecast-value">{data.predicted_churn_30d}%</span>
                        <div className="confidence">
                            {Math.round(data.confidence * 100)}% confidence
                        </div>
                    </div>
                </div>

                {/* Churn Factors */}
                <div className="factors-section">
                    <h4>Top Churn Factors</h4>
                    <div className="factors-list">
                        {data.top_churn_factors.map((factor, index) => (
                            <motion.div
                                key={factor.factor}
                                className="factor-item"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <span className="factor-name">{factor.factor}</span>
                                <div className="factor-bar-container">
                                    <motion.div
                                        className="factor-bar"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${factor.impact}%` }}
                                        transition={{ delay: index * 0.1, duration: 0.5 }}
                                    />
                                </div>
                                <span className="factor-value">{factor.impact}%</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Recommendations */}
                <div className="recommendations-section">
                    <h4>
                        <Lightbulb size={16} />
                        AI Recommendations
                    </h4>
                    <ul className="recommendations-list">
                        {data.recommendations.map((rec, index) => (
                            <motion.li
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                            >
                                {rec}
                            </motion.li>
                        ))}
                    </ul>
                </div>
            </div>

            <style jsx>{`
                .churn-container {
                    padding: 24px;
                }

                .churn-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .churn-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .churn-title h3 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #f1f5f9;
                }

                .model-badge {
                    padding: 4px 10px;
                    background: rgba(168, 85, 247, 0.15);
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #a855f7;
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

                .churn-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .risk-summary {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 16px;
                }

                @media (max-width: 800px) {
                    .risk-summary {
                        grid-template-columns: 1fr;
                    }
                }

                .risk-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    border-radius: 16px;
                }

                .risk-card.high {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #ef4444;
                }

                .risk-card.medium {
                    background: rgba(249, 115, 22, 0.15);
                    border: 1px solid rgba(249, 115, 22, 0.3);
                    color: #f97316;
                }

                .risk-content {
                    display: flex;
                    flex-direction: column;
                }

                .risk-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #f1f5f9;
                }

                .risk-label {
                    font-size: 13px;
                    opacity: 0.8;
                }

                .churn-forecast {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 16px;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                }

                .forecast-label {
                    font-size: 12px;
                    color: #94a3b8;
                    margin-bottom: 8px;
                }

                .forecast-value {
                    font-size: 36px;
                    font-weight: 700;
                    color: #f97316;
                }

                .confidence {
                    font-size: 11px;
                    color: #64748b;
                    margin-top: 4px;
                }

                .factors-section h4,
                .recommendations-section h4 {
                    font-size: 14px;
                    font-weight: 600;
                    color: #94a3b8;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .factors-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .factor-item {
                    display: grid;
                    grid-template-columns: 180px 1fr 50px;
                    align-items: center;
                    gap: 16px;
                }

                .factor-name {
                    font-size: 13px;
                    color: #f1f5f9;
                }

                .factor-bar-container {
                    height: 8px;
                    background: rgba(30, 41, 59, 0.8);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .factor-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #ef4444, #f97316);
                    border-radius: 4px;
                }

                .factor-value {
                    font-size: 13px;
                    font-weight: 600;
                    color: #f97316;
                    text-align: right;
                }

                .recommendations-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .recommendations-list li {
                    padding: 12px 16px;
                    background: rgba(16, 185, 129, 0.1);
                    border-left: 3px solid #10b981;
                    border-radius: 0 8px 8px 0;
                    margin-bottom: 8px;
                    font-size: 13px;
                    color: #f1f5f9;
                }

                .loading-state {
                    padding: 40px;
                    text-align: center;
                    color: #64748b;
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
