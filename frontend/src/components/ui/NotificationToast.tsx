'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Gift, Star, Zap, Users } from 'lucide-react';
import { wsService } from '@/services/websocket';

interface NotifToast {
    id: string;
    type: string;
    title: string;
    body: string;
    url?: string;
    image?: string;
}

const ICON_MAP: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
    new_like: { icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/20' },
    new_match: { icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    gift_received: { icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    new_message: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    superlike: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    boost: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

const TITLES: Record<string, string> = {
    new_like: 'Новая симпатия ❤️',
    new_match: 'Новый мэтч! 🎉',
    gift_received: 'Подарок! 🎁',
    new_message: 'Новое сообщение',
    superlike: 'Суперлайк ⭐',
    boost: 'Буст активирован 🚀',
};

export function NotificationToast() {
    const router = useRouter();
    const [toasts, setToasts] = useState<NotifToast[]>([]);

    const addToast = useCallback((type: string, data: any) => {
        const id = `${Date.now()}-${Math.random()}`;
        const title = data?.title || TITLES[type] || 'Уведомление';
        const body = data?.body || data?.message || '';
        const url = data?.url || data?.action_url;
        const image = data?.image_url || data?.avatar_url;

        setToasts(prev => [...prev.slice(-2), { id, type, title, body, url, image }]);

        // Auto-dismiss after 4s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    useEffect(() => {
        const events = ['new_like', 'new_match', 'gift_received', 'new_message', 'superlike', 'boost'];
        
        const handler = (data: any) => {
            addToast(data.type, data);
        };

        events.forEach(event => {
            wsService.on(event, handler);
        });

        return () => {
            events.forEach(event => {
                wsService.off(event, handler);
            });
        };
    }, [addToast]);

    const handleTap = (toast: NotifToast) => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
        if (toast.url) {
            router.push(toast.url);
        }
    };

    return (
        <div className="fixed top-4 left-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:max-w-[380px]">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => {
                    const iconData = ICON_MAP[toast.type] || ICON_MAP.new_message;
                    const Icon = iconData.icon;

                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={() => handleTap(toast)}
                            className="pointer-events-auto cursor-pointer bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                        >
                            {toast.image ? (
                                <img src={toast.image} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className={`w-10 h-10 rounded-full ${iconData.bg} flex items-center justify-center flex-shrink-0`}>
                                    <Icon size={18} className={iconData.color} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{toast.title}</p>
                                {toast.body && (
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{toast.body}</p>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
