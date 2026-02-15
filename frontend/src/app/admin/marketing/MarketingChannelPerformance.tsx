'use client';

import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { adminApi } from '@/services/admin';

/** Интерфейс канала привлечения */
export interface Channel {
  name: string;
  users: number;
  color: string;
  cac: number;
}

/** Панель каналов привлечения пользователей */
export default function MarketingChannelPerformance() {
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    adminApi.marketing.getChannels()
      .then((data: { channels?: Channel[] }) => setChannels(data.channels || []))
      .catch(console.error);
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
