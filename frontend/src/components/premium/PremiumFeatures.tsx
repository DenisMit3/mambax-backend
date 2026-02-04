'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Crown, Star, Zap, Eye, Heart, MessageCircle, Shield, X } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

interface PremiumFeature {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    isPopular?: boolean;
}

interface PremiumPlan {
    id: string;
    name: string;
    price: number;
    duration: string;
    discount?: number;
    features: string[];
    isPopular?: boolean;
}

interface PremiumFeaturesProps {
    onSubscribe: (planId: string) => void;
    onClose: () => void;
    currentPlan?: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
    {
        id: 'unlimited_likes',
        icon: <Heart className="w-6 h-6" />,
        title: 'Безлимитные лайки',
        description: 'Лайкайте сколько угодно профилей без ограничений'
    },
    {
        id: 'super_likes',
        icon: <Star className="w-6 h-6" />,
        title: '5 Super Likes в день',
        description: 'Выделитесь среди других и получите больше матчей'
    },
    {
        id: 'boost',
        icon: <Zap className="w-6 h-6" />,
        title: 'Буст профиля',
        description: 'Станьте топ-профилем в вашем регионе на 30 минут',
        isPopular: true
    },
    {
        id: 'who_liked',
        icon: <Eye className="w-6 h-6" />,
        title: 'Кто поставил лайк',
        description: 'Смотрите кто лайкнул ваш профиль до матча'
    },
    {
        id: 'advanced_filters',
        icon: <Shield className="w-6 h-6" />,
        title: 'Расширенные фильтры',
        description: 'Фильтруйте по образованию, росту, интересам и другим параметрам'
    },
    {
        id: 'read_receipts',
        icon: <MessageCircle className="w-6 h-6" />,
        title: 'Статус прочтения',
        description: 'Узнавайте когда ваши сообщения прочитаны'
    },
    {
        id: 'incognito',
        icon: <Eye className="w-6 h-6" />,
        title: 'Режим инкогнито',
        description: 'Просматривайте профили незаметно'
    },
    {
        id: 'undo_swipes',
        icon: <Crown className="w-6 h-6" />,
        title: 'Отмена свайпов',
        description: 'Верните случайно пропущенный профиль'
    }
];

const PREMIUM_PLANS: PremiumPlan[] = [
    {
        id: 'monthly',
        name: 'Месячная подписка',
        price: 599,
        duration: '1 месяц',
        features: ['Все Premium функции', 'Приоритетная поддержка']
    },
    {
        id: 'quarterly',
        name: 'Квартальная подписка',
        price: 1499,
        duration: '3 месяца',
        discount: 17,
        features: ['Все Premium функции', 'Приоритетная поддержка', 'Скидка 17%'],
        isPopular: true
    },
    {
        id: 'yearly',
        name: 'Годовая подписка',
        price: 4999,
        duration: '12 месяцев',
        discount: 30,
        features: ['Все Premium функции', 'Приоритетная поддержка', 'Скидка 30%', 'Эксклюзивные бейджи']
    }
];

export const PremiumFeatures = ({ onSubscribe, onClose, currentPlan }: PremiumFeaturesProps) => {
    const { hapticFeedback } = useTelegram();
    const [selectedPlan, setSelectedPlan] = useState<string>('quarterly');

    const handlePlanSelect = (planId: string) => {
        setSelectedPlan(planId);
        hapticFeedback.light();
    };

    const handleSubscribe = () => {
        onSubscribe(selectedPlan);
        hapticFeedback.success();
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <motion.div
                className="flex items-center justify-between p-6 border-b border-white/10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center space-x-3">
                    <motion.div
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center"
                        animate={{
                            boxShadow: [
                                '0 0 20px rgba(251, 191, 36, 0.4)',
                                '0 0 40px rgba(251, 191, 36, 0.6)',
                                '0 0 20px rgba(251, 191, 36, 0.4)'
                            ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Crown className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Premium</h1>
                        <p className="text-sm text-gray-400">Откройте все возможности</p>
                    </div>
                </div>

                <AnimatedButton
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                >
                    <X className="w-5 h-5" />
                </AnimatedButton>
            </motion.div>

            {/* Features Grid */}
            <div className="p-6">
                <motion.h2
                    className="text-xl font-bold text-white mb-6 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Что вы получите с Premium
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {PREMIUM_FEATURES.map((feature, index) => (
                        <motion.div
                            key={feature.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                delay: index * 0.1,
                                duration: 0.4,
                                ease: "easeOut"
                            }}
                        >
                            <GlassCard className="p-4 h-full relative overflow-hidden">
                                {feature.isPopular && (
                                    <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                        Популярно
                                    </div>
                                )}

                                <div className="flex items-start space-x-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                        {feature.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-white mb-1">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>

                {/* Pricing Plans */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h3 className="text-xl font-bold text-white mb-6 text-center">
                        Выберите план подписки
                    </h3>

                    <div className="space-y-4 mb-8">
                        {PREMIUM_PLANS.map((plan) => (
                            <motion.div
                                key={plan.id}
                                className={`relative cursor-pointer transition-all duration-300 ${selectedPlan === plan.id ? 'scale-105' : 'hover:scale-102'
                                    }`}
                                onClick={() => handlePlanSelect(plan.id)}
                                whileHover={{ scale: selectedPlan === plan.id ? 1.05 : 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <GlassCard
                                    className={`p-6 border-2 transition-all duration-300 ${selectedPlan === plan.id
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-transparent hover:border-purple-500/50'
                                        }`}
                                >
                                    {plan.isPopular && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-4 py-1 rounded-full font-semibold">
                                            Лучший выбор
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-white">
                                                {plan.name}
                                            </h4>
                                            <p className="text-sm text-gray-400">{plan.duration}</p>
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-baseline space-x-1">
                                                <span className="text-2xl font-bold text-white">
                                                    {plan.price}
                                                </span>
                                                <span className="text-sm text-gray-400">₽</span>
                                            </div>
                                            {plan.discount && (
                                                <div className="text-xs text-green-400 font-semibold">
                                                    Скидка {plan.discount}%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {plan.features.map((feature, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                </div>
                                                <span className="text-sm text-gray-300">{feature}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedPlan === plan.id && (
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl border-2 border-purple-500 pointer-events-none"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>

                    {/* Subscribe Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <AnimatedButton
                            onClick={handleSubscribe}
                            className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            disabled={currentPlan === selectedPlan}
                        >
                            {currentPlan === selectedPlan ? (
                                'Текущий план'
                            ) : (
                                <>
                                    <Crown className="w-5 h-5 mr-2" />
                                    Оформить Premium
                                </>
                            )}
                        </AnimatedButton>
                    </motion.div>

                    {/* Terms */}
                    <motion.div
                        className="mt-6 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Подписка автоматически продлевается. Вы можете отменить её в любое время в настройках аккаунта.
                            <br />
                            Нажимая "Оформить Premium", вы соглашаетесь с{' '}
                            <span className="text-purple-400 underline">условиями использования</span>
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
};
