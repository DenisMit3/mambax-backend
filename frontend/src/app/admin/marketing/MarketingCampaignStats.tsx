'use client';

import { motion } from 'framer-motion';
import {
  Play,
  Send,
  Eye,
  MousePointer,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

/** Карточки статистики кампаний */
export default function MarketingCampaignStats() {
  const stats = [
    { label: 'Active Campaigns', value: 2, icon: <Play size={18} />, color: '#10b981' },
    { label: 'Total Sent', value: '88K', icon: <Send size={18} />, color: '#3b82f6' },
    { label: 'Avg Open Rate', value: '28.3%', icon: <Eye size={18} />, color: '#a855f7' },
    { label: 'Avg CTR', value: '7.8%', icon: <MousePointer size={18} />, color: '#ec4899' },
    { label: 'Conversions', value: '2.1K', icon: <CheckCircle size={18} />, color: '#f97316' },
    { label: 'Est. Revenue', value: '$45K', icon: <TrendingUp size={18} />, color: '#10b981' },
  ];

  return (
    <div className="campaign-stats">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
            {stat.icon}
          </div>
          <div className="stat-content">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        </motion.div>
      ))}

      <style jsx>{`
        .campaign-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1400px) {
          .campaign-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .campaign-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
        }
        
        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #f1f5f9;
        }
        
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
