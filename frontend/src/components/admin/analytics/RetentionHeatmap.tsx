'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface RetentionCohort {
    cohort: string;
    cohort_size?: number;
    d1: number | null;
    d3: number | null;
    d7: number | null;
    d14: number | null;
    d30: number | null;
}

interface RetentionHeatmapProps {
    data?: RetentionCohort[];
    onRefresh?: () => void;
    isLoading?: boolean;
}

export default function RetentionHeatmap({ data, onRefresh, isLoading }: RetentionHeatmapProps) {
    const getCellColor = (value: number | null) => {
        if (value === null) return 'rgba(30, 41, 59, 0.3)';
        if (value >= 40) return 'rgba(16, 185, 129, 0.8)';
        if (value >= 30) return 'rgba(16, 185, 129, 0.6)';
        if (value >= 20) return 'rgba(249, 115, 22, 0.6)';
        if (value >= 10) return 'rgba(249, 115, 22, 0.4)';
        return 'rgba(239, 68, 68, 0.4)';
    };

    const cohorts = data || [];

    return (
        <div className="retention-container glass-panel">
            <div className="retention-header">
                <div className="retention-title">
                    <Clock size={20} style={{ color: '#10b981' }} />
                    <h3>Retention Cohorts</h3>
                </div>
                <div className="header-actions">
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

            <div className="retention-table">
                <div className="retention-header-row">
                    <div className="retention-cell header">Cohort</div>
                    <div className="retention-cell header">Day 1</div>
                    <div className="retention-cell header">Day 3</div>
                    <div className="retention-cell header">Day 7</div>
                    <div className="retention-cell header">Day 14</div>
                    <div className="retention-cell header">Day 30</div>
                </div>

                {cohorts.map((row, index) => (
                    <motion.div
                        key={row.cohort}
                        className="retention-row"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div className="retention-cell cohort">
                            <span>{row.cohort}</span>
                            {row.cohort_size && (
                                <span className="cohort-size">({row.cohort_size.toLocaleString()})</span>
                            )}
                        </div>
                        {['d1', 'd3', 'd7', 'd14', 'd30'].map((day) => {
                            const value = row[day as keyof RetentionCohort] as number | null;
                            return (
                                <div
                                    key={day}
                                    className="retention-cell value"
                                    style={{ background: getCellColor(value) }}
                                >
                                    {value !== null ? `${value}%` : '-'}
                                </div>
                            );
                        })}
                    </motion.div>
                ))}
            </div>

            <div className="retention-legend">
                <span className="legend-title">Retention Rate:</span>
                <div className="legend-items">
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: 'rgba(16, 185, 129, 0.8)' }} />
                        <span>&gt;40%</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: 'rgba(249, 115, 22, 0.6)' }} />
                        <span>20-40%</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ background: 'rgba(239, 68, 68, 0.4)' }} />
                        <span>&lt;20%</span>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .retention-container {
                    padding: 24px;
                }

                .retention-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .retention-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .retention-title h3 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #f1f5f9;
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

                .refresh-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .retention-table {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .retention-header-row,
                .retention-row {
                    display: grid;
                    grid-template-columns: 120px repeat(5, 1fr);
                    gap: 4px;
                }

                .retention-cell {
                    padding: 12px 16px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 13px;
                }

                .retention-cell.header {
                    background: rgba(30, 41, 59, 0.5);
                    color: #94a3b8;
                    font-weight: 600;
                }

                .retention-cell.cohort {
                    background: rgba(30, 41, 59, 0.5);
                    color: #f1f5f9;
                    text-align: left;
                    font-weight: 500;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .cohort-size {
                    font-size: 11px;
                    color: #64748b;
                }

                .retention-cell.value {
                    color: white;
                    font-weight: 600;
                    transition: all 0.2s;
                    cursor: default;
                }

                .retention-cell.value:hover {
                    transform: scale(1.05);
                }

                .retention-legend {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(148, 163, 184, 0.1);
                }

                .legend-title {
                    font-size: 12px;
                    color: #64748b;
                }

                .legend-items {
                    display: flex;
                    gap: 16px;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: #94a3b8;
                }

                .legend-color {
                    width: 16px;
                    height: 16px;
                    border-radius: 4px;
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
