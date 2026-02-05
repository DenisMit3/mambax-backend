'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Star } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useHaptic } from '@/hooks/useHaptic';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SwipeLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgradeToVIP: () => void;
    onBuySwipes: () => void;
    resetTime: string;
}

export const SwipeLimitModal = ({
    isOpen,
    onClose,
    onUpgradeToVIP,
    onBuySwipes,
    resetTime
}: SwipeLimitModalProps) => {
    const haptic = useHaptic();
    const prefersReducedMotion = useReducedMotion();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.3 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-sm bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-3xl p-6 mx-4 border border-white/10 shadow-2xl relative"
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                                <Zap className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white text-center mb-2">
                            Свайпы закончились!
                        </h2>

                        {/* Description */}
                        <p className="text-gray-400 text-center mb-6">
                            Вы использовали все свайпы на сегодня. Обновление через{' '}
                            <span className="text-white font-semibold">{resetTime}</span>
                        </p>

                        {/* Options */}
                        <div className="space-y-3">
                            {/* VIP Option */}
                            <AnimatedButton
                                variant="primary"
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                                onClick={() => {
                                    haptic.success();
                                    onUpgradeToVIP();
                                }}
                            >
                                <Star className="w-5 h-5 mr-2" />
                                Безлимит с VIP
                            </AnimatedButton>

                            {/* Buy Swipes */}
                            <AnimatedButton
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                    haptic.light();
                                    onBuySwipes();
                                }}
                            >
                                Купить +10 свайпов
                            </AnimatedButton>

                            {/* Wait */}
                            <button
                                onClick={onClose}
                                className="w-full text-gray-400 text-sm py-2"
                            >
                                Подожду до завтра
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
