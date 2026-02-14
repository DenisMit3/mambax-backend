'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Zap, Target } from 'lucide-react';  // FIX: Removed unused imports

import { useTelegram } from '@/lib/telegram';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

// FIX (UX): Deterministic hash for stable values between re-renders
const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

export interface RadarUser {
    id: string;
    photo: string;
    name: string;
    distance: number;
    angle?: number; // Optional for external data
    isOnline: boolean;
}

interface GeoMapRadarProps {
    users?: RadarUser[];
    loading?: boolean;
}

export const GeoMapRadar = ({ users = [], loading = false }: GeoMapRadarProps) => {
    const { hapticFeedback } = useTelegram();
    const [isScanning, setIsScanning] = useState(loading);
    const [discoveredUsers, setDiscoveredUsers] = useState<RadarUser[]>([]);

    useEffect(() => {
        setIsScanning(loading);
        if (!loading && users.length > 0) {
            // FIX (UX): Use deterministic angles/distances based on user ID
            const radialUsers = users.map((u, idx) => {
                const userHash = hashCode(u.id || `user-${idx}`);
                return {
                    id: u.id,
                    name: u.name,
                    photo: u.photos?.[0] || FALLBACK_AVATAR,
                    distance: u.distance || ((userHash % 50) / 10).toFixed(1),  // 0-5km based on hash
                    angle: (idx * (360 / users.length)) + (userHash % 20),  // Stable angle offset
                    isOnline: u.is_online
                };
            });
            setDiscoveredUsers(radialUsers);
            hapticFeedback?.notificationOccurred?.('success');
        }
    }, [loading, users, hapticFeedback]);

    const handleRescan = useCallback(() => {
        setIsScanning(true);
        setDiscoveredUsers([]);
        hapticFeedback?.impactOccurred?.('heavy');
        setTimeout(() => setIsScanning(false), 3000); // UI re-scan simulation
    }, [hapticFeedback]);

    return (
        <div className="flex flex-col h-full overflow-hidden relative z-20">
            {/* Background Grid Pattern - lighter */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #444 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            {/* Header */}
            <motion.div
                className="p-6 relative z-10"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-white mb-1 tracking-tight">РАДАР</h1>
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 ${isScanning ? 'bg-blue-500 animate-ping' : 'bg-green-500'} rounded-full`} />
                            <span className="text-gray-400 text-[10px] font-mono uppercase tracking-[0.2em]">
                                {isScanning ? 'СКАНИРОВАНИЕ ЧАСТОТ...' : 'СКАНИРОВАНИЕ ЗАВЕРШЕНО'}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Radar Main Content */}
            <div className="flex-1 flex items-center justify-center p-4 relative">
                <div className="relative w-full aspect-square max-w-sm rounded-full bg-black/40 border border-white/10 flex items-center justify-center shadow-[0_0_80px_rgba(0,0,0,0.8)]">

                    {/* Concentric Circles */}
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="absolute border border-white/5 rounded-full"
                            style={{ width: `${i * 33}%`, height: `${i * 33}%` }}
                        />
                    ))}

                    {/* Compass Lines */}
                    <div className="absolute inset-0 border-x border-white/5" />
                    <div className="absolute inset-0 border-y border-white/5" />

                    {/* Radar Sweep Animation */}
                    <AnimatePresence>
                        {isScanning && (
                            <motion.div
                                className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-red/0 via-primary-red/0 to-primary-red/20 shadow-[0_0_30px_rgba(255,59,48,0.2)]"
                                style={{ originX: 0.5, originY: 0.5 }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Current User Center Pulse */}
                    <div className="relative z-20">
                        <motion.div
                            className="w-14 h-14 rounded-full border-2 border-primary-red p-1 bg-black shadow-[0_0_20px_rgba(255,59,48,0.5)]"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden">
                                <MapPin className="w-full h-full p-3 text-primary-red" />
                            </div>
                        </motion.div>
                        <motion.div
                            className="absolute inset-0 bg-primary-red/20 rounded-full"
                            animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>

                    {/* Discovered Users */}
                    {discoveredUsers.map((user, idx) => {
                        const radius = Math.min(90, (user.distance / 10) * 100 + 30);
                        const angle = user.angle || 0;
                        const x = Math.cos((angle * Math.PI) / 180) * radius;
                        const y = Math.sin((angle * Math.PI) / 180) * radius;

                        return (
                            <motion.div
                                key={user.id}
                                className="absolute z-10"
                                style={{
                                    left: `calc(50% + ${x}px)`,
                                    top: `calc(50% + ${y}px)`,
                                    marginLeft: '-16px',
                                    marginTop: '-16px'
                                }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: idx * 0.1, type: 'spring' }}
                            >
                                <div className="relative group">
                                    <motion.div
                                        className="w-8 h-8 rounded-full border-2 border-primary-red/50 overflow-hidden bg-black shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                        whileHover={{ scale: 1.5, borderColor: '#FF3B30' }}
                                        onClick={() => hapticFeedback.selection()}
                                    >
                                        <Image src={user.photo} className="w-full h-full object-cover" alt={`${user.name} profile`} fill unoptimized />
                                    </motion.div>
                                    {user.isOnline && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse" />
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Controls Card */}
            <motion.div
                className="p-6 relative z-10"
                initial={{ y: 100 }}
                animate={{ y: 0 }}
            >
                <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1 opacity-60">РАДИУС СКАНИРОВАНИЯ: 10 КМ</p>
                            <h3 className="text-white text-xl font-bold">
                                {isScanning ? 'ПОИСК ЦЕЛЕЙ...' : `СИГНАЛОВ НАЙДЕНО: ${discoveredUsers.length}`}
                            </h3>
                        </div>
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            className="w-12 h-12 rounded-full bg-white/5"
                            onClick={handleRescan}
                            disabled={isScanning}
                        >
                            <RefreshCcw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
                        </AnimatedButton>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                            <div className="flex items-center space-x-2 text-primary-red mb-2 opacity-80">
                                <Zap className="w-4 h-4 fill-primary-red" />
                                <span className="text-[10px] font-black uppercase tracking-widest">БУСТ</span>
                            </div>
                            <p className="text-white text-md font-mono">АКТИВЕН</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                            <div className="flex items-center space-x-2 text-white mb-2 opacity-80">
                                <Target className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">ЗАЩИТА</span>
                            </div>
                            <p className="text-white text-md font-mono">ВКЛЮЧЕНА</p>
                        </div>
                    </div>

                    <AnimatedButton
                        className="w-full bg-primary-red shadow-[0_10px_30px_rgba(255,59,48,0.3)]"
                        onClick={() => hapticFeedback.impactOccurred('medium')}
                    >
                        НАЧАТЬ ТРАНСЛЯЦИЮ
                    </AnimatedButton>
                </GlassCard>
            </motion.div>
        </div>
    );
};

const RefreshCcw = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
);
