'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Server,
  Database,
  Cpu,
  HardDrive,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Key,
  Users,
  FileText,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
  Zap,
  Globe,
  Lock,
} from 'lucide-react';

import { adminApi } from '@/services/adminApi';
import { useEffect } from 'react';

// Mock removed


// Mock logs removed

// Mock flags removed

const securityAlerts = [
  { id: 1, type: 'warning', message: 'High number of failed login attempts from IP 192.168.1.100', time: '5 min ago' },
  { id: 2, type: 'info', message: 'New admin user created: moderator2@mambax.com', time: '1 hour ago' },
  { id: 3, type: 'success', message: 'SSL certificate renewed successfully', time: '6 hours ago' },
];

function SystemHealth() {
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    adminApi.system.getHealth().then(data => {
      setServices(data.services.map(s => ({
        ...s,
        icon: getServiceIcon(s.name)
      })));
    }).catch(err => console.error(err));
  }, []);

  const getServiceIcon = (name: string) => {
    if (name.includes('API')) return <Server size={18} />;
    if (name.includes('Database')) return <Database size={18} />;
    if (name.includes('Cache') || name.includes('Redis')) return <Zap size={18} />;
    if (name.includes('Socket')) return <Activity size={18} />;
    if (name.includes('Auth')) return <Lock size={18} />;
    return <Globe size={18} />;
  }

  return (
    <div className="system-health glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Activity size={20} style={{ color: '#10b981' }} />
          <h3>System Health</h3>
        </div>
        <button className="refresh-btn" onClick={() => adminApi.system.getHealth().then(d => setServices(d.services.map(s => ({ ...s, icon: getServiceIcon(s.name) }))))}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="services-grid">
        {services.map((service, index) => (
          <motion.div
            key={service.name}
            className={`service-card ${service.status}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="service-header">
              <div className="service-icon">
                {service.icon}
              </div>
              <div className={`status-indicator ${service.status}`}>
                {service.status === 'healthy' && <CheckCircle size={14} />}
                {service.status === 'warning' && <AlertTriangle size={14} />}
                {service.status === 'degraded' && <AlertTriangle size={14} />}
                {service.status === 'down' && <AlertTriangle size={14} color="red" />}
              </div>
            </div>
            <div className="service-name">{service.name}</div>
            <div className="service-stats">
              <div className="stat">
                <span className="label">Uptime</span>
                <span className="value">{service.uptime}</span>
              </div>
              <div className="stat">
                <span className="label">Response</span>
                <span className="value">{service.response_time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .system-health {
          padding: 24px;
          margin-bottom: 24px;
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
        
        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .refresh-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .services-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }
        
        @media (max-width: 1400px) {
          .services-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        @media (max-width: 800px) {
          .services-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .service-card {
          padding: 20px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: all 0.2s;
        }
        
        .service-card:hover {
          background: rgba(30, 41, 59, 0.6);
        }
        
        .service-card.healthy {
          border-color: rgba(16, 185, 129, 0.3);
        }
        
        .service-card.warning {
          border-color: rgba(249, 115, 22, 0.3);
        }
        
        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .service-icon {
          color: #94a3b8;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
        }
        
        .status-indicator.healthy {
          color: #10b981;
        }
        
        .status-indicator.warning {
          color: #f97316;
        }
        
        .service-name {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 12px;
        }
        
        .service-stats {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .stat {
          display: flex;
          justify-content: space-between;
        }
        
        .stat .label {
          font-size: 11px;
          color: #64748b;
        }
        
        .stat .value {
          font-size: 12px;
          font-weight: 600;
          color: #10b981;
        }
      `}</style>
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Check if getLogs exists before calling
    if (adminApi.system.getLogs) {
      adminApi.system.getLogs().then((data: any) => setLogs(data.logs || [])).catch(console.error);
    }
  }, []);

  const typeColors = {
    config: '#3b82f6',
    moderation: '#a855f7',
    monetization: '#10b981',
    system: '#f97316',
    marketing: '#ec4899',
  };

  return (
    <div className="audit-logs glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <FileText size={20} style={{ color: '#3b82f6' }} />
          <h3>Audit Logs</h3>
        </div>
        <div className="panel-actions">
          <div className="search-box">
            <Search size={14} />
            <input type="text" placeholder="Search logs..." />
          </div>
          <button className="export-btn">
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="logs-list">
        {logs.map((log) => (
          <motion.div
            key={log.id}
            className="log-item"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div
              className="log-type"
              style={{ background: `${typeColors[log.type as keyof typeof typeColors] || '#333'}20`, color: typeColors[log.type as keyof typeof typeColors] || '#ccc' }}
            >
              {log.type}
            </div>
            <div className="log-content">
              <span className="log-action">{log.action}</span>
              <span className="log-resource">{log.resource}</span>
            </div>
            <div className="log-meta">
              <span className="log-user">{log.user}</span>
              <span className="log-time">{log.time}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <button className="view-all-btn">View All Logs</button>

      <style jsx>{`
        .audit-logs {
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
        
        .panel-actions {
          display: flex;
          gap: 10px;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 8px;
        }
        
        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: #f1f5f9;
          font-size: 13px;
          width: 150px;
        }
        
        .search-box input::placeholder {
          color: #64748b;
        }
        
        .search-box svg {
          color: #64748b;
        }
        
        .export-btn {
          width: 36px;
          height: 36px;
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
        
        .export-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .log-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .log-type {
          font-size: 10px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        
        .log-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .log-action {
          font-size: 14px;
          color: #f1f5f9;
        }
        
        .log-resource {
          font-size: 12px;
          color: #64748b;
        }
        
        .log-meta {
          text-align: right;
        }
        
        .log-user {
          display: block;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .log-time {
          font-size: 11px;
          color: #64748b;
        }
        
        .view-all-btn {
          width: 100%;
          padding: 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 10px;
          color: #3b82f6;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .view-all-btn:hover {
          background: rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
}

function FeatureFlags() {
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => {
    adminApi.system.getFeatureFlags().then(data => setFlags(data.flags)).catch(console.error);
  }, []);

  const toggleFlag = (id: string, currentEnabled: boolean) => {
    // Optimistic update
    setFlags(prev => prev.map(flag =>
      flag.id === id ? { ...flag, enabled: !flag.enabled } : flag
    ));

    adminApi.system.updateFeatureFlag(id, !currentEnabled).then(updated => {
      // Confirmation or rollback if needed
    }).catch(err => {
      console.error("Failed to update flag", err);
      // Rollback
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

function SecurityAlerts() {
  const alertColors = {
    warning: { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    success: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  };

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
              style={alertColors[alert.type as keyof typeof alertColors]}
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

export default function SystemPage() {
  return (
    <div className="system-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>System Operations</h1>
          <p>Monitor system health, logs, and configuration</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">
            <Download size={16} />
            Export Logs
          </button>
          <button className="btn-primary">
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="quick-nav">
        <a href="/admin/system/health" className="nav-card">
          <Activity size={24} />
          <span>System Health</span>
          <span className="nav-desc">Live monitoring</span>
        </a>
        <a href="/admin/system/audit" className="nav-card">
          <FileText size={24} />
          <span>Audit Logs</span>
          <span className="nav-desc">Track all actions</span>
        </a>
        <a href="/admin/system/flags" className="nav-card">
          <Key size={24} />
          <span>Feature Flags</span>
          <span className="nav-desc">Control rollouts</span>
        </a>
      </div>

      {/* System Health */}
      <SystemHealth />

      {/* Grid Layout */}
      <div className="content-grid">
        <div className="grid-left">
          <AuditLogs />
        </div>
        <div className="grid-right">
          <FeatureFlags />
          <SecurityAlerts />
        </div>
      </div>

      <style jsx>{`
        .system-page {
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
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: none;
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }
        
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }
        
        @media (max-width: 1200px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .grid-right {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .quick-nav {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.4);
          color: #3b82f6;
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
