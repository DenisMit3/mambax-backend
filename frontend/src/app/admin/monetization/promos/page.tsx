'use client';

import { Tag, Plus, MoreHorizontal } from 'lucide-react';

export default function PromosPage() {
    const promos = [
        { code: 'SUMMER2024', discount: '20%', uses: 45, max: 1000, status: 'active' },
        { code: 'WELCOME50', discount: '50%', uses: 128, max: 500, status: 'active' },
        { code: 'VIP_TRIAL', discount: '100% (7 Days)', uses: 12, max: 50, status: 'expired' },
    ];

    return (
        <div className="promos-page">
            <div className="header">
                <h1>Promo Codes</h1>
                <button className="btn-primary"><Plus size={16} /> Create New</button>
            </div>

            <div className="promos-table-container">
                <table className="promos-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Discount</th>
                            <th>Usage</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promos.map((p, i) => (
                            <tr key={i}>
                                <td className="code-cell"><Tag size={14} /> {p.code}</td>
                                <td>{p.discount}</td>
                                <td>{p.uses} / {p.max}</td>
                                <td><span className={`status ${p.status}`}>{p.status}</span></td>
                                <td><button className="icon-btn"><MoreHorizontal size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .promos-page { padding: 32px; color: #f1f5f9; }
                .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
                .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .promos-table-container { background: rgba(30, 41, 59, 0.5); border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.1); overflow: hidden; }
                .promos-table { width: 100%; border-collapse: collapse; }
                .promos-table th, .promos-table td { padding: 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .promos-table th { background: rgba(15, 23, 42, 0.4); font-size: 12px; color: #94a3b8; text-transform: uppercase; }
                .code-cell { font-family: monospace; font-weight: 600; color: #f59e0b; display: flex; gap: 8px; align-items: center; }
                .status { font-size: 11px; padding: 4px 8px; border-radius: 12px; text-transform: uppercase; font-weight: 700; }
                .status.active { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .status.expired { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
                .icon-btn { background: transparent; border: none; color: #64748b; cursor: pointer; }
                .icon-btn:hover { color: white; }
            `}</style>
        </div>
    );
}
