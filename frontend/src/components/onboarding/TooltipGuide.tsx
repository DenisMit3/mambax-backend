'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { authService } from '@/services/api';

interface TooltipStep {
    id: string;
    title: string;
    description: string;
    targetSelector: string; // CSS selector для подсветки
    position: 'top' | 'bottom' | 'left' | 'right';
    action?: () => void;
}

const ONBOARDING_STEPS: TooltipStep[] = [
    {
        id: 'first_swipe_done',
        title: 'Свайпни вправо для лайка',
        description: 'Проведи пальцем вправо или нажми на зелёное сердце, чтобы лайкнуть профиль',
        targetSelector: '[data-onboarding="like-button"]',
        position: 'top'
    },
    {
        id: 'first_superlike_used',
        title: 'Нажми звезду для Super Like',
        description: 'Super Like выделит тебя среди других. У тебя есть 1 бесплатный в день!',
        targetSelector: '[data-onboarding="superlike-button"]',
        position: 'top'
    },
    {
        id: 'first_filter_opened',
        title: 'Открой фильтры',
        description: 'Настрой возраст, расстояние и другие параметры поиска',
        targetSelector: '[data-onboarding="filters-button"]',
        position: 'bottom'
    }
];

interface TooltipGuideProps {
    currentPage: 'discover' | 'chat' | 'profile';
}

export const TooltipGuide = ({ currentPage }: TooltipGuideProps) => {
    const haptic = useHaptic();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Загрузить статус онбординга
    useEffect(() => {
        authService.getOnboardingStatus().then(({ completed_steps }) => {
            setCompletedSteps(completed_steps);
            
            // Показать гайд только если не все шаги пройдены
            const allCompleted = ONBOARDING_STEPS.every(step => completed_steps[step.id]);
            if (!allCompleted && !completed_steps.interactive_tour_completed) {
                setIsVisible(true);
            }
        });
    }, []);

    // Обновить позицию подсветки при изменении шага
    useEffect(() => {
        if (!isVisible) return;

        const currentStep = ONBOARDING_STEPS[currentStepIndex];
        const targetElement = document.querySelector(currentStep.targetSelector);
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            setTargetRect(rect);
        }
    }, [currentStepIndex, isVisible]);

    const handleNext = async () => {
        haptic.light();
        
        const currentStep = ONBOARDING_STEPS[currentStepIndex];
        
        // Отметить шаг как пройденный
        await authService.completeOnboardingStep(currentStep.id);
        setCompletedSteps(prev => ({ ...prev, [currentStep.id]: true }));

        if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            // Завершить тур
            await authService.completeOnboardingStep('interactive_tour_completed');
            setIsVisible(false);
            haptic.success();
        }
    };

    const handleSkip = async () => {
        haptic.medium();
        await authService.completeOnboardingStep('interactive_tour_completed');
        setIsVisible(false);
    };

    if (!isVisible || !targetRect) return null;

    const currentStep = ONBOARDING_STEPS[currentStepIndex];

    return (
        <AnimatePresence>
            {/* Затемнение экрана */}
            <motion.div
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Spotlight вырез */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                        <mask id="spotlight-mask">
                            <rect width="100%" height="100%" fill="white" />
                            <motion.rect
                                x={targetRect.left - 8}
                                y={targetRect.top - 8}
                                width={targetRect.width + 16}
                                height={targetRect.height + 16}
                                rx="12"
                                fill="black"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            />
                        </mask>
                    </defs>
                    <rect
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.7)"
                        mask="url(#spotlight-mask)"
                    />
                </svg>

                {/* Tooltip */}
                <motion.div
                    className="absolute bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-white/10 max-w-sm"
                    style={{
                        left: targetRect.left,
                        top: currentStep.position === 'bottom' 
                            ? targetRect.bottom + 16 
                            : targetRect.top - 200,
                    }}
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                    {/* Стрелка указатель */}
                    <div
                        className="absolute w-4 h-4 bg-gray-800 rotate-45 border-l border-t border-white/10"
                        style={{
                            [currentStep.position === 'bottom' ? 'top' : 'bottom']: -8,
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)'
                        }}
                    />

                    <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-white">
                            {currentStep.title}
                        </h3>
                        <button
                            onClick={handleSkip}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-gray-300 text-sm mb-4">
                        {currentStep.description}
                    </p>

                    {/* Прогресс */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            Шаг {currentStepIndex + 1} из {ONBOARDING_STEPS.length}
                        </span>

                        <div className="flex items-center space-x-2">
                            {currentStepIndex > 0 && (
                                <button
                                    onClick={() => setCurrentStepIndex(prev => prev - 1)}
                                    className="px-3 py-1.5 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )}
                            
                            <button
                                onClick={handleNext}
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-600 transition-all flex items-center space-x-1"
                            >
                                <span>
                                    {currentStepIndex === ONBOARDING_STEPS.length - 1 
                                        ? 'Завершить' 
                                        : 'Далее'}
                                </span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Индикаторы прогресса */}
                    <div className="flex items-center space-x-1 mt-4">
                        {ONBOARDING_STEPS.map((_, index) => (
                            <div
                                key={index}
                                className={`h-1 flex-1 rounded-full transition-all ${
                                    index <= currentStepIndex
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                                        : 'bg-gray-700'
                                }`}
                            />
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
