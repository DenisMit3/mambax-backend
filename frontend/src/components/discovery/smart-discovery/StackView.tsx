'use client';

import React from 'react';
import { motion, MotionValue, AnimationControls, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Zap, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { User } from './types';
import { formatLastSeen } from './utils';

interface StackViewProps {
    currentProfile: User;
    nextProfile: User | null;
    onStartChat?: (userId: string) => void;
    onExpandProfile: (user: User) => void;
    swipe: (direction: 'left' | 'right' | 'up') => void;
    handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: import('framer-motion').PanInfo) => void;
    // Motion values
    x: MotionValue<number>;
    y: MotionValue<number>;
    rotate: MotionValue<number>;
    rotateX: MotionValue<number>;
    rotateY: MotionValue<number>;
    nextCardScale: MotionValue<number>;
    nextCardOpacity: MotionValue<number>;
    controls: AnimationControls;
    likeOpacity: MotionValue<number>;
    nopeOpacity: MotionValue<number>;
    likeScale: MotionValue<number>;
    nopeScale: MotionValue<number>;
}

export function StackView({
    currentProfile,
    nextProfile,
    onStartChat,
    onExpandProfile,
    swipe,
    handleDragEnd,
    x, y, rotate, rotateX, rotateY,
    nextCardScale, nextCardOpacity,
    controls,
    likeOpacity, nopeOpacity,
    likeScale, nopeScale,
}: StackViewProps) {
    return (
        <div className="absolute top-0 left-0 right-0 bottom-2 z-10 w-full">
            <AnimatePresence>
                {/* Next Card (Background) */}
                {nextProfile && (
                    <motion.div
                        className="absolute inset-0 bg-zinc-800 m-2 mt-2 rounded-[32px] overflow-hidden origin-center -z-10 pointer-events-none will-change-transform"
                        style={{
                            scale: nextCardScale,
                            opacity: nextCardOpacity,
                            transform: 'translateZ(0)'
                        }}
                    >
                        <Image
                            src={nextProfile.photos?.[0] || FALLBACK_AVATAR}
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
                    {/* Blurred Background */}
                    <div className="absolute inset-0 w-full h-full">
                        <Image
                            src={currentProfile.photos?.[0] || FALLBACK_AVATAR}
                            className="w-full h-full object-cover blur-3xl opacity-40 pointer-events-none"
                            alt=""
                            aria-hidden="true"
                            fill
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-black/30" />
                    </div>

                    {/* Main Photo */}
                    <div className="relative w-full h-full flex items-center justify-center z-10">
                        <Image
                            src={currentProfile.photos?.[0] || FALLBACK_AVATAR}
                            className="w-full h-full object-contain shadow-2xl pointer-events-none select-none drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                            alt={currentProfile.name}
                            draggable={false}
                            loading="eager"
                            fill
                            unoptimized
                        />
                    </div>

                    {/* Gradient Overlay */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-auto z-20 cursor-pointer"
                        onClick={() => onExpandProfile(currentProfile)}
                    />

                    {/* Swipe Feedback */}
                    <motion.div
                        style={{ opacity: likeOpacity, scale: likeScale }}
                        className="absolute top-24 left-10 pointer-events-none z-40"
                    >
                        <div className="border-8 border-green-500 rounded-2xl px-6 py-2 -rotate-12 bg-black/20 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                            <span className="text-green-500 font-black text-5xl uppercase tracking-tighter">YES!</span>
                        </div>
                    </motion.div>
                    <motion.div
                        style={{ opacity: nopeOpacity, scale: nopeScale }}
                        className="absolute top-24 right-10 pointer-events-none z-40"
                    >
                        <div className="border-8 border-red-500 rounded-2xl px-6 py-2 rotate-12 bg-black/20 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                            <span className="text-red-500 font-black text-5xl uppercase tracking-tighter">NOPE</span>
                        </div>
                    </motion.div>

                    {/* Content Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-24 pointer-events-none z-30">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl font-bold text-white drop-shadow-md leading-none">
                                {currentProfile.name}, {currentProfile.age}
                            </h2>
                            {currentProfile.is_online && (
                                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,1)] ring-1 ring-black/20" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                            <span>{currentProfile.is_online ? 'Онлайн' : formatLastSeen(currentProfile.last_seen)}</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <span>{Math.round(currentProfile.distance || 1)} км</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-white/60 text-xs font-semibold uppercase tracking-widest cursor-pointer hover:text-white" onClick={() => onExpandProfile(currentProfile)}>
                            <span>Подробнее</span> <ChevronDown size={14} className="text-white" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="absolute bottom-5 left-4 right-4 flex justify-between items-center z-40 pointer-events-auto">
                        <button
                            aria-label="Message"
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
                            <motion.button
                                aria-label="Like"
                                onClick={() => swipe('right')}
                                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Heart size={28} />
                            </motion.button>
                            <motion.button
                                aria-label="Super Like"
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
        </div>
    );
}
