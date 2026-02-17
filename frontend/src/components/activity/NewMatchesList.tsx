'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import Image from 'next/image';
import { GlassCard } from '@/components/ui/GlassCard';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Match } from './types';

interface NewMatchesListProps {
    matches: Match[];
    onMatchClick: (matchId: string) => void;
}

export function NewMatchesList({ matches, onMatchClick }: NewMatchesListProps) {
    const prefersReducedMotion = useReducedMotion();
    const newMatches = matches.filter(m => m.isNew);

    if (newMatches.length === 0) return null;

    return (
        <div className="p-4">
            <motion.h3
                className="text-lg font-bold text-white mb-4 flex items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Zap className="w-5 h-5 mr-2 text-orange-400" />
                Новые матчи
                <motion.div
                    className="ml-2 w-2 h-2 bg-orange-400 rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
            </motion.h3>

            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                {newMatches.map((match, index) => (
                    <motion.div
                        key={match.id}
                        className="flex-shrink-0"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                            delay: prefersReducedMotion ? 0 : index * 0.1,
                            type: 'spring',
                            stiffness: 300,
                            damping: 20
                        }}
                    >
                        <GlassCard
                            className="w-24 h-32 p-3 cursor-pointer relative overflow-hidden"
                            onClick={() => onMatchClick(match.id)}
                            glow
                        >
                            <motion.div
                                className="absolute inset-0 rounded-3xl border-2 border-orange-400"
                                animate={{
                                    boxShadow: [
                                        '0 0 10px rgba(251, 146, 60, 0.5)',
                                        '0 0 20px rgba(251, 146, 60, 0.8)',
                                        '0 0 10px rgba(251, 146, 60, 0.5)'
                                    ]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-3xl" />
                            <Image
                                src={match.user.photo}
                                alt={match.user.name}
                                fill
                                className="object-cover rounded-2xl"
                                sizes="(max-width: 768px) 33vw, 120px"
                            />
                            <div className="absolute bottom-2 left-2 right-2 z-10">
                                <p className="text-white text-xs font-semibold truncate">
                                    {match.user.name}
                                </p>
                                <p className="text-gray-300 text-xs">
                                    {match.user.age}
                                </p>
                            </div>
                            <motion.div
                                className="absolute top-2 right-2 w-3 h-3 bg-orange-400 rounded-full z-10"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            />
                        </GlassCard>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
