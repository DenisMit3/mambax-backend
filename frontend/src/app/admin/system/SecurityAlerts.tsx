'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

// Статические данные алертов безопасности
const securityAlerts = [
  { id: 1, type: 'warning', message: 'High number of failed login attempts from IP 192.168.1.100', time: '5 min ago' },
  { id: 2, type: 'info', message: 'New admin user created: moderator2@mambax.com', time: '1 hour ago' },
  { id: 3, type: 'success', message: 'SSL certificate renewed successfully', time: '6 hours ago' },
];

// Цвета для типов алертов
const alertColors: Record<string, { bg: string; color: string }> = {
  warning: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  success: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
};

export default function SecurityAlerts() {
  return (
    <div className="security-alerts glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Shield size={20} style={{ color: '#f97316' }} />
          <h3>Security Alerts</h3>
        </div>
      </div>

      <div className="alerts-list">
        {securityAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            className="alert-item"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div
              className="alert-icon"
              style={alertColors[alert.type]}
            >
              {alert.type === 'warning' && <AlertTriangle size={14} />}
              {alert.type === 'info' && <Shield size={14} />}
              {alert.type === 'success' && <CheckCircle size={14} />}
            </div>
            <div className="alert-content">
              <span className="alert-message">{alert.message}</span>
              <span className="alert-time">{alert.time}</span>
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
        
        :global(.alert-arrow) {
          color: #64748b;
          flex-shrink: 0;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
