'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Gift, Sparkles, Heart } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';

interface Gift {
    id: string;
    name: string;
    image: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    value: number;
}

interface GiftRevealAnimationProps {
    gift: Gift;
    isOpen: boolean;
    onRevealComplete: () => void;
}

export const GiftRevealAnimation = ({
    gift,
    isOpen,
    onRevealComplete
}: GiftRevealAnimationProps) => {
    const { hapticFeedback } = useTelegram();
    const [stage, setStage] = useState<'closed' | 'opening' | 'revealed'>('closed');
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

    const rarityColors = {
        common: '#8E8E93',
        rare: '#007AFF',
        epic: '#AF52DE',
        legendary: '#FF9500',
    };

    const rarityGradients = {
        common: 'linear-gradient(135deg, #8E8E93 0%, #636366 100%)',
        rare: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
        epic: 'linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%)',
        legendary: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
    };

    useEffect(() => {
        if (isOpen && stage === 'closed') {
            setStage('opening');
            hapticFeedback.heavy();

            // Generate particles
            const newParticles = Array.from({ length: 20 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
            }));
            setParticles(newParticles);

            // Transition to revealed after animation
            setTimeout(() => {
                setStage('revealed');
                hapticFeedback.success();
                setTimeout(onRevealComplete, 2000);
            }, 1500);
        }
    }, [isOpen, stage, hapticFeedback, onRevealComplete]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative">
                {/* Mystery Box */}
                <AnimatePresence>
                    {stage === 'closed' && (
                        <motion.div
                            className="relative"
                            initial={{ scale: 0.8, rotateY: 0 }}
                            animate={{
                                scale: 1,
                                rotateY: [0, 5, -5, 0],
                            }}
                            exit={{
                                scale: 1.2,
                                rotateY: 180,
                                opacity: 0,
                                transition: { duration: 0.8, ease: "easeOut" }
                            }}
                            transition={{
                                duration: 0.8,
                                rotateY: { repeat: Infinity, duration: 2 }
                            }}
                            style={{ perspective: '1000px' }}
                        >
                            <div
                                className="w-32 h-32 rounded-2xl shadow-2xl flex items-center justify-center"
                                style={{
                                    background: rarityGradients[gift.rarity],
                                    boxShadow: `0 0 60px ${rarityColors[gift.rarity]}40`,
                                    transform: 'rotateX(10deg) rotateY(10deg)',
                                }}
                            >
                                <Gift className="w-16 h-16 text-white" strokeWidth={1} />
                            </div>

                            {/* Floating sparkles around box */}
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                        background: rarityColors[gift.rarity],
                                        top: `${20 + Math.sin(i * 45) * 60}%`,
                                        left: `${20 + Math.cos(i * 45) * 60}%`,
                                    }}
                                    animate={{
                                        scale: [0, 1, 0],
                                        opacity: [0, 1, 0],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Opening Animation */}
                <AnimatePresence>
                    {stage === 'opening' && (
                        <motion.div
                            className="relative"
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.2, 0.8] }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        >
                            {/* Explosion particles */}
                            {particles.map((particle) => (
                                <motion.div
                                    key={particle.id}
                                    className="absolute w-1 h-1 rounded-full bg-white"
                                    initial={{
                                        x: 0,
                                        y: 0,
                                        scale: 0,
                                        opacity: 1
                                    }}
                                    animate={{
                                        x: (particle.x - 50) * 4,
                                        y: (particle.y - 50) * 4,
                                        scale: [0, 1, 0],
                                        opacity: [1, 1, 0]
                                    }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                />
                            ))}

                            {/* Expanding ring */}
                            <motion.div
                                className="absolute inset-0 rounded-full border-4 border-white"
                                initial={{ scale: 0, opacity: 1 }}
                                animate={{ scale: 3, opacity: 0 }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Revealed Gift */}
                <AnimatePresence>
                    {stage === 'revealed' && (
                        <motion.div
                            className="text-center"
                            initial={{ scale: 0, rotateY: 180 }}
                            animate={{ scale: 1, rotateY: 0 }}
                            transition={{
                                duration: 0.8,
                                ease: "easeOut",
                                type: 'spring',
                                stiffness: 200
                            }}
                        >
                            {/* Gift Image */}
                            <motion.div
                                className="relative mb-6"
                                animate={{
                                    y: [0, -10, 0],
                                    rotateZ: [0, 2, -2, 0]
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                }}
                            >
                                <div
                                    className="w-40 h-40 rounded-3xl mx-auto flex items-center justify-center relative overflow-hidden"
                                    style={{
                                        background: rarityGradients[gift.rarity],
                                        boxShadow: `0 0 80px ${rarityColors[gift.rarity]}60`,
                                    }}
                                >
                                    <img
                                        src={gift.image}
                                        alt={gift.name}
                                        className="w-24 h-24 object-contain"
                                    />

                                    {/* Shine effect */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '100%' }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            repeatDelay: 3
                                        }}
                                    />
                                </div>

                                {/* Floating hearts */}
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute"
                                        style={{
                                            top: `${Math.random() * 100}%`,
                                            left: `${Math.random() * 100}%`,
                                        }}
                                        animate={{
                                            y: [0, -30, -60],
                                            opacity: [0, 1, 0],
                                            scale: [0.5, 1, 0.5],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            delay: i * 0.5,
                                        }}
                                    >
                                        <Heart
                                            className="w-4 h-4 text-pink-400 fill-current"
                                            strokeWidth={1}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Gift Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                            >
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {gift.name}
                                </h3>

                                <div className="flex items-center justify-center space-x-2 mb-4">
                                    <Sparkles
                                        className="w-5 h-5"
                                        style={{ color: rarityColors[gift.rarity] }}
                                        strokeWidth={1}
                                    />
                                    <span
                                        className="text-lg font-semibold capitalize"
                                        style={{ color: rarityColors[gift.rarity] }}
                                    >
                                        {gift.rarity}
                                    </span>
                                </div>

                                <motion.div
                                    className="text-3xl font-bold"
                                    style={{
                                        background: 'linear-gradient(to right, #ec4899, #8b5cf6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                    }}
                                >
                                    ${gift.value}
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
