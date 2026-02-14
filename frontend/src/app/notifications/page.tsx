"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, MessageCircle, Gift, Star, Rocket, Eye, Zap, Bell, CheckCheck, Loader2 } from "lucide-react";
import { authService } from "@/services/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ErrorState } from "@/components/ui/ErrorState";

interface Notification {
    id: string;
    type: "match" | "message" | "like" | "gift" | "system" | "boost" | "superlike" | "view";
    title: string;
    body: string;
    image_url?: string;
    action_url?: string;
    is_read: boolean;
    created_at: string;
}

const ICON_MAP: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
    match: { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/20" },
    like: { icon: Heart, color: "text-rose-400", bg: "bg-rose-500/20" },
    message: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/20" },
    gift: { icon: Gift, color: "text-purple-400", bg: "bg-purple-500/20" },
    system: { icon: Bell, color: "text-slate-400", bg: "bg-slate-500/20" },
    boost: { icon: Rocket, color: "text-orange-400", bg: "bg-orange-500/20" },
    superlike: { icon: Star, color: "text-amber-400", bg: "bg-amber-500/20" },
    view: { icon: Eye, color: "text-cyan-400", bg: "bg-cyan-500/20" },
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} д`;
    return new Date(dateStr).toLocaleDateString("ru");
}

export default function NotificationsPage() {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchNotifications = useCallback(async (p: number, append = false) => {
        try {
            setError(false);
            const res = await authService.getNotifications(p, 20);
            if (append) {
                setNotifications(prev => [...prev, ...res.notifications]);
            } else {
                setNotifications(res.notifications);
            }
            setUnreadCount(res.unread_count);
            setHasMore(res.notifications.length === 20);
        } catch (e) {
            console.error(e);
            if (!append) setError(true);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthed) return;
        let cancelled = false;
        fetchNotifications(1).then(() => {
            if (cancelled) return;
        });
        return () => { cancelled = true; };
    }, [fetchNotifications, isAuthed]);

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const next = page + 1;
        setPage(next);
        fetchNotifications(next, true);
    };

    const handleMarkAllRead = async () => {
        try {
            await authService.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    const handleTap = async (n: Notification) => {
        if (!n.is_read) {
            authService.markNotificationRead(n.id).catch((e) => console.warn('Operation failed:', e));
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        if (n.action_url) {
            router.push(n.action_url);
        }
    };

    if (isChecking || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return <ErrorState onRetry={() => fetchNotifications(1)} />;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold">Уведомления</h1>
                            {unreadCount > 0 && (
                                <p className="text-xs text-slate-500">{unreadCount} непрочитанных</p>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 text-xs text-slate-400 hover:text-white transition"
                        >
                            <CheckCheck size={14} />
                            Прочитать все
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Bell size={32} className="text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">Пока пусто</h3>
                    <p className="text-sm text-slate-500">Уведомления появятся здесь</p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {notifications.map((n, i) => {
                        const iconData = ICON_MAP[n.type] || ICON_MAP.system;
                        const Icon = iconData.icon;
                        return (
                            <motion.button
                                key={n.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                onClick={() => handleTap(n)}
                                className={`w-full flex items-start gap-3 px-4 py-4 text-left transition hover:bg-white/5 ${
                                    !n.is_read ? "bg-white/[0.02]" : ""
                                }`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-full ${iconData.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                    <Icon size={18} className={iconData.color} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-semibold truncate ${!n.is_read ? "text-white" : "text-slate-300"}`}>
                                            {n.title}
                                        </span>
                                        {!n.is_read && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                                    <span className="text-[10px] text-slate-600 mt-1 block">{timeAgo(n.created_at)}</span>
                                </div>

                                {/* Thumbnail */}
                                {n.image_url && (
                                    <img
                                        src={n.image_url}
                                        alt={n.title || 'Аватар'}
                                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                    />
                                )}
                            </motion.button>
                        );
                    })}

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center py-6">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="px-6 py-2 rounded-full bg-white/5 text-sm text-slate-400 hover:text-white transition disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    "Загрузить ещё"
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
