'use client';

import { useState, useEffect } from 'react';
import { adminApi, ModerationQueueItem } from '@/services/adminApi';
import { AlertTriangle, Clock, Target, CheckCircle, Loader2 } from 'lucide-react';

export default function ReportsPage() {
    const [reports, setReports] = useState<ModerationQueueItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReports = async () => {
            try {
                // Fetch reports specifically
                const res = await adminApi.moderation.getQueue('report');
                setReports(res.items);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadReports();
    }, []);

    return (
        <div className="reports-page">
            <h1>User Reports</h1>
            <p className="subtitle">Review and manage reported content and users</p>

            {loading ? (
                <div className="loading"><Loader2 className="spin" /> Loading reports...</div>
            ) : (
                <div className="reports-list">
                    {reports.length === 0 ? <p className="empty">No pending reports.</p> : reports.map(report => (
                        <div key={report.id} className="report-item">
                            <div className="report-icon"><AlertTriangle size={20} /></div>
                            <div className="report-main">
                                <div className="report-header">
                                    <span className="user-name">Reported: {report.user_name}</span>
                                    <span className="priority badge">{report.priority}</span>
                                </div>
                                <p className="reason">{report.reason || 'Inappropriate behavior'}</p>
                                <div className="meta">
                                    <span><Clock size={12} /> {new Date(report.created_at).toLocaleDateString()}</span>
                                    <span>AI Score: {report.ai_score}</span>
                                </div>
                            </div>
                            <button className="btn-action">Review</button>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .reports-page { padding: 32px; color: #f1f5f9; }
                .subtitle { color: #94a3b8; margin-bottom: 24px; }
                .reports-list { display: flex; flex-direction: column; gap: 12px; }
                .report-item { background: rgba(30, 41, 59, 0.5); padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 16px; border: 1px solid rgba(148, 163, 184, 0.1); }
                .report-icon { color: #f97316; background: rgba(249, 115, 22, 0.1); padding: 10px; border-radius: 8px; }
                .report-main { flex: 1; }
                .report-header { display: flex; gap: 10px; align-items: center; margin-bottom: 4px; }
                .user-name { font-weight: 600; }
                .priority.badge { font-size: 10px; text-transform: uppercase; background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 6px; border-radius: 4px; }
                .reason { color: #cbd5e1; font-size: 14px; margin-bottom: 4px; }
                .meta { display: flex; gap: 12px; font-size: 12px; color: #64748b; }
                .btn-action { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer; }
                .btn-action:hover { background: #2563eb; }
                .loading, .empty { padding: 40px; text-align: center; color: #94a3b8; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
