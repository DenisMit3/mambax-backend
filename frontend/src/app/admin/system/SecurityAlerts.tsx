'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  AlertOctagon,
  Loader2,
} from 'lucide-react';
import { httpClient } from '@/lib/http-client';

interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  user_id: string | null;
  created_at: string;
}

// Цвета для типов алертов
const alertColors: Record<string, { bg: string; color: string }> = {
  warning: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  success: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  high: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  medium: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  fraud: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  ban: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  spike: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
};

function getAlertStyle(alert: SecurityAlert) {
  return alertColors[alert.severity] || alertColors[alert.type] || alertColors.info;
}

function getAlertIcon(alert: SecurityAlert) {
  if (alert.severity === 'high' || alert.type === 'fraud') return <AlertOctagon size={14} />;
  if (alert.severity === 'medium' || alert.type === 'spike') return <AlertTriangle size={14} />;
  if (alert.type === 'ban') return <Shield size={14} />;
  return <CheckCircle size={14} />;
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} дн назад`;
}

export default function SecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    httpClient.get<{ alerts: SecurityAlert[]; total: number }>('/admin/security/alerts')
      .then(data => setAlerts(data.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="security-alerts glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Shield size={20} style={{ color: '#f97316' }} />
          <h3>Security Alerts</h3>
        </div>
      </div>

      <div className="alerts-list">
        {loading && (
          <div className="alert-empty">
            <Loader2 size={20} className="animate-spin" style={{ color: '#64748b' }} />
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="alert-empty">
            <CheckCircle size={20} style={{ color: '#10b981' }} />
            <span>Нет активных алертов</span>
          </div>
        )}

        {!loading && alerts.map((alert) => (
          <motion.div
            key={alert.id}
            className="alert-item"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div
              className="alert-icon"
              style={getAlertStyle(alert)}
            >
              {getAlertIcon(alert)}
            </div>
            <div className="alert-content">
              <span className="alert-message">{alert.message}</span>
              <span className="alert-time">{formatTime(alert.created_at)}</span>
            </div>
            <ChevronRight size={16} className="alert-arrow" />
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .security-alerts {
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
        
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .alert-item:hover {
          background: rgba(30, 41, 59, 0.6);
        }
        
        .alert-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .alert-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .alert-message {
          font-size: 13px;
          color: #f1f5f9;
          line-height: 1.4;
        }
        
        .alert-time {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
        
        .alert-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 24px;
          color: #64748b;
          font-size: 13px;
        }
        
        :global(.alert-arrow) {
          color: #64748b;
          flex-shrink: 0;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
