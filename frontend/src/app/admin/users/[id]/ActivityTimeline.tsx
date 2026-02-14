'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Heart, MessageCircle, Flag, DollarSign,
    Shield, User, Edit, Activity, RefreshCw,
} from 'lucide-react';
import { TimelineEvent } from './types';

interface ActivityTimelineProps {
    userId: string;
}

// Иконка по имени
const getIcon = (iconName: string, color: string) => {
    const size = 16;
    const props = { size, style: { color } };
    switch (iconName) {
        case 'heart': return <Heart {...props} />;
        case 'message': return <MessageCircle {...props} />;
        case 'flag': return <Flag {...props} />;
        case 'dollar': return <DollarSign {...props} />;
        case 'shield': return <Shield {...props} />;
        case 'user': return <User {...props} />;
        case 'edit': return <Edit {...props} />;
        default: return <Activity {...props} />;
    }
};

// Форматирование времени (относительное)
const formatTime = (ts: string | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}м назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч назад`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}д назад`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ActivityTimeline({ userId }: ActivityTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const fetchTimeline = async () => {
            setLoading(true);
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
                const token = (() => { try { return localStorage.getItem('token'); } catch { return null; } })();
                const response = await fetch(`${API_BASE}/admin/users/${userId}/activity-timeline?limit=50`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (!cancelled) {
                        setEvents(data.events || []);
                        setTotal(data.total || 0);
                    }
                }
            } catch (err) {
                if (!cancelled) console.error('Failed to load timeline:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchTimeline();
        return () => { cancelled = true; };
    }, [userId]);

    if (loading) {
        return (
            <div className="text-slate-500" style={{ padding: '40px', textAlign: 'center' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 8 }}>Загрузка активности...</p>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-slate-500" style={{ padding: '40px', textAlign: 'center' }}>
                Нет событий для отображения
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
            {/* Вертикальная линия таймлайна */}
            <div style={{
                position: 'absolute', left: '1.05rem', top: 0, bottom: 0,
                width: '2px', background: 'rgba(148, 163, 184, 0.15)',
            }} />

            <div className="text-slate-500" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
                Всего событий: {total}
            </div>

            {events.map((event, i) => (
                <motion.div
                    key={`${event.type}-${event.timestamp}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                        display: 'flex', alignItems: 'flex-start',
                        gap: '1rem', marginBottom: '1rem', position: 'relative',
                    }}
                >
                    {/* Точка на таймлайне */}
                    <div style={{
                        position: 'absolute', left: '-1.55rem', top: '0.35rem',
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: event.color, border: '2px solid rgba(15, 23, 42, 0.9)',
                        zIndex: 1,
                    }} />

                    {/* Иконка */}
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: `${event.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        {getIcon(event.icon, event.color)}
                    </div>

                    {/* Контент */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-slate-200" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {event.title}
                            </span>
                            <span className="text-slate-500" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                                {formatTime(event.timestamp)}
                            </span>
                        </div>
                        <div className="text-slate-400" style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                            {event.description}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
