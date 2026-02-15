'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Download } from 'lucide-react';
import { adminApi } from '@/services/admin';

// Интерфейс записи аудит-лога
interface AuditLog {
  id: string;
  type: string;
  action: string;
  resource: string;
  user: string;
  time: string;
}

// Цвета для типов логов
const typeColors: Record<string, string> = {
  config: '#3b82f6',
  moderation: '#a855f7',
  monetization: '#10b981',
  system: '#f97316',
  marketing: '#ec4899',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    // Проверяем наличие метода перед вызовом
    if (adminApi.system.getLogs) {
      adminApi.system.getLogs().then((data: { logs?: AuditLog[] }) => setLogs(data.logs || [])).catch(console.error);
    }
  }, []);

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
              style={{ background: `${typeColors[log.type] || '#333'}20`, color: typeColors[log.type] || '#ccc' }}
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
