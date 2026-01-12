'use client';

import { Shield, Clock } from 'lucide-react';

export default function AppealsPage() {
    return (
        <div className="appeals-page">
            <div className="header">
                <h1>Ban Appeals</h1>
                <span className="badge">0 Pending</span>
            </div>

            <div className="empty-state">
                <Shield size={48} />
                <h3>No Active Appeals</h3>
                <p>There are no ban appeals requiring review at this time.</p>
            </div>

            <style jsx>{`
                .appeals-page { padding: 32px; color: #f1f5f9; height: 100%; }
                .header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
                .badge { background: #3b82f6; font-size: 12px; padding: 4px 8px; border-radius: 12px; font-weight: 600; }
                .empty-state {
                    background: rgba(30, 41, 59, 0.3);
                    border: 1px dashed rgba(148, 163, 184, 0.3);
                    border-radius: 16px;
                    padding: 60px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: #94a3b8;
                }
                .empty-state h3 { color: #f1f5f9; margin: 16px 0 8px; }
                .empty-state svg { color: #64748b; opacity: 0.5; }
            `}</style>
        </div>
    );
}
