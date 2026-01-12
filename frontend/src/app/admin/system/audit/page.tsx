'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Search,
    Filter,
    Calendar,
    User,
    Clock,
    ChevronRight,
    Download,
    Eye,
    Shield,
    Settings,
    UserCheck,
    Ban,
    RefreshCw,
    DollarSign,
} from 'lucide-react';

interface AuditLog {
    id: string;
    timestamp: string;
    adminId: string;
    adminName: string;
    action: string;
    resource: string;
    resourceId: string;
    details: Record<string, unknown>;
    ipAddress: string;
}

const mockLogs: AuditLog[] = [
    {
        id: 'log-1',
        timestamp: '2024-02-06T15:30:00Z',
        adminId: 'admin-1',
        adminName: 'John Admin',
        action: 'user.ban',
        resource: 'user',
        resourceId: 'user-123',
        details: { reason: 'Inappropriate content', duration: 'permanent' },
        ipAddress: '192.168.1.100'
    },
    {
        id: 'log-2',
        timestamp: '2024-02-06T15:15:00Z',
        adminId: 'admin-2',
        adminName: 'Jane Moderator',
        action: 'content.approve',
        resource: 'photo',
        resourceId: 'photo-456',
        details: { previousStatus: 'pending' },
        ipAddress: '192.168.1.101'
    },
    {
        id: 'log-3',
        timestamp: '2024-02-06T14:45:00Z',
        adminId: 'admin-1',
        adminName: 'John Admin',
        action: 'user.verify',
        resource: 'user',
        resourceId: 'user-789',
        details: { verificationType: 'photo' },
        ipAddress: '192.168.1.100'
    },
    {
        id: 'log-4',
        timestamp: '2024-02-06T14:30:00Z',
        adminId: 'admin-3',
        adminName: 'Mike Support',
        action: 'refund.approve',
        resource: 'transaction',
        resourceId: 'txn-567',
        details: { amount: 29.99, reason: 'duplicate charge' },
        ipAddress: '192.168.1.102'
    },
    {
        id: 'log-5',
        timestamp: '2024-02-06T14:00:00Z',
        adminId: 'admin-1',
        adminName: 'John Admin',
        action: 'feature_flag.update',
        resource: 'config',
        resourceId: 'flag-video-calls',
        details: { enabled: true, previous: false },
        ipAddress: '192.168.1.100'
    },
    {
        id: 'log-6',
        timestamp: '2024-02-06T13:30:00Z',
        adminId: 'admin-2',
        adminName: 'Jane Moderator',
        action: 'content.reject',
        resource: 'photo',
        resourceId: 'photo-789',
        details: { reason: 'NSFW content detected' },
        ipAddress: '192.168.1.101'
    },
    {
        id: 'log-7',
        timestamp: '2024-02-06T13:00:00Z',
        adminId: 'admin-1',
        adminName: 'John Admin',
        action: 'user.unban',
        resource: 'user',
        resourceId: 'user-456',
        details: { previousBan: 'temporary', appealApproved: true },
        ipAddress: '192.168.1.100'
    },
    {
        id: 'log-8',
        timestamp: '2024-02-06T12:30:00Z',
        adminId: 'admin-3',
        adminName: 'Mike Support',
        action: 'ticket.close',
        resource: 'support_ticket',
        resourceId: 'ticket-234',
        details: { resolution: 'resolved', satisfaction: 5 },
        ipAddress: '192.168.1.102'
    }
];

