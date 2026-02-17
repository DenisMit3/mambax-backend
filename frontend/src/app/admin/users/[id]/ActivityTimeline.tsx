'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Heart, MessageCircle, Flag, DollarSign,
    Shield, User, Edit, Activity, RefreshCw,
    Star, ThumbsDown, ArrowRight, ArrowLeft,
    Eye, EyeOff, Image, Mic, Video, ChevronDown, ChevronUp,
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
    photoUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    fullText?: string;
    messageType?: string;
    isRead?: boolean;
    otherName?: string;
    otherId?: string;
    direction?: 'in' | 'out';
    extra?: Record<string, unknown>;
}

const mapEvent = (raw: RawTimelineEvent): DisplayEvent => {
    const actionMap: Record<string, { icon: string; title: string; color: string }> = {
        sent_message: { icon: 'message_out', title: 'Отправил сообщение', color: '#3b82f6' },
        received_message: { icon: 'message_in', title: 'Получил сообщение', color: '#06b6d4' },
        liked: { icon: 'heart', title: 'Поставил лайк', color: '#ec4899' },
        superliked: { icon: 'star', title: 'Поставил суперлайк', color: '#eab308' },
        disliked: { icon: 'thumbsdown', title: 'Пропустил', color: '#64748b' },
        received_like: { icon: 'heart_in', title: 'Получил лайк', color: '#f472b6' },
        received_superlike: { icon: 'star_in', title: 'Получил суперлайк', color: '#facc15' },
        received_dislike: { icon: 'thumbsdown', title: 'Был пропущен', color: '#94a3b8' },
        new_match: { icon: 'match', title: '💘 Новый матч!', color: '#10b981' },
        filed_report: { icon: 'flag', title: 'Подал жалобу', color: '#f97316' },
        was_reported: { icon: 'flag_red', title: 'Получил жалобу', color: '#ef4444' },
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
    let photoUrl: string | undefined;
    let audioUrl: string | undefined;
    let audioDuration: number | undefined;
    let fullText: string | undefined;
    let messageType: string | undefined;
    let isRead: boolean | undefined;
    let otherName: string | undefined;
    let otherId: string | undefined;
    let direction: 'in' | 'out' | undefined;

    if (d) {
        if (raw.action === 'sent_message' || raw.action === 'received_message') {
            const isSent = raw.action === 'sent_message';
            direction = isSent ? 'out' : 'in';
            otherName = String(isSent ? (d.receiver_name || '—') : (d.sender_name || '—'));
            otherId = String(isSent ? (d.receiver_id || '') : (d.sender_id || ''));
            messageType = String(d.message_type || 'text');
            isRead = d.is_read as boolean;
            photoUrl = d.photo_url as string | undefined;
            audioUrl = d.audio_url as string | undefined;
            audioDuration = d.duration as number | undefined;
            fullText = d.text as string | undefined;

            const arrow = isSent ? '→' : '←';
            const preview = String(d.preview || '');
            description = `${arrow} ${otherName}: ${preview}`;
            if (d.is_read === false) description += ' (не прочитано)';
            if (d.is_read === true) description += ' ✓';
        } else if (raw.action === 'liked' || raw.action === 'superliked' || raw.action === 'disliked') {
            otherName = String(d.target_name || '—');
            otherId = String(d.target_id || '');
            direction = 'out';
            description = `→ ${otherName}`;
        } else if (raw.action === 'received_like' || raw.action === 'received_superlike' || raw.action === 'received_dislike') {
            otherName = String(d.from_name || '—');
            otherId = String(d.from_id || '');
            direction = 'in';
            description = `← от ${otherName}`;
        } else if (raw.action === 'new_match') {
            otherName = String(d.other_name || '—');
            otherId = String(d.other_id || '');
            description = `с ${otherName}`;
        } else if (raw.type === 'report') {
            const who = String(d.other_name || '—');
            otherId = String(d.other_id || '');
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

    return {
        ...mapped, type: raw.type, description, timestamp: raw.timestamp,
        photoUrl, audioUrl, audioDuration, fullText, messageType,
        isRead, otherName, otherId, direction,
    };
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

const MessageTypeIcon = ({ type }: { type: string }) => {
    const s = 12;
    const c = '#94a3b8';
    switch (type) {
        case 'photo': return <Image size={s} style={{ color: c }} />;
        case 'voice': return <Mic size={s} style={{ color: c }} />;
        case 'video': return <Video size={s} style={{ color: c }} />;
        default: return null;
    }
};

function EventCard({ event, index }: { event: DisplayEvent; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const hasExpandable = !!(event.fullText || event.photoUrl || event.audioUrl);

    return (
        <motion.div
            key={`${event.type}-${event.timestamp}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            style={{
                position: 'relative',
                marginBottom: '0.5rem',
            }}
        >
            {/* Timeline dot */}
            <div style={{
                position: 'absolute', left: '-1.55rem', top: '0.6rem',
                width: '10px', height: '10px', borderRadius: '50%',
                background: event.color, border: '2px solid rgba(15, 23, 42, 0.9)',
                zIndex: 1,
            }} />

            {/* Card */}
            <div
                style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '10px',
                    padding: '0.65rem 0.85rem',
                    border: `1px solid ${event.color}15`,
                    cursor: hasExpandable ? 'pointer' : 'default',
                }}
                onClick={() => hasExpandable && setExpanded(!expanded)}
            >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        background: `${event.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        {getIcon(event.icon, event.color)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                <span className="text-slate-200" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                    {event.title}
                                </span>
                                {event.messageType && <MessageTypeIcon type={event.messageType} />}
                                {event.direction === 'out' && (
                                    <span style={{ fontSize: '0.65rem', color: '#3b82f6', background: '#3b82f620', padding: '1px 5px', borderRadius: 4 }}>OUT</span>
                                )}
                                {event.direction === 'in' && (
                                    <span style={{ fontSize: '0.65rem', color: '#06b6d4', background: '#06b6d420', padding: '1px 5px', borderRadius: 4 }}>IN</span>
                                )}
                                {event.isRead === true && (
                                    <Eye size={12} style={{ color: '#10b981' }} />
                                )}
                                {event.isRead === false && (
                                    <EyeOff size={12} style={{ color: '#f97316' }} />
                                )}
                            </div>
                            <span className="text-slate-500" style={{ fontSize: '0.68rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                {formatTime(event.timestamp)}
                            </span>
                        </div>

                        {/* Description line */}
                        {event.description && (
                            <div className="text-slate-400" style={{
                                fontSize: '0.76rem', marginTop: '0.1rem',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: expanded ? 'normal' : 'nowrap',
                            }}>
                                {event.otherName && (
                                    <span style={{ color: event.color, fontWeight: 500 }}>{event.otherName}</span>
                                )}
                                {event.otherName && ': '}
                                {event.description.replace(`${event.direction === 'out' ? '→' : '←'} ${event.otherName}: `, '')}
                            </div>
                        )}
                    </div>

                    {/* Expand toggle */}
                    {hasExpandable && (
                        <div style={{ flexShrink: 0, color: '#64748b' }}>
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    )}
                </div>

                {/* Expanded content */}
                {expanded && (
                    <div style={{ marginTop: '0.6rem', paddingLeft: '2.4rem' }}>
                        {/* Full text */}
                        {event.fullText && (
                            <div style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                borderRadius: '8px',
                                padding: '0.5rem 0.7rem',
                                fontSize: '0.8rem',
                                color: '#e2e8f0',
                                lineHeight: 1.5,
                                marginBottom: event.photoUrl || event.audioUrl ? '0.5rem' : 0,
                                borderLeft: `3px solid ${event.color}40`,
                                wordBreak: 'break-word',
                            }}>
                                {event.fullText}
                            </div>
                        )}

                        {/* Photo */}
                        {event.photoUrl && !imgError && (
                            <div style={{ marginBottom: event.audioUrl ? '0.5rem' : 0 }}>
                                <img
                                    src={event.photoUrl}
                                    alt="Фото в сообщении"
                                    onError={() => setImgError(true)}
                                    style={{
                                        maxWidth: '280px',
                                        maxHeight: '280px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        border: '1px solid rgba(148, 163, 184, 0.15)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(event.photoUrl, '_blank');
                                    }}
                                />
                            </div>
                        )}
                        {event.photoUrl && imgError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#f87171',
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                            }}>
                                <Image size={14} /> Фото недоступно
                                <a
                                    href={event.photoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#60a5fa', textDecoration: 'underline', marginLeft: '0.3rem' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Открыть ссылку
                                </a>
                            </div>
                        )}

                        {/* Audio */}
                        {event.audioUrl && (
                            <div onClick={(e) => e.stopPropagation()}>
                                <audio
                                    controls
                                    preload="none"
                                    style={{ height: '32px', width: '100%', maxWidth: '300px' }}
                                >
                                    <source src={event.audioUrl} />
                                </audio>
                                {event.audioDuration && (
                                    <span className="text-slate-500" style={{ fontSize: '0.7rem', marginLeft: '0.3rem' }}>
                                        {Math.round(event.audioDuration)}с
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Meta info */}
                        {event.otherId && (
                            <div className="text-slate-600" style={{ fontSize: '0.65rem', marginTop: '0.4rem' }}>
                                ID: {event.otherId}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function ActivityTimeline({ userId }: ActivityTimelineProps) {
    const [events, setEvents] = useState<DisplayEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        let cancelled = false;
        const fetchTimeline = async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await httpClient.get<{ events: RawTimelineEvent[] }>(
                    `/admin/users/${userId}/timeline?limit=100`
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

    const filteredEvents = filter === 'all'
        ? events
        : events.filter(e => {
            if (filter === 'messages') return e.type === 'message';
            if (filter === 'swipes') return e.type === 'swipe';
            if (filter === 'matches') return e.type === 'match';
            if (filter === 'reports') return e.type === 'report';
            if (filter === 'admin') return e.type === 'admin_action';
            if (filter === 'photos') return e.messageType === 'photo';
            return true;
        });

    const counts = {
        all: events.length,
        messages: events.filter(e => e.type === 'message').length,
        swipes: events.filter(e => e.type === 'swipe').length,
        matches: events.filter(e => e.type === 'match').length,
        reports: events.filter(e => e.type === 'report').length,
        photos: events.filter(e => e.messageType === 'photo').length,
        admin: events.filter(e => e.type === 'admin_action').length,
    };

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

    const filterButtons: { key: string; label: string; emoji: string }[] = [
        { key: 'all', label: 'Все', emoji: '📋' },
        { key: 'messages', label: 'Сообщения', emoji: '💬' },
        { key: 'photos', label: 'Фото', emoji: '📷' },
        { key: 'swipes', label: 'Свайпы', emoji: '❤️' },
        { key: 'matches', label: 'Матчи', emoji: '💘' },
        { key: 'reports', label: 'Жалобы', emoji: '🚩' },
        { key: 'admin', label: 'Админ', emoji: '🛡' },
    ];

    return (
        <div>
            {/* Filter bar */}
            <div style={{
                display: 'flex', gap: '0.35rem', flexWrap: 'wrap',
                marginBottom: '1rem', paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            }}>
                {filterButtons.map(fb => {
                    const count = counts[fb.key as keyof typeof counts] || 0;
                    const active = filter === fb.key;
                    return (
                        <button
                            key={fb.key}
                            onClick={() => setFilter(fb.key)}
                            style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                border: 'none',
                                cursor: 'pointer',
                                background: active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                                color: active ? '#60a5fa' : '#94a3b8',
                                fontWeight: active ? 600 : 400,
                                transition: 'all 0.15s',
                            }}
                        >
                            {fb.emoji} {fb.label} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
                        </button>
                    );
                })}
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                <div style={{
                    position: 'absolute', left: '1.05rem', top: 0, bottom: 0,
                    width: '2px', background: 'rgba(148, 163, 184, 0.1)',
                }} />

                <div className="text-slate-500" style={{ fontSize: '0.72rem', marginBottom: '0.75rem' }}>
                    Показано: {filteredEvents.length} из {events.length}
                </div>

                {filteredEvents.map((event, i) => (
                    <EventCard key={`${event.type}-${event.timestamp}-${i}`} event={event} index={i} />
                ))}
            </div>
        </div>
    );
}
