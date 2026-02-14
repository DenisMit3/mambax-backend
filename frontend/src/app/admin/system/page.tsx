'use client';

import { Settings, Activity, FileText, Key, Download } from 'lucide-react';
import SystemHealth from './SystemHealth';
import AuditLogs from './AuditLogs';
import FeatureFlags from './FeatureFlags';
import SecurityAlerts from './SecurityAlerts';

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
