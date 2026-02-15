'use client';

import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { FunnelStage } from '@/services/admin';

interface FunnelChartProps {
    data: FunnelStage[];
    isLoading?: boolean;
}

export default function FunnelChart({ data, isLoading }: FunnelChartProps) {
    if (isLoading) {
        return (
            <div className="funnel-container glass-panel loading">
                <div className="funnel-header">
                    <div className="funnel-title">
                        <Target size={20} style={{ color: '#a855f7' }} />
                        <h3>Conversion Funnel</h3>
                    </div>
                </div>
                <div className="loading-placeholder">Loading funnel data...</div>
                <style jsx>{`
                .funnel-container { padding: 24px; min-height: 300px; }
                .funnel-header { display: flex; align-items: center; margin-bottom: 24px; }
                .funnel-title { display: flex; align-items: center; gap: 12px; }
                .funnel-title h3 { font-size: 18px; font-weight: 600; color: #f1f5f9; }
                .loading-placeholder { 
                    height: 200px; display: flex; align-items: center; justify-content: center; 
                    color: #64748b; font-size: 14px;
                }
                .glass-panel {
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 20px;
                }
              `}</style>
            </div>
        )
    }

    return (
        <div className="funnel-container glass-panel">
            <div className="funnel-header">
                <div className="funnel-title">
                    <Target size={20} style={{ color: '#a855f7' }} />
                    <h3>Conversion Funnel</h3>
                </div>
            </div>

            <div className="funnel-chart">
                {data.map((item, index) => {
                    // Calculate width relative to the first item (100%) or previous item
                    // For a visual funnel, usually top is 100% and it shrinks. 
                    // Simple visual: 100% - (index * step)
                    const width = 100 - (index * 10);
                    const color = `hsl(${260 - index * 20}, 80%, 60%)`;

                    return (
                        <motion.div
                            key={item.stage}
                            className="funnel-stage"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="funnel-bar-container">
                                <motion.div
                                    className="funnel-bar"
                                    style={{
                                        width: `${width}%`,
                                        background: `linear-gradient(90deg, ${color}, ${color}dd)`
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <span className="funnel-value">{item.value.toLocaleString()}</span>
                                </motion.div>
                            </div>
                            <div className="funnel-info">
                                <span className="funnel-stage-name">{item.stage}</span>
                                <div className="funnel-metrics">
                                    <span className="funnel-rate">{item.rate.toFixed(1)}% conv.</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <style jsx>{`
        .funnel-container {
          padding: 24px;
        }
        
        .funnel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .funnel-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .funnel-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .funnel-chart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .funnel-stage {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .funnel-bar-container {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        
        .funnel-bar {
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .funnel-bar:hover {
          box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
          transform: translateY(-2px);
        }
        
        .funnel-value {
          font-size: 15px;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .funnel-info {
          display: flex;
          justify-content: space-between;
          padding: 0 12px;
          max-width: 80%;
          margin: 0 auto;
          width: 100%;
        }
        
        .funnel-stage-name {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
        }
        
        .funnel-rate {
          font-size: 13px;
          font-weight: 600;
          color: #10b981;
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
