'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/services/adminApi';
import { FileText, Search, Download } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    admin_id: string;
    target_resource: string;
    created_at: string;
    changes: any;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock fetch or simulate
        setTimeout(() => {
            setLogs([
                { id: '1', action: 'user_ban', admin_id: 'admin-1', target_resource: 'user:123', created_at: new Date().toISOString(), changes: { reason: 'Spam' } },
                { id: '2', action: 'update_feature_flag', admin_id: 'admin-1', target_resource: 'flag:video_calls', created_at: new Date(Date.now() - 3600000).toISOString(), changes: { enabled: true } },
                { id: '3', action: 'promo_create', admin_id: 'admin-2', target_resource: 'promo:SUMMER', created_at: new Date(Date.now() - 86400000).toISOString(), changes: {} },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    return (
        <div className="logs-page">
            <div className="header">
                <h1>System Logs</h1>
                <button className="btn-secondary"><Download size={16} /> Export CSV</button>
            </div>

            <div className="search-bar">
                <Search size={16} />
                <input type="text" placeholder="Search logs..." />
            </div>

            {loading ? <div className="loading">Loading logs...</div> : (
                <div className="logs-container">
                    <table className="logs-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Admin</th>
                                <th>Target</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td className="mono">{new Date(log.created_at).toLocaleString()}</td>
                                    <td><span className="action-tag">{log.action}</span></td>
                                    <td>{log.admin_id}</td>
                                    <td className="mono">{log.target_resource}</td>
                                    <td className="details-cell">{JSON.stringify(log.changes)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <style jsx>{`
                .logs-page { padding: 32px; color: #f1f5f9; }
                .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
                .search-bar { background: rgba(30, 41, 59, 0.5); padding: 12px; border-radius: 12px; display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border: 1px solid rgba(148, 163, 184, 0.2); }
                .search-bar input { background: transparent; border: none; outline: none; color: white; width: 100%; }
                .logs-container { background: rgba(15, 23, 42, 0.6); border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.2); overflow: hidden; }
                .logs-table { width: 100%; border-collapse: collapse; }
                .logs-table th, .logs-table td { padding: 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; font-size: 13px; }
                .logs-table th { background: rgba(30, 41, 59, 0.8); color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 11px; }
                .mono { font-family: monospace; color: #94a3b8; }
                .action-tag { background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; }
                .details-cell { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #64748b; font-family: monospace; }
                .loading { text-align: center; padding: 40px; color: #64748b; }
            `}</style>
        </div>
    );
}
