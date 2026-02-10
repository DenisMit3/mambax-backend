'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, SlidersHorizontal, Zap, Grid, Layers } from 'lucide-react';
import { UserProfile } from '@/services/api';
import { ChevronDown, MapPin, Briefcase, GraduationCap, Ruler, Baby, Cigarette, Wine, Star as StarIcon, X } from 'lucide-react'; // Added icons for profile details
import Image from 'next/image'; // PERF-017: Optimized images

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
    const [viewMode, setViewMode] = useState<'stack' | 'grid'>('stack');
    const [expandedProfile, setExpandedProfile] = useState<User | null>(null); // New state for extended profile
    const [lastDirection, setLastDirection] = useState<'left' | 'right' | 'up' | null>(null);

    // Top card motion values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // 3D Tilt Effect
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const rotateY = useTransform(x, [-200, 200], [-10, 10]);
    const rotateX = useTransform(y, [-200, 200], [10, -10]);

    // Elastic Card Stack - scale up next card as top card is dragged
    const nextCardScale = useTransform(x, [-200, 0, 200], [1, 0.95, 1], { clamp: false });
    const nextCardOpacity = useTransform(x, [-200, 0, 200], [0.8, 0.6, 0.8]);

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

    // PERF-010: Мемоизация swipe функции (должна быть объявлена ДО handleDragEnd)
    const swipe = useCallback(async (direction: 'left' | 'right' | 'up') => {
        if (!currentProfile || isAnimating) return;

        setLastDirection(direction);
        setIsAnimating(true);

        let targetX = 0;
        let targetY = 0;
        let rotateEnd = 0;

        // If extended profile is open, close it first (though swipe usually happens on the card itself)
        if (expandedProfile) setExpandedProfile(null);

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
    }, [currentProfile, isAnimating, expandedProfile, onSwipe, controls]);

    // PERF-010: Мемоизация handleDragEnd
    const handleDragEnd = useCallback(async (event: any, info: PanInfo) => {
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
    }, [isAnimating, swipe, controls]);

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
                <button
                    onClick={() => setViewMode(prev => prev === 'stack' ? 'grid' : 'stack')}
                    className="w-8 h-8 flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform bg-white/10 backdrop-blur rounded-full"
                >
                    {viewMode === 'stack' ? <Grid size={18} /> : <Layers size={18} />}
                </button>
                <h1 className="text-xl font-bold text-white tracking-wide drop-shadow-md">
                    {viewMode === 'stack' ? 'Знакомства' : 'Сканнер'}
                </h1>
                <button
                    onClick={() => { }} // Hook up filter later
                    className="w-8 h-8 flex items-center justify-center text-white pointer-events-auto active:scale-95 transition-transform"
                >
                    <SlidersHorizontal size={24} />
                </button>
            </header>

            {/* --- Card Stack Container --- */}
            {/* Constrain bottom only slightly to keep photo area maximized */}
            {/* --- Content Area --- */}
            {viewMode === 'grid' ? (
                // --- GRID VIEW (Scanner Mode) ---
                <div className="absolute top-16 left-0 right-0 bottom-20 overflow-y-auto p-2 scrollbar-hide z-20">
                    <div className="grid grid-cols-2 gap-2 pb-20">
                        {activeUsers.map((user) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="aspect-[3/4] relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 active:scale-95 transition-transform"
                                onClick={() => {
                                    // Logic to jump to this user in stack or open profile
                                    // For now, let's switch back to stack with this user focused
                                    const idx = activeUsers.findIndex(u => u.id === user.id);
                                    if (idx !== -1) setCurrentIndex(idx);
                                    setViewMode('stack');
                                }}
                            >
                                {/* PERF-017: Optimized grid images */}
                                <Image 
                                    src={user.photos?.[0] || '/placeholder.jpg'} 
                                    alt={user.name || ''}
                                    fill
                                    sizes="(max-width: 768px) 50vw, 200px"
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-2 left-3 text-white">
                                    <h3 className="font-bold text-sm leading-tight">{user.name}, {user.age}</h3>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <div className="relative">
                                            <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-500'}`} />
                                            {user.is_online && (
                                                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
                                            )}
                                        </div>
                                        <span className="text-[10px] opacity-70">{user.is_online ? 'Live Now' : 'Offline'}</span>
                                    </div>
                                </div>
                                {user.is_verified && (
                                    <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-0.5">
                                        <Zap size={10} className="text-white fill-white" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                // --- STACK VIEW ---
                <div className="absolute top-0 left-0 right-0 bottom-2 z-10 w-full">
                    <AnimatePresence>
                        {/* Next Card (Background) - Elastic Stack Effect */}
                        {nextProfile && (
                            <motion.div
                                className="absolute inset-0 bg-zinc-800 m-2 mt-2 rounded-[32px] overflow-hidden origin-center -z-10 pointer-events-none will-change-transform"
                                style={{
                                    scale: nextCardScale,
                                    opacity: nextCardOpacity,
                                    transform: 'translateZ(0)' // PERF-004: Force GPU layer
                                }}
                            >
                                <Image
                                    src={nextProfile.photos?.[0] || '/placeholder.jpg'}
                                    alt={nextProfile.name || ''}
                                    fill
                                    sizes="100vw"
                                    className="object-cover"
                                    priority={false}
                                />
                            </motion.div>
                        )}

                        {/* Current Card (Draggable) */}
                        <motion.div
                            key={currentProfile.id}
                            className="absolute inset-0 bg-zinc-900 m-2 mt-2 rounded-[32px] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing border border-white/5 preserve-3d will-change-transform"
                            style={{ x, y, rotate, rotateX, rotateY, perspective: 1000, transform: 'translateZ(0)' }}
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
                            {/* Valid Mamba-style Overlay (Gradient Bottom) */}
                            <div
                                className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-auto z-20 cursor-pointer"
                                onClick={() => setExpandedProfile(currentProfile)}
                            />

                            {/* Swipe Feedback - SLAM ANIMATION */}
                            <motion.div
                                style={{ opacity: likeOpacity, scale: useTransform(x, [0, 150], [1.5, 1]) }}
                                className="absolute top-24 left-10 pointer-events-none z-40"
                            >
                                <div className="border-8 border-green-500 rounded-2xl px-6 py-2 -rotate-12 bg-black/20 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                                    <span className="text-green-500 font-black text-5xl uppercase tracking-tighter">YES!</span>
                                </div>
                            </motion.div>
                            <motion.div
                                style={{ opacity: nopeOpacity, scale: useTransform(x, [0, -150], [1.5, 1]) }}
                                className="absolute top-24 right-10 pointer-events-none z-40"
                            >
                                <div className="border-8 border-red-500 rounded-2xl px-6 py-2 rotate-12 bg-black/20 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                                    <span className="text-red-500 font-black text-5xl uppercase tracking-tighter">NOPE</span>
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
                                <div className="mt-2 flex items-center gap-1 text-white/60 text-xs font-semibold uppercase tracking-widest cursor-pointer hover:text-white" onClick={() => setExpandedProfile(currentProfile)}>
                                    <span>Подробнее</span> <ChevronDown size={14} className="text-white" />
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
                                    <motion.button
                                        onClick={() => swipe('right')}
                                        className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <Heart size={28} />
                                    </motion.button>
                                    {/* Super/Action */}
                                    <motion.button
                                        onClick={() => swipe('up')}
                                        className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                                        animate={{
                                            boxShadow: ["0 0 20px rgba(255,75,145,0.3)", "0 0 40px rgba(255,75,145,0.6)", "0 0 20px rgba(255,75,145,0.3)"]
                                        }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        <Zap size={32} fill="white" />
                                    </motion.button>
                                </div>
                            </div>

                        </motion.div>
                    </AnimatePresence>

                    {/* --- EXTENDED PROFILE OVERLAY --- */}
                    <AnimatePresence>
                        {expandedProfile && (
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={0.2}
                                onDragEnd={(e, { offset, velocity }) => {
                                    if (offset.y > 100 || velocity.y > 100) {
                                        setExpandedProfile(null);
                                    }
                                }}
                                className="absolute inset-0 z-50 bg-black overflow-y-auto scrollbar-hide"
                            >
                                {/* Close Button / Drag Handle */}
                                <div className="absolute top-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
                                    <div className="w-12 h-1.5 bg-white/20 rounded-full backdrop-blur-md" />
                                </div>
                                <button
                                    onClick={() => setExpandedProfile(null)}
                                    className="absolute top-4 right-4 w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center z-50 text-white"
                                >
                                    <ChevronDown className="rotate-180" />
                                </button>

                                {/* Main Photo (Parallax-ish) */}
                                <div className="relative h-[60vh] w-full">
                                    <img
                                        src={expandedProfile.photos?.[0] || '/placeholder.jpg'}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                    <div className="absolute bottom-0 left-0 p-6 w-full">
                                        <h1 className="text-4xl font-bold text-white mb-2">{expandedProfile.name}, {expandedProfile.age}</h1>
                                        <div className="flex items-center space-x-2 text-white/80">
                                            <div className={`w-2 h-2 rounded-full ${expandedProfile.is_online ? 'bg-green-500' : 'bg-gray-500'}`} />
                                            <span>{expandedProfile.is_online ? 'Онлайн' : formatLastSeen(expandedProfile.last_seen)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Content */}
                                <div className="px-6 py-8 space-y-8 pb-32">
                                    {/* Bio */}
                                    {expandedProfile.bio && (
                                        <div>
                                            <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">О себе</h3>
                                            <p className="text-white text-lg leading-relaxed font-medium">{expandedProfile.bio}</p>
                                        </div>
                                    )}

                                    {/* Tags/Interests */}
                                    <div>
                                        <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Интересы</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {['Спорт', 'Путешествия', 'Музыка', 'IT'].map(tag => ( // Mock tags if missing
                                                <span key={tag} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white text-sm font-semibold">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                            <Ruler className="text-blue-400" />
                                            <div>
                                                <p className="text-white/50 text-xs">Рост</p>
                                                <p className="text-white font-bold">175 см</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                            <Briefcase className="text-purple-400" />
                                            <div>
                                                <p className="text-white/50 text-xs">Работа</p>
                                                <p className="text-white font-bold">Дизайнер</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                            <GraduationCap className="text-yellow-400" />
                                            <div>
                                                <p className="text-white/50 text-xs">Образование</p>
                                                <p className="text-white font-bold">Высшее</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                                            <MapPin className="text-red-400" />
                                            <div>
                                                <p className="text-white/50 text-xs">Расстояние</p>
                                                <p className="text-white font-bold">{Math.round(expandedProfile.distance || 0)} км</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* More Photos */}
                                    <div className="space-y-4">
                                        {expandedProfile.photos?.slice(1).map((photo, i) => (
                                            <img key={i} src={photo} className="w-full rounded-3xl" alt="" />
                                        ))}
                                    </div>
                                </div>

                                {/* Floating Action Bar (Sticky Bottom) */}
                                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex justify-center gap-6 z-50 pointer-events-auto">
                                    <button onClick={() => { setExpandedProfile(null); swipe('left'); }} className="w-16 h-16 rounded-full bg-black/50 border border-red-500/50 flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors">
                                        <X size={32} />
                                    </button>
                                    <button onClick={() => { setExpandedProfile(null); swipe('up'); }} className="w-14 h-14 rounded-full bg-black/50 border border-blue-500/50 flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors mt-2">
                                        <StarIcon size={24} />
                                    </button>
                                    <button onClick={() => { setExpandedProfile(null); swipe('right'); }} className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff4b91] to-[#ff9e4a] flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform">
                                        <Heart size={32} fill="white" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
