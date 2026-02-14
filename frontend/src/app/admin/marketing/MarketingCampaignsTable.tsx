'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Mail,
  Bell,
  Plus,
  Play,
  Pause,
  Edit,
  Eye,
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';

/** Интерфейс кампании */
export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  sent: number;
  opened: number;
  clicked: number;
  conversions: number;
  converted: number;
  startDate: string;
  endDate: string;
}

/** Таблица маркетинговых кампаний */
export default function MarketingCampaignsTable() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    adminApi.marketing.getCampaigns()
      .then((data: { campaigns?: Campaign[] }) => setCampaigns(data.campaigns || []))
      .catch(console.error);
  }, []);

  const statusColors: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    scheduled: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    completed: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
    paused: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  };

  const typeIcons: Record<string, React.ReactNode> = {
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
                    {typeIcons[campaign.type]}
                    <span>{campaign.type}</span>
                  </div>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={statusColors[campaign.status]}
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
