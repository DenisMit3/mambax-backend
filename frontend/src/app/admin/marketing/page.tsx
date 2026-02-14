'use client';

import {
  Megaphone,
  Gift,
  BarChart3,
  Plus,
} from 'lucide-react';

import MarketingCampaignStats from './MarketingCampaignStats';
import MarketingCampaignsTable from './MarketingCampaignsTable';
import MarketingReferralProgram from './MarketingReferralProgram';
import MarketingChannelPerformance from './MarketingChannelPerformance';

export default function MarketingPage() {
  return (
    <div className="marketing-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Marketing & Growth</h1>
          <p>Manage campaigns and track acquisition channels</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">
            <BarChart3 size={16} />
            Analytics
          </button>
          <button className="btn-primary">
            <Plus size={16} />
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <MarketingCampaignStats />

      {/* Quick Navigation */}
      <div className="quick-nav">
        <a href="/admin/marketing/campaigns" className="nav-card">
          <Megaphone size={24} />
          <span>Campaigns</span>
          <span className="nav-desc">Manage all campaigns</span>
        </a>
        <a href="/admin/marketing/referrals" className="nav-card">
          <Gift size={24} />
          <span>Referral Program</span>
          <span className="nav-desc">Track viral growth</span>
        </a>
      </div>

      {/* Campaigns Table */}
      <MarketingCampaignsTable />

      {/* Bottom Grid */}
      <div className="bottom-grid">
        <MarketingReferralProgram />
        <MarketingChannelPerformance />
      </div>

      <style jsx>{`
        .marketing-page {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        
        .page-header p {
          font-size: 15px;
          color: #94a3b8;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        .btn-secondary,
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #f1f5f9;
        }
        
        .btn-secondary:hover {
          background: rgba(30, 41, 59, 0.8);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          border: none;
          color: white;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
        }
        
        .bottom-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        
        @media (max-width: 1000px) {
          .bottom-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .quick-nav {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .nav-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        
        .nav-card:hover {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.4);
          color: #a855f7;
          transform: translateY(-4px);
        }
        
        .nav-card span:first-of-type {
          font-size: 14px;
          font-weight: 600;
        }
        
        .nav-desc {
          font-size: 12px;
          color: #64748b;
        }
        
        :global(.glass-panel) {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
