'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, Star, Heart, Smile, Zap } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';

interface Gift {
    id: string;
    name: string;
    image?: string;
    price: number;
    category: 'romantic' | 'funny' | 'epic';
    rarity: 'common' | 'rare' | 'legendary';
}

interface GiftPickerProps {
    isOpen: boolean;
    gifts: Gift[];
    onClose: () => void;
    onSelectGift: (gift: Gift) => void;
}

const CATEGORIES = {
    romantic: {
        name: 'Романтичные',
        icon: Heart,
        color: 'from-pink-500 to-red-500',
        glowColor: 'rgba(236, 72, 153, 0.5)'
    },
    funny: {
        name: 'Забавные',
        icon: Smile,
        color: 'from-yellow-500 to-orange-500',
        glowColor: 'rgba(245, 158, 11, 0.5)'
    },
    epic: {
        name: 'Эпичные',
        icon: Zap,
        color: 'from-purple-500 to-blue-500',
        glowColor: 'rgba(147, 51, 234, 0.5)'
    }
} as const;

const RARITY_COLORS = {
    common: 'from-gray-500 to-gray-600',
    rare: 'from-blue-500 to-cyan-500',
    legendary: 'from-yellow-400 to-orange-500'
};

export const GiftPicker = ({
    isOpen,
    gifts,
    onClose,
    onSelectGift
}: GiftPickerProps) => {
    const { hapticFeedback } = useTelegram();
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof CATEGORIES>('romantic');
    const [selectingGift, setSelectingGift] = useState<string | null>(null);

    const handleCategoryChange = (category: keyof typeof CATEGORIES) => {
        setSelectedCategory(category);
        hapticFeedback.light();
    };

    const handleGiftSelect = async (gift: Gift) => {
        setSelectingGift(gift.id);
        hapticFeedback.impactOccurred('heavy');

        // Simulate selection delay
        setTimeout(() => {
            onSelectGift(gift);
            setSelectingGift(null);
        }, 800);
    };

    const filteredGifts = gifts.filter(gift => gift.category === selectedCategory);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 500,
                            mass: 0.8
                        }}
                    >
                        <GlassCard className="rounded-t-3xl rounded-b-none border-b-0 backdrop-blur-xl bg-[#0f0f11]/90 max-h-[80vh] overflow-hidden">
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-12 h-1 bg-white/20 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Подарки</h2>
                                    <p className="text-sm text-slate-400">Выберите подарок для отправки</p>
                                </div>
                                <AnimatedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15"
                                >
                                    <X className="w-5 h-5" />
                                </AnimatedButton>
                            </div>

                            {/* Category Pills */}
                            <div className="p-4 border-b border-white/10">
                                <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                                    {Object.entries(CATEGORIES).map(([key, category]) => {
                                        const IconComponent = category.icon;
                                        const isActive = selectedCategory === key;

                                        return (
                                            <motion.button
                                                key={key}
                                                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-300 ${isActive
                                                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                                                    : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                                                    }`}
                                                onClick={() => handleCategoryChange(key as keyof typeof CATEGORIES)}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                style={isActive ? {
                                                    boxShadow: `0 0 20px ${category.glowColor}`
                                                } : {}}
                                            >
                                                <IconComponent className="w-4 h-4" />
                                                <span>{category.name}</span>

                                                {isActive && (
                                                    <motion.div
                                                        className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent"
                                                        initial={{ x: '-100%' }}
                                                        animate={{ x: '100%' }}
                                                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                                    />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Gift Grid */}
                            <div className="p-4 max-h-96 overflow-y-auto">
                                <motion.div
                                    className="grid grid-cols-3 gap-3"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: {
                                            opacity: 1,
                                            transition: {
                                                staggerChildren: 0.05
                                            }
                                        }
                                    }}
                                    initial="hidden"
                                    animate="show"
                                    key={selectedCategory}
                                >
                                    {filteredGifts.map((gift) => {
                                        const isSelecting = selectingGift === gift.id;

                                        return (
                                            <motion.div
                                                key={gift.id}
                                                variants={{
                                                    hidden: { opacity: 0, y: 20, scale: 0.8 },
                                                    show: { opacity: 1, y: 0, scale: 1 }
                                                }}
                                            >
                                                <GlassCard
                                                    className={`aspect-square p-3 cursor-pointer relative overflow-hidden transition-all duration-300 ${isSelecting ? 'scale-95 opacity-70' : 'hover:scale-105'
                                                        }`}
                                                    onClick={() => !isSelecting && handleGiftSelect(gift)}
                                                >
                                                    {/* Rarity Border */}
                                                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${RARITY_COLORS[gift.rarity]} opacity-20`} />

                                                    {/* Gift Image */}
                                                    <div className="relative z-10 h-full flex flex-col">
                                                        <div className="flex-1 flex items-center justify-center mb-2">
                                                            <div className="w-12 h-12 bg-gradient-to-br from-white/15 to-white/10 rounded-xl flex items-center justify-center">
                                                                <img
                                                                    src={gift.image || ''}
                                                                    alt={gift.name}
                                                                    className="w-8 h-8 object-contain"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Gift Info */}
                                                        <div className="text-center">
                                                            <p className="text-white text-xs font-semibold truncate mb-1">
                                                                {gift.name}
                                                            </p>
                                                            <div className="flex items-center justify-center space-x-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1">
                                                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                                <span className="text-yellow-400 text-xs font-bold">
                                                                    {gift.price}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Selection Overlay */}
                                                    <AnimatePresence>
                                                        {isSelecting && (
                                                            <motion.div
                                                                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-3xl z-20"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                            >
                                                                <div className="w-8 h-8 border-2 border-white rounded-full animate-spin border-t-transparent" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    {/* Rarity Glow Effect */}
                                                    {gift.rarity === 'legendary' && (
                                                        <motion.div
                                                            className="absolute inset-0 rounded-3xl"
                                                            animate={{
                                                                boxShadow: [
                                                                    '0 0 20px rgba(251, 191, 36, 0.3)',
                                                                    '0 0 40px rgba(251, 191, 36, 0.6)',
                                                                    '0 0 20px rgba(251, 191, 36, 0.3)'
                                                                ]
                                                            }}
                                                            transition={{ duration: 2, repeat: Infinity }}
                                                        />
                                                    )}
                                                </GlassCard>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>

                                {/* Empty State */}
                                {filteredGifts.length === 0 && (
                                    <motion.div
                                        className="text-center py-12"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Star className="w-8 h-8 text-slate-500" />
                                        </div>
                                        <p className="text-slate-400 text-sm">
                                            Подарки в этой категории скоро появятся
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer Info */}
                            <div className="p-4 border-t border-white/10 bg-[#0f0f11]/50">
                                <div className="flex items-center justify-center space-x-4 text-xs text-slate-400">
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-slate-500 rounded-full" />
                                        <span>Обычные</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                        <span>Редкие</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                                        <span>Легендарные</span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
