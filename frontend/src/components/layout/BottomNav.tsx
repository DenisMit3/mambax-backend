'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Heart, Layers, MessageCircle, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';
import { wsService } from '@/services/websocket';
import { notificationsApi } from '@/services/api/notifications';

export function BottomNav() {
    const pathname = usePathname();
    const haptic = useHaptic();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count on mount
    useEffect(() => {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        if (!token) return;

        notificationsApi.getUnreadCount()
            .then((res) => setUnreadCount(res?.unread_count || 0))
            .catch(() => {});
    }, [pathname]);

    // Listen for real-time notification events to bump badge
    useEffect(() => {
        const handleNewNotification = () => {
            setUnreadCount(prev => prev + 1);
        };
        const handleNotificationsRead = () => {
            setUnreadCount(0);
        };

        wsService.on("new_like", handleNewNotification);
        wsService.on("new_match", handleNewNotification);
        wsService.on("gift_received", handleNewNotification);
        wsService.on("notifications_read", handleNotificationsRead);

        return () => {
            wsService.off("new_like", handleNewNotification);
            wsService.off("new_match", handleNewNotification);
            wsService.off("gift_received", handleNewNotification);
            wsService.off("notifications_read", handleNotificationsRead);
        };
    }, []);

    // FIX (A11Y): Added aria-labels for screen readers
    const navItems = [
        { name: 'Search', href: '/search', icon: Search, ariaLabel: 'Поиск' },
        { name: 'Likes', href: '/likes', icon: Heart, ariaLabel: 'Симпатии' },
        { name: 'Discover', href: '/', icon: Layers, ariaLabel: 'Главная' },
        { name: 'Chat', href: '/chat', icon: MessageCircle, ariaLabel: 'Чаты' },
        { name: 'Notifications', href: '/notifications', icon: Bell, ariaLabel: 'Уведомления', badge: unreadCount },
    ];

    return (
        <div className="w-full bg-[#1a1a1e] backdrop-blur-xl border-t border-white/15 pb-safe pt-2 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] rounded-t-[2rem]">
            <div className="flex justify-between items-center h-16 max-w-md mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            aria-label={item.ariaLabel}
                            className="relative flex flex-col items-center justify-center w-14 h-14"
                            onClick={() => {
                                if (isActive) {
                                    haptic.selection();
                                } else {
                                    haptic.light();
                                }
                            }}
                        >
                            {/* Active Liquid Glow Background */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-glow"
                                    className="absolute inset-1 bg-gradient-to-tr from-[#ff4b91]/20 to-[#ff9e4a]/20 rounded-2xl -z-10 blur-sm"
                                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                />
                            )}

                            {/* Icon Animation */}
                            <motion.div
                                whileTap={{ scale: 0.8 }}
                                animate={{
                                    y: isActive ? -4 : 0,
                                    scale: isActive ? 1.2 : 1
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                className="relative"
                            >
                                <Icon
                                    size={24}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={`transition-colors duration-300 ${isActive
                                        ? 'text-[#ff4b91] drop-shadow-[0_0_12px_rgba(255,75,145,0.8)]'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                />
                                {/* Unread badge */}
                                {'badge' in item && (item as any).badge > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#ff4b91] text-white text-[10px] font-bold rounded-full px-1 shadow-[0_0_8px_rgba(255,75,145,0.6)]">
                                        {(item as any).badge > 99 ? '99+' : (item as any).badge}
                                    </span>
                                )}
                            </motion.div>

                            {/* Glowing Active Dot */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-dot"
                                    className="absolute bottom-2 w-1.5 h-1.5 bg-gradient-to-r from-[#ff4b91] to-[#ff9e4a] rounded-full shadow-[0_0_10px_#ff4b91]"
                                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
