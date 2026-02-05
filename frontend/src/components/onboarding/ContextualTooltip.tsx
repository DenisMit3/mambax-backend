'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { authService } from '@/services/api';

interface ContextualTooltipProps {
    stepId: string;
    title: string;
    message: string;
    trigger: 'manual' | 'auto';
    delay?: number; // ms для auto trigger
}

export const ContextualTooltip = ({
    stepId,
    title,
    message,
    trigger,
    delay = 2000
}: ContextualTooltipProps) => {
    const haptic = useHaptic();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Проверить, показывали ли уже эту подсказку
        authService.getOnboardingStatus().then(({ completed_steps }) => {
            if (!completed_steps[stepId] && !isDismissed) {
                if (trigger === 'auto') {
                    setTimeout(() => setIsVisible(true), delay);
                } else {
                    setIsVisible(true);
                }
            }
        });
    }, [stepId, trigger, delay, isDismissed]);

    const handleDismiss = async () => {
        haptic.light();
        await authService.completeOnboardingStep(stepId);
        setIsVisible(false);
        setIsDismissed(true);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto"
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-4 border border-yellow-500/30 shadow-2xl">
                        <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                                <Lightbulb className="w-5 h-5 text-yellow-400" />
                            </div>

                            <div className="flex-1">
                                <h4 className="text-white font-semibold mb-1">
                                    {title}
                                </h4>
                                <p className="text-gray-300 text-sm">
                                    {message}
                                </p>
                            </div>

                            <button
                                onClick={handleDismiss}
                                className="text-gray-400 hover:text-white transition-colors shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
