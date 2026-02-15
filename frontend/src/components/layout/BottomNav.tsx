'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Heart, Layers, MessageCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';

export function BottomNav() {
    const pathname = usePathname();
    const haptic = useHaptic();

    // FIX (A11Y): Added aria-labels for screen readers
    const navItems = [
        { name: 'Search', href: '/search', icon: Search, ariaLabel: 'Поиск' },
        { name: 'Likes', href: '/likes', icon: Heart, ariaLabel: 'Симпатии' },
        { name: 'Discover', href: '/', icon: Layers, ariaLabel: 'Главная' },
        { name: 'Chat', href: '/chat', icon: MessageCircle, ariaLabel: 'Чаты' },
        { name: 'Profile', href: '/profile', icon: User, ariaLabel: 'Профиль' },
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
