'use client';

import { motion } from 'framer-motion';
import { Eye, Heart, Crown } from 'lucide-react';
import Image from 'next/image';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatTime } from './utils';
import type { LikedUser } from './types';

interface LikedUsersGridProps {
    likedUsers: LikedUser[];
    isPremium: boolean;
    onInstantMatch: (userId: string) => void;
    onUpgradeToPremium: () => void;
}

export function LikedUsersGrid({ likedUsers, isPremium, onInstantMatch, onUpgradeToPremium }: LikedUsersGridProps) {
    const prefersReducedMotion = useReducedMotion();
    const totalLikesCount = likedUsers.length;

    return (
        <motion.div
            key="likes"
            className="h-full p-4 overflow-y-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            <motion.h3
                className="text-lg font-bold text-white mb-4 flex items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Eye className="w-5 h-5 mr-2 text-purple-400" />
                Кто поставил лайк
            </motion.h3>

            {!isPremium && totalLikesCount > 0 ? (
                <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <GlassCard className="p-8 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-500/20 backdrop-blur-sm" />
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                        />
                        <div className="relative z-10">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                            </motion.div>
                            <h4 className="text-2xl font-bold text-white mb-2">
                                {totalLikesCount} {totalLikesCount === 1 ? 'человек лайкнул' : 'людей лайкнули'} вас!
                            </h4>
                            <p className="text-gray-300 mb-6 leading-relaxed">
                                Получите Premium, чтобы увидеть кто это и начать общение прямо сейчас
                            </p>
                            <AnimatedButton
                                onClick={onUpgradeToPremium}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black font-bold px-8 py-3"
                            >
                                <Crown className="w-5 h-5 mr-2" />
                                Разблокировать Premium
                            </AnimatedButton>
                        </div>
                    </GlassCard>
                </motion.div>
            ) : null}

            <motion.div
                className="grid grid-cols-2 gap-4"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: {
                            staggerChildren: prefersReducedMotion ? 0 : 0.1
                        }
                    }
                }}
                initial="hidden"
                animate="show"
            >
                {likedUsers.map((user) => (
                    <motion.div
                        key={user.id}
                        variants={{
                            hidden: { opacity: 0, scale: 0.8 },
                            show: { opacity: 1, scale: 1 }
                        }}
                    >
                        <GlassCard
                            className={`aspect-[3/4] p-4 cursor-pointer relative overflow-hidden ${!isPremium ? 'blur-sm' : ''}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-3xl" />
                            <Image
                                src={user.photo}
                                alt={isPremium ? user.name : 'Hidden'}
                                fill
                                className="object-cover rounded-2xl"
                                sizes="(max-width: 768px) 50vw, 33vw"
                            />
                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                <p className="text-white font-semibold text-sm mb-1">
                                    {isPremium ? `${user.name}, ${user.age}` : '???'}
                                </p>
                                <p className="text-gray-300 text-xs mb-3">
                                    {formatTime(user.likedAt)} назад
                                </p>
                                {isPremium && user.canInstantMatch && (
                                    <AnimatedButton
                                        onClick={() => onInstantMatch(user.id)}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs py-2"
                                        size="sm"
                                    >
                                        Instant Match
                                    </AnimatedButton>
                                )}
                            </div>
                            <div className="absolute top-4 right-4 z-10">
                                <motion.div
                                    className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <Heart className="w-4 h-4 text-white fill-white" />
                                </motion.div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
}
