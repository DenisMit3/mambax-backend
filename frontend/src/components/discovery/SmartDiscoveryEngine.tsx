'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, SlidersHorizontal, Zap } from 'lucide-react';
import { UserProfile } from '@/services/api';

// --- Types ---
interface User extends UserProfile {
    compatibility?: number;
    distance?: number;
    lastSeen?: Date;
    last_seen?: string; // API returns snake_case
    isOnline?: boolean;
    is_online?: boolean; // API returns snake_case
    verificationBadge?: 'verified' | 'premium' | 'none';
}

interface SmartDiscoveryEngineProps {
    users: User[];
    filters: any;
    onSwipe: (userId: string, direction: 'like' | 'pass' | 'superlike') => void;
    onFilterChange: (filters: any) => void;
    onStartChat?: (userId: string) => void;
    isPremium: boolean;
    superLikesLeft: number;
    boostActive: boolean;
    onUpgradeToPremium: () => void;
    onUseBoost: () => void;
}

// Format last seen timestamp to human-readable string
const formatLastSeen = (lastSeen?: string | Date): string => {
    if (!lastSeen) return 'был(а) недавно';

    const now = new Date();
    const date = lastSeen instanceof Date ? lastSeen : new Date(lastSeen);

    if (isNaN(date.getTime())) return 'был(а) недавно';

    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 5) return 'был(а) только что';
    if (diffMins < 60) return `был(а) ${diffMins} мин. назад`;
    if (diffHours < 24) return `был(а) ${diffHours} ч. назад`;
    if (diffDays === 1) return 'был(а) вчера';
    if (diffDays < 7) return `был(а) ${diffDays} дн. назад`;

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

