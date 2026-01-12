'use client';

import { adminApi, UserSegment } from '@/services/adminApi';
import { Users, TrendingUp, AlertTriangle, Crown, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function UserSegmentsPage() {
    const [segments, setSegments] = useState<UserSegment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSegments = async () => {
            try {
                const data = await adminApi.users.getSegments();
                setSegments(data.segments);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSegments();
    }, []);

    const getIcon = (id: string) => {
        if (id.includes('whale') || id.includes('power')) return Crown;
        if (id.includes('risk')) return AlertTriangle;
        if (id.includes('new')) return Users;
        return TrendingUp;
    };

    const getColor = (id: string) => {
        if (id.includes('whale')) return '#f59e0b';
        if (id.includes('risk')) return '#ef4444';
        if (id.includes('new')) return '#3b82f6';
        return '#10b981';
    };

    return (
        <div className="segments-page">
            <h1 className="page-title">User Segments</h1>

            {loading ? (
                <div className="loading-state"><Loader2 className="spin" size={32} /></div>
            ) : (
                <div className="segments-grid">
                    {segments.map((s) => {
                        const Icon = getIcon(s.id);
                        const color = getColor(s.id);
                        return (
                            <div key={s.id} className="segment-card">
                                <div className="icon-wrapper" style={{ background: `${color}20`, color: color }}>
                                    <Icon size={24} />
                                </div>
                                <div className="segment-info">
                                    <h3>{s.name}</h3>
                                    <div className="big-number">{s.count}</div>
                                    <p className="description">{s.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="segment-details">
                <h2>Segment Analysis</h2>
                <div className="placeholder-chart">
                    Chart visualization coming soon
                </div>
            </div>

            <style jsx>{`
                .segments-page { padding: 32px; color: #f1f5f9; }
                .page-title { margin-bottom: 24px; }
                .segments-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
                .segment-card { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); padding: 24px; border-radius: 16px; transition: transform 0.2s; }
                .segment-card:hover { transform: translateY(-4px); border-color: rgba(59, 130, 246, 0.3); }
                .icon-wrapper { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
                .segment-info h3 { margin: 0 0 8px 0; font-size: 16px; color: #94a3b8; }
                .big-number { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
                .description { font-size: 13px; color: #64748b; margin-bottom: 12px; }
                .growth { font-size: 12px; color: #10b981; font-weight: 600; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 12px; }
                .segment-details { background: rgba(15, 23, 42, 0.65); padding: 24px; border-radius: 16px; border: 1px solid rgba(148, 163, 184, 0.2); }
                .placeholder-chart { height: 200px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 12px; margin-top: 16px; color: #64748b; }
            `}</style>
        </div>
    );
}
