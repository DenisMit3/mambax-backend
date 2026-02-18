'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Heart, MessageCircle, Gift, Star, Zap, Eye, Shield,
    ArrowLeft, Check, CheckCheck, Trash2, RefreshCw
} from 'lucide-react';
import { authService } from '@/services/api';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ErrorState } from '@/components/ui/ErrorState';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    image_url?: string;
    action_url?: string;
    is_read: boolean;
    created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    match: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    like: { icon: Heart, color: 'text-red-400', bg: 'bg-red-500/10' },
    superlike: { icon: Star, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    message: { icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    gift: { icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    boost: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    view: { icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    system: { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'сейчас';
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} д`;
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const FILTER_TABS = [
    { key: 'all', label: 'Все' },
    { key: 'unread', label: 'Непрочитанные' },
    { key: 'match', label: 'Матчи' },
    { key: 'like', label: 'Лайки' },
    { key: 'message', label: 'Сообщения' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

export default function NotificationsPage() {
    const router = useRouter();
    const haptic = useHaptic();
    const { isAuthed, isChecking } = useRequireAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const loadNotifications = useCallback(async (pageNum = 1, append = false) => {
        try {
            setError(false);
            const data = await authService.getNotifications(pageNum, 20);
            const items = data.notifications || [];
            setNotifications(prev => append ? [...prev, ...items] : items);
            setTotal(data.total);
            setUnreadCount(data.unread_count);
            setHasMore(items.length === 20);
        } catch (e) {
            console.error('Failed to load notifications:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthed) loadNotifications();
    }, [isAuthed, loadNotifications]);

    const markAllRead = useCallback(async () => {
        haptic.medium();
        try {
            await authService.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error('Failed to mark all read:', e);
        }
    }, [haptic]);

    const markOneRead = useCallback(async (id: string) => {
        try {
            await authService.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error('Failed to mark read:', e);
        }
    }, []);

    const handleTap = useCallback((notif: Notification) => {
        haptic.light();
        if (!notif.is_read) markOneRead(notif.id);
        if (notif.action_url) router.push(notif.action_url);
    }, [haptic, markOneRead, router]);

    const loadMore = useCallback(() => {
        const next = page + 1;
        setPage(next);
        loadNotifications(next, true);
    }, [page, loadNotifications]);

    // Filter
    const filtered = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !n.is_read;
        return n.type === filter;
    });

    if (isChecking || loading) {
        return (
            <div className="min-h-dvh bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) return <ErrorState onRetry={() => loadNotifications()} />;

    return (
        <div className="min-h-dvh bg-black text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => { haptic.light(); router.back(); }}
                        className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold">Уведомления</h1>
                        {unreadCount > 0 && (
                            <p className="text-xs text-purple-400">{unreadCount} непрочитанных</p>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 hover:bg-white/10 transition"
                        >
                            <CheckCheck size={14} />
                            Прочитать все
                        </button>
                    )}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { haptic.selection(); setFilter(tab.key); }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                filter === tab.key
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-[#0f0f11] text-slate-400 border border-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center pt-32 px-6 text-center"
                >
                    <div className="w-16 h-16 rounded-2xl bg-[#0f0f11] flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-sm">
                        {filter === 'unread' ? 'Нет непрочитанных' : 'Уведомлений пока нет'}
                    </p>
                </motion.div>
            ) : (
                <div className="px-4 pt-3">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((notif, i) => {
                            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                            const Icon = config.icon;
                            return (
                                <motion.button
                                    key={notif.id}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    transition={{ delay: i * 0.02 }}
                                    onClick={() => handleTap(notif)}
                                    className={`w-full flex items-start gap-3 p-3.5 rounded-2xl mb-2 text-left transition-colors ${
                                        notif.is_read
                                            ? 'bg-[#0f0f11]/50 border border-white/5'
                                            : 'bg-[#0f0f11] border border-purple-500/10'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                                        <Icon size={18} className={config.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-medium truncate ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                                                {notif.title}
                                            </p>
                                            {!notif.is_read && (
                                                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-600 shrink-0 mt-1">
                                        {timeAgo(notif.created_at)}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>

                    {/* Load more */}
                    {hasMore && (
                        <button
                            onClick={loadMore}
                            className="w-full py-3 mt-2 rounded-xl bg-white/5 text-sm text-slate-400 hover:bg-white/10 transition flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={14} />
                            Загрузить ещё
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
