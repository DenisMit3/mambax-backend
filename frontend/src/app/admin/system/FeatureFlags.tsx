'use client';

import { useState, useEffect } from 'react';
import { Key, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminApi } from '@/services/admin';

// Интерфейс флага функциональности
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number;
}

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  useEffect(() => {
    adminApi.system.getFeatureFlags().then(data => setFlags(data.flags)).catch(console.error);
  }, []);

  // Переключение флага с оптимистичным обновлением
  const toggleFlag = (id: string, currentEnabled: boolean) => {
    setFlags(prev => prev.map(flag =>
      flag.id === id ? { ...flag, enabled: !flag.enabled } : flag
    ));

    adminApi.system.updateFeatureFlag(id, !currentEnabled).then(() => {
      // Подтверждение успешного обновления
    }).catch(err => {
      console.error("Ошибка обновления флага", err);
      // Откат при ошибке
      setFlags(prev => prev.map(flag =>
        flag.id === id ? { ...flag, enabled: currentEnabled } : flag
      ));
    });
  };

  return (
    <div className="feature-flags glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Key size={20} style={{ color: '#a855f7' }} />
          <h3>Feature Flags</h3>
        </div>
      </div>

      <div className="flags-list">
        {flags.map((flag) => (
          <div key={flag.id} className="flag-item">
            <div className="flag-info">
              <span className="flag-name">{flag.name}</span>
              <span className="flag-description">{flag.description}</span>
            </div>
            <div className="flag-rollout">
              <span className="rollout-value">{flag.rollout}%</span>
              <span className="rollout-label">rollout</span>
            </div>
            <button
              className={`toggle-btn ${flag.enabled ? 'enabled' : ''}`}
              onClick={() => toggleFlag(flag.id, flag.enabled)}
            >
              {flag.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .feature-flags {
          padding: 24px;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
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
        
        .flags-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .flag-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .flag-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .flag-name {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .flag-description {
          font-size: 12px;
          color: #64748b;
        }
        
        .flag-rollout {
          text-align: center;
          min-width: 60px;
        }
        
        .rollout-value {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #a855f7;
        }
        
        .rollout-label {
          font-size: 10px;
          color: #64748b;
        }
        
        .toggle-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }
        
        .toggle-btn.enabled {
          color: #10b981;
        }
        
        .toggle-btn:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
