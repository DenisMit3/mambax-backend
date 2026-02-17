'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Heart, MessageCircle, Flag, DollarSign,
    Shield, User, Edit, Activity, RefreshCw,
    Star, ThumbsDown, ArrowRight, ArrowLeft,
    Eye, EyeOff, Image, Mic, Video,
} from 'lucide-react';
import { httpClient } from '@/lib/http-client';

interface ActivityTimelineProps {
    userId: string;
}

interface RawTimelineEvent {
    type: string;
    action: string;
    details: Record<string, unknown> | null;
    timestamp: string;
}

interface DisplayEvent {
    type: string;
    icon: string;
    title: string;
    description: string;
    timestamp: string;
    color: string;
}

const mapEvent = (raw: RawTimelineEvent): DisplayEvent => {
    const actionMap: Record<string, { icon: string; title: string; color: string }> = {
        // Messages
        sent_message: { icon: 'message_out', title: 'Отправил сообщение', color: '#3b82f6' },
        received_message: { icon: 'message_in', title: 'Получил сообщение', color: '#06b6d4' },
        // Swipes
        liked: { icon: 'heart', title: 'Поставил лайк', color: '#ec4899' },
        superliked: { icon: 'star', title: 'Поставил суперлайк', color: '#eab308' },
        disliked: { icon: 'thumbsdown', title: 'Пропустил', color: '#64748b' },
        received_like: { icon: 'heart_in', title: 'Получил лайк', color: '#f472b6' },
        received_superlike: { icon: 'star_in', title: 'Получил суперлайк', color: '#facc15' },
        received_dislike: { icon: 'thumbsdown', title: 'Был пропущен', color: '#94a3b8' },
        // Match
        new_match: { icon: 'match', title: '💘 Новый матч!', color: '#10b981' },
        // Reports
        filed_report: { icon: 'flag', title: 'Подал жалобу', color: '#f97316' },
        was_reported: { icon: 'flag_red', title: 'Получил жалобу', color: '#ef4444' },
        // Admin actions
        user_verify: { icon: 'shield', title: 'Верифицирован', color: '#10b981' },
        user_unverify: { icon: 'shield', title: 'Верификация снята', color: '#f97316' },
        user_suspend: { icon: 'user', title: 'Приостановлен', color: '#f97316' },
        user_ban: { icon: 'user', title: 'Заблокирован', color: '#ef4444' },
        user_activate: { icon: 'user', title: 'Активирован', color: '#10b981' },
        stars_add: { icon: 'dollar', title: 'Начислены звёзды', color: '#eab308' },
        stars_remove: { icon: 'dollar', title: 'Списаны звёзды', color: '#ef4444' },
        edit_user: { icon: 'edit', title: 'Профиль отредактирован', color: '#8b5cf6' },
        warn_user: { icon: 'flag', title: 'Предупреждение', color: '#f97316' },
        reset_password: { icon: 'shield', title: 'Пароль сброшен', color: '#3b82f6' },
        update_subscription: { icon: 'dollar', title: 'Подписка обновлена', color: '#8b5cf6' },
        impersonate: { icon: 'user', title: 'Имперсонация', color: '#ef4444' },
    };

    const mapped = actionMap[raw.action] || { icon: 'activity', title: raw.action, color: '#64748b' };
    let description = '';
    const d = raw.details;

    if (d) {
        if (raw.action === 'sent_message') {
            const to = d.receiver_name || '—';
            const preview = d.preview || '';
            description = `→ ${to}: ${preview}`;
            if (d.is_read === false) description += ' (не прочитано)';
        } else if (raw.action === 'received_message') {
            const from = d.sender_name || '—';
            const preview = d.preview || '';
            description = `← ${from}: ${preview}`;
            if (d.is_read === false) description += ' (не прочитано)';
        } else if (raw.action === 'liked' || raw.action === 'superliked' || raw.action === 'disliked') {
            description = `→ ${d.target_name || '—'}`;
        } else if (raw.action === 'received_like' || raw.action === 'received_superlike' || raw.action === 'received_dislike') {
            description = `← от ${d.from_name || '—'}`;
        } else if (raw.action === 'new_match') {
            description = `с ${d.other_name || '—'}`;
        } else if (raw.type === 'report') {
            const who = d.other_name || '—';
            const dir = raw.action === 'filed_report' ? `на ${who}` : `от ${who}`;
            description = `${dir} • ${d.reason || '—'} (${d.status || '—'})`;
        } else if (d.reason) {
            description = String(d.reason);
        } else if (d.amount) {
            description = `${d.amount} звёзд`;
        } else {
            const keys = Object.keys(d);
            if (keys.length > 0) {
                description = keys.map(k => `${k}: ${d[k]}`).join(', ');
            }
        }
    }

    return { ...mapped, type: raw.type, description, timestamp: raw.timestamp };
};

const getIcon = (iconName: string, color: string) => {
    const size = 16;
    const props = { size, style: { color } };
    switch (iconName) {
        case 'heart': return <Heart {...props} />;
        case 'heart_in': return <Heart {...props} fill={color} />;
        case 'star': return <Star {...props} />;
        case 'star_in': return <Star {...props} fill={color} />;
        case 'thumbsdown': return <ThumbsDown {...props} />;
        case 'match': return <Heart {...props} fill={color} />;
        case 'message_out': return <ArrowRight {...props} />;
        case 'message_in': return <ArrowLeft {...props} />;
        case 'message': return <MessageCircle {...props} />;
        case 'flag': return <Flag {...props} />;
        case 'flag_red': return <Flag {...props} fill={color} />;
        case 'dollar': return <DollarSign {...props} />;
        case 'shield': return <Shield {...props} />;
        case 'user': return <User {...props} />;
        case 'edit': return <Edit {...props} />;
        default: return <Activity {...props} />;
    }
};

const formatTime = (ts: string | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (mins < 60) return `${mins}м назад, ${timeStr}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}ч назад, ${timeStr}`;
    const days = Math.floor(hours / 24);
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    if (days < 7) return `${days}д назад, ${dateStr} ${timeStr}`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) + ` ${timeStr}`;
};

export default function ActivityTimeline({ userId }: ActivityTimelineProps) {
    const [events, setEvents] = useState<DisplayEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchTimeline = async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await httpClient.get<{ events: RawTimelineEvent[] }>(
                    `/admin/users/${userId}/timeline?limit=50`
                );
                if (!cancelled) {
                    setEvents((data.events || []).map(mapEvent));
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Failed to load timeline:', err);
                    setError(true);
                }
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

    if (error) {
        return (
            <div className="text-red-500" style={{ padding: '40px', textAlign: 'center' }}>
                Не удалось загрузить активность.
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
            <div style={{
                position: 'absolute', left: '1.05rem', top: 0, bottom: 0,
                width: '2px', background: 'rgba(148, 163, 184, 0.15)',
            }} />

            <div className="text-slate-500" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
                Всего событий: {events.length}
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
                    <div style={{
                        position: 'absolute', left: '-1.55rem', top: '0.35rem',
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: event.color, border: '2px solid rgba(15, 23, 42, 0.9)',
                        zIndex: 1,
                    }} />

                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: `${event.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        {getIcon(event.icon, event.color)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-slate-200" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {event.title}
                            </span>
                            <span className="text-slate-500" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                                {formatTime(event.timestamp)}
                            </span>
                        </div>
                        {event.description && (
                            <div className="text-slate-400" style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                                {event.description}
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
