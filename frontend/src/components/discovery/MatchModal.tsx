'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Heart, X, Sparkles } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useSoundService } from '@/hooks/useSoundService';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ContextualTooltip } from '@/components/onboarding/ContextualTooltip';
import { FALLBACK_AVATAR } from '@/lib/constants';

interface MatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartChat: () => void;
    userAvatar?: string;
    matchAvatar?: string;
    matchName: string;
}

export const MatchModal = ({
    isOpen,
    onClose,
    onStartChat,
    userAvatar,
    matchAvatar,
    matchName
}: MatchModalProps) => {
    const haptic = useHaptic();
    const soundService = useSoundService();

    useEffect(() => {
        if (isOpen) {
            haptic.success();
            soundService.playMatch();
        }
    }, [isOpen, haptic, soundService]);

    const prefersReducedMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Background Particles / Effects - Disable on reduced motion */}
                    {!prefersReducedMotion && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full bg-pink-500/30"
                                    initial={{
                                        x: Math.random() * 100 + '%',
                                        y: Math.random() * 100 + '%',
                                        scale: 0
                                    }}
                                    animate={{
                                        y: [null, '-20%'],
                                        scale: [0, 1, 0],
                                        opacity: [0, 1, 0]
                                    }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 2
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <div className="relative w-full max-w-sm flex flex-col items-center text-center">
                        <motion.button
                            onClick={onClose}
                            className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white"
                            whileTap={{ scale: 0.9 }}
                        >
                            <X size={24} />
                        </motion.button>

                        {/* Title Section */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-500 text-xs font-black uppercase tracking-widest mb-4">
                                <Sparkles size={14} />
                                Connection Established
                            </div>
                            <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter leading-tight mb-2">
                                It's a <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">Match!</span>
                            </h2>
                            <p className="text-gray-400 text-sm mb-12">
                                Вы и {matchName} понравились друг другу
                            </p>
                        </motion.div>

                        {/* Avatars Section */}
                        <div className="relative flex items-center justify-center gap-4 mb-16">
                            <motion.div
                                className="relative z-10 w-28 h-28 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                initial={{ x: -100, opacity: 0, rotate: -10 }}
                                animate={{ x: 0, opacity: 1, rotate: -5 }}
                                transition={{ type: 'spring', damping: 12, delay: 0.3 }}
                            >
                                <Image src={userAvatar || FALLBACK_AVATAR} alt="You" loading="lazy" className="w-full h-full object-cover" fill sizes="128px" />
                            </motion.div>

                            <motion.div
                                className="absolute z-20 w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.6 }}
                            >
                                <Heart size={24} fill="white" />
                            </motion.div>

                            <motion.div
                                className="relative z-10 w-28 h-28 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                initial={{ x: 100, opacity: 0, rotate: 10 }}
                                animate={{ x: 0, opacity: 1, rotate: 5 }}
                                transition={{ type: 'spring', damping: 12, delay: 0.3 }}
                            >
                                <Image src={matchAvatar || FALLBACK_AVATAR} alt={matchName} loading="lazy" className="w-full h-full object-cover" fill sizes="128px" />
                            </motion.div>

                            {/* Neon Pulse Rings */}
                            <motion.div
                                className="absolute inset-0 z-0 border-2 border-pink-500/30 rounded-full scale-150"
                                animate={{ scale: [1.2, 2], opacity: [0.5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        </div>

                        {/* Actions */}
                        <div className="w-full space-y-4">
                            <motion.button
                                onClick={onStartChat}
                                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 active:scale-95 transition-all"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                            >
                                <MessageCircle size={20} fill="black" />
                                Написать сообщение
                            </motion.button>

                            <motion.button
                                onClick={onClose}
                                className="w-full py-4 bg-white/5 text-white font-bold uppercase tracking-widest rounded-2xl hover:bg-white/10 active:scale-95 transition-all"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.9 }}
                            >
                                Продолжать поиск
                            </motion.button>
                        </div>
                    </div>

                    {/* Contextual Tooltip при первом матче */}
                    <ContextualTooltip
                        stepId="first_match_achieved"
                        title="Поздравляем с первым матчем!"
                        message="Начни диалог с icebreaker или отправь голосовое сообщение"
                        trigger="auto"
                        delay={2000}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
