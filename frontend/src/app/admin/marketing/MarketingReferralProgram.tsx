'use client';

import { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { adminApi } from '@/services/admin';

/** Интерфейс реферера */
export interface Referrer {
  name: string;
  referrals: number;
  earnings: number;
}

/** Статистика реферальной программы */
export interface ReferralStats {
  totalReferrals?: number;
  activeReferrers?: number;
  conversionRate?: number;
  totalEarnings?: number;
  successfulConversions?: number;
  rewardsPaid?: number;
  topReferrers?: Referrer[];
}

/** Панель реферальной программы */
export default function MarketingReferralProgram() {
  const [stats, setStats] = useState<ReferralStats | null>(null);

  useEffect(() => {
    // Проверяем наличие метода getReferrals
    if (adminApi.marketing.getReferrals) {
      adminApi.marketing.getReferrals()
        .then((data: ReferralStats) => setStats(data))
        .catch(console.error);
    }
  }, []);

  if (!stats) return <div className="glass-panel p-6">Loading referrals...</div>;

  return (
    <div className="referral-panel glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Gift size={20} style={{ color: '#ec4899' }} />
          <h3>Referral Program</h3>
        </div>
      </div>

      <div className="referral-stats">
        <div className="ref-stat">
          <span className="ref-value">{stats.totalReferrals?.toLocaleString() || 0}</span>
          <span className="ref-label">Total Referrals</span>
        </div>
        <div className="ref-stat">
          <span className="ref-value">{stats.successfulConversions?.toLocaleString() || 0}</span>
          <span className="ref-label">Conversions</span>
        </div>
        <div className="ref-stat">
          <span className="ref-value">${stats.rewardsPaid?.toLocaleString() || 0}</span>
          <span className="ref-label">Rewards Paid</span>
        </div>
      </div>

      <div className="top-referrers">
        <h4>Top Referrers</h4>
        <div className="referrers-list">
          {stats.topReferrers?.map((referrer: Referrer, index: number) => (
            <div key={referrer.name} className="referrer-item">
              <span className="rank">#{index + 1}</span>
              <div className="referrer-info">
                <span className="referrer-name">{referrer.name}</span>
                <span className="referrer-refs">{referrer.referrals} referrals</span>
              </div>
              <span className="referrer-earnings">${referrer.earnings}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .referral-panel {
          padding: 24px;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .panel-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .panel-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .referral-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .ref-stat {
          text-align: center;
          padding: 16px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
        }
        
        .ref-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .ref-label {
          font-size: 12px;
          color: #64748b;
        }
        
        .top-referrers h4 {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 12px;
        }
        
        .referrers-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .referrer-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 10px;
        }
        
        .rank {
          font-size: 12px;
          font-weight: 600;
          color: #a855f7;
          min-width: 24px;
        }
        
        .referrer-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .referrer-name {
          font-size: 14px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .referrer-refs {
          font-size: 12px;
          color: #64748b;
        }
        
        .referrer-earnings {
          font-size: 14px;
          font-weight: 600;
          color: #10b981;
        }
      `}</style>
    </div>
  );
}
