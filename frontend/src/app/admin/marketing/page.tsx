'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Mail,
  Bell,
  Users,
  TrendingUp,
  Target,
  Gift,
  Share2,
  BarChart3,
  Calendar,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  Eye,
  Send,
  ArrowUpRight,
  CheckCircle,
  Clock,
  MousePointer,
} from 'lucide-react';

import { adminApi } from '@/services/adminApi';
import { useEffect } from 'react';

// Mock data removed


function CampaignStats() {
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

function CampaignsTable() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    adminApi.marketing.getCampaigns().then((data: any) => setCampaigns(data.campaigns || [])).catch(console.error);
  }, []);

  const statusColors = {
    active: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    scheduled: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    completed: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
    paused: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  };

  const typeIcons = {
    push: <Bell size={16} />,
    email: <Mail size={16} />,
    sms: <Megaphone size={16} />,
  };

  return (
    <div className="campaigns-table glass-panel">
      <div className="table-header">
        <div className="table-title">
          <Megaphone size={20} style={{ color: '#a855f7' }} />
          <h3>Campaigns</h3>
        </div>
        <button className="add-campaign">
          <Plus size={16} /> New Campaign
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Type</th>
            <th>Status</th>
            <th>Sent</th>
            <th>Open Rate</th>
            <th>CTR</th>
            <th>Conversions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const openRate = campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0;
            const ctr = campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : 0;

            return (
              <motion.tr
                key={campaign.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <td>
                  <div className="campaign-name">
                    <span className="name">{campaign.name}</span>
                    <span className="dates">{campaign.startDate} - {campaign.endDate}</span>
                  </div>
                </td>
                <td>
                  <div className="campaign-type">
                    {typeIcons[campaign.type as keyof typeof typeIcons]}
                    <span>{campaign.type}</span>
                  </div>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={statusColors[campaign.status as keyof typeof statusColors]}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td>{campaign.sent.toLocaleString()}</td>
                <td>{openRate}%</td>
                <td>{ctr}%</td>
                <td>{campaign.converted.toLocaleString()}</td>
                <td>
                  <div className="table-actions">
                    <button><Eye size={14} /></button>
                    <button><Edit size={14} /></button>
                    {campaign.status === 'active' ? (
                      <button><Pause size={14} /></button>
                    ) : (
                      <button><Play size={14} /></button>
                    )}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      <style jsx>{`
        .campaigns-table {
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .table-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .table-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .add-campaign {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .add-campaign:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .table th,
        .table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .table th {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .table td {
          color: #f1f5f9;
          font-size: 14px;
        }
        
        .table tr:hover {
          background: rgba(30, 41, 59, 0.3);
        }
        
        .campaign-name {
          display: flex;
          flex-direction: column;
        }
        
        .campaign-name .name {
          font-weight: 500;
        }
        
        .campaign-name .dates {
          font-size: 12px;
          color: #64748b;
        }
        
        .campaign-type {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          text-transform: capitalize;
        }
        
        .status-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: capitalize;
        }
        
        .table-actions {
          display: flex;
          gap: 6px;
        }
        
        .table-actions button {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .table-actions button:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
      `}</style>
    </div>
  );
}

function ReferralProgram() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Check if getReferrals exists
    if (adminApi.marketing.getReferrals) {
      adminApi.marketing.getReferrals().then((data: any) => setStats(data)).catch(console.error);
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
          {stats.topReferrers?.map((referrer: any, index: number) => (
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

function ChannelPerformance() {
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    adminApi.marketing.getChannels().then((data: any) => setChannels(data.channels || [])).catch(console.error);
  }, []);

  const totalUsers = channels.reduce((acc, c) => acc + c.users, 0);

  return (
    <div className="channel-panel glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Share2 size={20} style={{ color: '#3b82f6' }} />
          <h3>Acquisition Channels</h3>
        </div>
      </div>

      <div className="channels-list">
        {channels.map((channel) => {
          const percentage = totalUsers > 0 ? ((channel.users / totalUsers) * 100).toFixed(1) : 0;

          return (
            <div key={channel.name} className="channel-item">
              <div className="channel-info">
                <div className="channel-color" style={{ background: channel.color }} />
                <div className="channel-details">
                  <span className="channel-name">{channel.name}</span>
                  <span className="channel-users">{channel.users.toLocaleString()} users</span>
                </div>
              </div>
              <div className="channel-bar">
                <div
                  className="channel-fill"
                  style={{
                    width: `${percentage}%`,
                    background: channel.color
                  }}
                />
              </div>
              <div className="channel-stats">
                <span className="channel-percentage">{percentage}%</span>
                <span className="channel-cac">
                  {channel.cac > 0 ? `CAC: $${channel.cac}` : 'Free'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .channel-panel {
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
        
        .channels-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .channel-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .channel-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .channel-color {
          width: 10px;
          height: 10px;
          border-radius: 3px;
        }
        
        .channel-details {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .channel-name {
          font-size: 14px;
          font-weight: 500;
          color: #f1f5f9;
        }
        
        .channel-users {
          font-size: 12px;
          color: #64748b;
        }
        
        .channel-bar {
          height: 8px;
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .channel-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .channel-stats {
          display: flex;
          justify-content: space-between;
        }
        
        .channel-percentage {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .channel-cac {
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}

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
      <CampaignStats />

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
      <CampaignsTable />

      {/* Bottom Grid */}
      <div className="bottom-grid">
        <ReferralProgram />
        <ChannelPerformance />
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