function LogStats() {
    const stats = [
        { label: 'Total Actions (24h)', value: '1,234', icon: <FileText size={18} />, color: '#3b82f6' },
        { label: 'Active Admins', value: '4', icon: <User size={18} />, color: '#10b981' },
        { label: 'Content Actions', value: '567', icon: <Shield size={18} />, color: '#a855f7' },
        { label: 'Config Changes', value: '12', icon: <Settings size={18} />, color: '#f59e0b' },
    ];

    return (
        <div className="log-stats">
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
        .log-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        @media (max-width: 1000px) {
          .log-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 20px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
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

function LogEntry({ log }: { log: AuditLog }) {
    const [expanded, setExpanded] = useState(false);

    const getActionIcon = (action: string) => {
        if (action.includes('ban')) return <Ban size={16} />;
        if (action.includes('verify')) return <UserCheck size={16} />;
        if (action.includes('refund')) return <DollarSign size={16} />;
        if (action.includes('config') || action.includes('flag')) return <Settings size={16} />;
        return <Eye size={16} />;
    };

    const getActionColor = (action: string) => {
        if (action.includes('ban') || action.includes('reject')) return '#ef4444';
        if (action.includes('approve') || action.includes('verify')) return '#10b981';
        if (action.includes('refund')) return '#f59e0b';
        if (action.includes('update') || action.includes('config')) return '#3b82f6';
        return '#a855f7';
    };

    const color = getActionColor(log.action);

    return (
        <motion.div
            className="log-entry"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
        >
            <div className="entry-main" onClick={() => setExpanded(!expanded)}>
                <div className="action-icon" style={{ background: `${color}20`, color }}>
                    {getActionIcon(log.action)}
                </div>

                <div className="entry-content">
                    <div className="action-text">
                        <span className="admin-name">{log.adminName}</span>
                        <span className="action-name">{log.action.replace(/[._]/g, ' ')}</span>
                        <span className="resource-id">{log.resourceId}</span>
                    </div>
                    <div className="entry-meta">
                        <span><Clock size={12} /> {new Date(log.timestamp).toLocaleString()}</span>
                        <span><User size={12} /> {log.ipAddress}</span>
                    </div>
                </div>

                <ChevronRight
                    size={18}
                    className={`expand-icon ${expanded ? 'expanded' : ''}`}
                />
            </div>

            {expanded && (
                <motion.div
                    className="entry-details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <div className="details-grid">
                        <div className="detail-item">
                            <span className="detail-label">Admin ID</span>
                            <span className="detail-value">{log.adminId}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Resource Type</span>
                            <span className="detail-value">{log.resource}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Resource ID</span>
                            <span className="detail-value">{log.resourceId}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">IP Address</span>
                            <span className="detail-value">{log.ipAddress}</span>
                        </div>
                    </div>

                    {Object.keys(log.details).length > 0 && (
                        <div className="additional-details">
                            <span className="detail-label">Details</span>
                            <pre className="json-display">{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                    )}
                </motion.div>
            )}

            <style jsx>{`
        .log-entry {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          margin-bottom: 10px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        
        .log-entry:hover {
          border-color: rgba(148, 163, 184, 0.4);
        }
        
        .entry-main {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          cursor: pointer;
        }
        
        .action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .entry-content {
          flex: 1;
          min-width: 0;
        }
        
        .action-text {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .admin-name {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }
        
        .action-name {
          font-size: 14px;
          color: #94a3b8;
          text-transform: capitalize;
        }
        
        .resource-id {
          font-size: 13px;
          font-family: monospace;
          color: #64748b;
          background: rgba(30, 41, 59, 0.5);
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .entry-meta {
          display: flex;
          gap: 16px;
        }
        
        .entry-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;
        }
        
        :global(.expand-icon) {
          color: #64748b;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        
        :global(.expand-icon.expanded) {
          transform: rotate(90deg);
        }
        
        .entry-details {
          padding: 0 20px 20px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding-top: 16px;
          margin-bottom: 16px;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .detail-value {
          font-size: 13px;
          color: #f1f5f9;
        }
        
        .additional-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .json-display {
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 10px;
          font-size: 12px;
          font-family: monospace;
          color: #a855f7;
          overflow-x: auto;
        }
      `}</style>
        </motion.div>
    );
}

export default function AuditLogsPage() {
    const [logs] = useState(mockLogs);
    const [search, setSearch] = useState('');
    const [filterAdmin, setFilterAdmin] = useState('all');
    const [filterAction, setFilterAction] = useState('all');

    const admins = [...new Set(logs.map(l => l.adminName))];
    const actions = [...new Set(logs.map(l => l.action.split('.')[0]))];

    const filteredLogs = logs.filter(log => {
        if (search && !log.action.includes(search) && !log.resourceId.includes(search)) return false;
        if (filterAdmin !== 'all' && log.adminName !== filterAdmin) return false;
        if (filterAction !== 'all' && !log.action.startsWith(filterAction)) return false;
        return true;
    });

    return (
        <div className="audit-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Audit Logs</h1>
                    <p>Track all admin actions and system changes</p>
                </div>
                <button className="btn-export">
                    <Download size={16} />
                    Export Logs
                </button>
            </div>

            {/* Stats */}
            <LogStats />

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search actions, resources..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <Filter size={16} />
                    <select value={filterAdmin} onChange={(e) => setFilterAdmin(e.target.value)}>
                        <option value="all">All Admins</option>
                        {admins.map(admin => (
                            <option key={admin} value={admin}>{admin}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                        <option value="all">All Actions</option>
                        {actions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Logs List */}
            <div className="logs-list">
                {filteredLogs.map((log) => (
                    <LogEntry key={log.id} log={log} />
                ))}

                {filteredLogs.length === 0 && (
                    <div className="empty-state">
                        <FileText size={48} />
                        <h3>No logs found</h3>
                        <p>Try adjusting your filters</p>
                    </div>
                )}
            </div>

            <style jsx>{`
        .audit-page {
          max-width: 1200px;
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
        
        .btn-export {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          color: #f1f5f9;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-export:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.3);
        }
        
        .filters-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 250px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
        }
        
        .search-box svg {
          color: #64748b;
        }
        
        .search-box input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #f1f5f9;
          font-size: 14px;
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          color: #64748b;
        }
        
        .filter-group select {
          background: transparent;
          border: none;
          outline: none;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
        }
        
        .logs-list {
          display: flex;
          flex-direction: column;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        
        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 16px 0 8px;
        }
      `}</style>
        </div>
    );
}