// --- Mock Data for Infinite Demo ---
const DEMO_USERS: any[] = [
    { id: 'demo1', name: 'Арина', age: 19, photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop'], bio: 'Студентка, люблю спонтанные поездки ✈️', distance: 2, is_verified: true, gender: 'female', role: 'user' },
    { id: 'demo2', name: 'Екатерина', age: 25, photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop'], bio: 'Графический дизайнер 🎨 Ищу вдохновение', distance: 5, is_verified: false, gender: 'female', role: 'user' },
    { id: 'demo3', name: 'Максим', age: 31, photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop'], bio: 'Фотограф и путешественник 📸', distance: 1, is_verified: true, gender: 'male', role: 'user' },
];

export function SmartDiscoveryEngine({
    users,
    onSwipe,
    onStartChat,
}: SmartDiscoveryEngineProps) {
    // Falls back to demo users if list is empty
    const activeUsers = (users && users.length > 0) ? users : (DEMO_USERS as User[]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [lastDirection, setLastDirection] = useState<'left' | 'right' | 'up' | null>(null);

    // Top card motion values
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-10, 10]); // Subtle rotation
    const controls = useAnimation();

    // Color/Opacity interpolations
    const likeOpacity = useTransform(x, [50, 150], [0, 1]);
    const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);
    const superLikeOpacity = useTransform(y, [-50, -100], [0, 1]);

    // Infinite Loop Logic: Use modulo operator to cycle through activeUsers
    const safeIndex = activeUsers.length > 0 ? currentIndex % activeUsers.length : 0;
    const currentProfile = activeUsers.length > 0 ? activeUsers[safeIndex] : null;
    const nextProfile = activeUsers.length > 0 ? activeUsers[(safeIndex + 1) % activeUsers.length] : null;

    // Reset index periodically 
    useEffect(() => {
        if (currentIndex >= activeUsers.length * 10 && activeUsers.length > 0) { // Add activeUsers.length > 0 check
            setCurrentIndex(0);
        }
    }, [currentIndex, activeUsers.length]);

    const [isAnimating, setIsAnimating] = useState(false);

    // Reset controls when profile changes
    useEffect(() => {
        x.set(0);
        y.set(0);
        controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
    }, [currentProfile, controls, x, y]);

    const handleDragEnd = async (event: any, info: PanInfo) => {
        if (isAnimating) return;

        const threshold = 100;
        const velocity = info.velocity.x;

        if (info.offset.x > threshold || velocity > 500) {
            await swipe('right');
        } else if (info.offset.x < -threshold || velocity < -500) {
            await swipe('left');
        } else if (info.offset.y < -threshold) {
            await swipe('up');
        } else {
            controls.start({ x: 0, y: 0 });
        }
    };

    const swipe = async (direction: 'left' | 'right' | 'up') => {
        if (!currentProfile || isAnimating) return;

        setLastDirection(direction);
        setIsAnimating(true);

        let targetX = 0;
        let targetY = 0;
        let rotateEnd = 0;

        if (direction === 'right') {
            targetX = window.innerWidth + 100;
            rotateEnd = 20;
            onSwipe(currentProfile.id, 'like');
        } else if (direction === 'left') {
            targetX = -window.innerWidth - 100;
            rotateEnd = -20;
            onSwipe(currentProfile.id, 'pass');
        } else if (direction === 'up') {
            targetY = -window.innerHeight - 100;
            onSwipe(currentProfile.id, 'superlike');
        }

        try {
            await controls.start({
                x: targetX,
                y: targetY,
                rotate: rotateEnd,
                opacity: 0,
                transition: { duration: 0.3, ease: 'easeIn' }
            });
            setCurrentIndex((prev) => prev + 1);
        } catch (e) {
            console.error("Swipe animation error:", e);
            // Even if animation fails, force next card
            setCurrentIndex((prev) => prev + 1);
        } finally {
            setIsAnimating(false);
        }
    };

    if (!currentProfile) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black text-center z-10">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse border border-white/10">
                    <div className="w-10 h-10 border-2 border-white/20 rounded-full" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Никого нет рядом</h3>
                <p className="text-slate-500">Попробуйте изменить настройки поиска.</p>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-black overflow-hidden select-none">
            {/* --- Header Overlay --- */}
            <header className="absolute top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="w-8" />
                <h1 className="text-xl font-bold text-white tracking-wide drop-shadow-md">Знакомства</h1>
                <button
                    onClick={() => { }} // Hook up filter later
                    className="w-8 h-8 flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform"
                >
                    <SlidersHorizontal size={24} />
                </button>
            </header>

            {/* --- Card Stack Container --- */}
            {/* Constrain bottom to 5.5rem (approx 88px) to clear BottomNav completely */}
            <div className="absolute top-0 left-0 right-0 bottom-[5.5rem] z-10 w-full">
                <AnimatePresence>
                    {/* Next Card (Background) - Hidden Stack Effect */}
                    {nextProfile && (
                        <div
                            className="absolute inset-0 bg-zinc-800 m-2 mt-2 rounded-[32px] overflow-hidden opacity-100 scale-[0.95] origin-center -z-10 pointer-events-none"
                        >
                            <img
                                src={nextProfile.photos?.[0] || '/placeholder.jpg'}
                                className="w-full h-full object-cover opacity-60"
                                alt=""
                                loading="lazy"
                            />
                        </div>
                    )}

                    {/* Current Card (Draggable) */}
                    <motion.div
                        key={currentProfile.id}
                        className="absolute inset-0 bg-zinc-900 m-2 mt-2 rounded-[32px] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing border border-white/5"
                        style={{ x, y, rotate }}
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.6}
                        onDragEnd={handleDragEnd}
                        animate={controls}
                    >
                        {/* 1. Blurred Background Layer - Optimized */}
                        <div className="absolute inset-0 w-full h-full">
                            <img
                                src={currentProfile.photos?.[0] || '/placeholder.jpg'}
                                className="w-full h-full object-cover blur-3xl opacity-40 pointer-events-none"
                                alt=""
                                aria-hidden="true"
                            />
                            <div className="absolute inset-0 bg-black/30" />
                        </div>

                        {/* 2. Main Photo - High priority loading */}
                        <div className="relative w-full h-full flex items-center justify-center z-10">
                            <img
                                src={currentProfile.photos?.[0] || '/placeholder.jpg'}
                                className="w-full h-full object-contain shadow-2xl pointer-events-none select-none drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                                alt={currentProfile.name}
                                draggable={false}
                                loading="eager"
                                fetchPriority="high"
                            />
                        </div>

                        {/* Valid Mamba-style Overlay (Gradient Bottom) */}
                        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-20" />

                        {/* Swipe Feedback */}
                        <motion.div style={{ opacity: likeOpacity }} className="absolute top-12 left-10 pointer-events-none z-40">
                            <div className="border-4 border-green-500 rounded-lg px-4 py-1 -rotate-12">
                                <span className="text-green-500 font-black text-3xl uppercase tracking-widest">LIKE</span>
                            </div>
                        </motion.div>
                        <motion.div style={{ opacity: nopeOpacity }} className="absolute top-12 right-10 pointer-events-none z-40">
                            <div className="border-4 border-red-500 rounded-lg px-4 py-1 rotate-12">
                                <span className="text-red-500 font-black text-3xl uppercase tracking-widest">NOPE</span>
                            </div>
                        </motion.div>

                        {/* Content Info (Bottom-Left) */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 pb-24 pointer-events-none z-30">
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-bold text-white drop-shadow-md leading-none">
                                    {currentProfile.name}, {currentProfile.age}
                                </h2>
                                {/* Online Status Indicator */}
                                {currentProfile.is_online && (
                                    <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,1)] ring-1 ring-black/20" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                                <span>{currentProfile.is_online ? 'Онлайн' : formatLastSeen(currentProfile.last_seen)}</span>
                                <span className="w-1 h-1 bg-white/40 rounded-full" />
                                <span>{Math.round(currentProfile.distance || 1)} км</span>
                            </div>
                        </div>

                        {/* Actions (Floating on Card) */}
                        <div className="absolute bottom-5 left-4 right-4 flex justify-between items-center z-40 pointer-events-auto">
                            {/* Message */}
                            <button
                                onClick={() => {
                                    if (currentProfile && onStartChat) {
                                        onStartChat(currentProfile.id);
                                    }
                                }}
                                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                            >
                                <MessageCircle size={28} />
                            </button>

                            <div className="flex gap-4">
                                {/* Like */}
                                <button
                                    onClick={() => swipe('right')}
                                    className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                                >
                                    <Heart size={28} />
                                </button>
                                {/* Super/Action */}
                                <button
                                    onClick={() => swipe('up')}
                                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                                >
                                    <Zap size={32} fill="white" />
                                </button>
                            </div>
                        </div>

                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
