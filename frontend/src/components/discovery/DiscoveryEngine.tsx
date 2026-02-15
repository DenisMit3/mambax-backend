'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Heart, Zap } from 'lucide-react';

import { SwipeCard } from './SwipeCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { SwipeLimitModal } from './SwipeLimitModal';
import { ProfileSkeleton } from './ProfileSkeleton';
import { TooltipGuide } from '@/components/onboarding/TooltipGuide';
import { ContextualTooltip } from '@/components/onboarding/ContextualTooltip';
import { Toast } from '@/components/ui/Toast';

import { useDiscoveryEngine } from './discovery-engine/useDiscoveryEngine';
import { FiltersModal } from './discovery-engine/FiltersModal';
import { ActionButtons } from './discovery-engine/ActionButtons';
import type { DiscoveryEngineProps } from './discovery-engine/types';

export type { Profile, DiscoveryFilters, DiscoveryEngineProps } from './discovery-engine/types';

export const DiscoveryEngine = ({
    profiles,
    onSwipe,
    onFiltersChange,
    userLocation,
    isPremium
}: DiscoveryEngineProps) => {
    const engine = useDiscoveryEngine(profiles, onSwipe, onFiltersChange, isPremium);

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            {/* Header */}
            <motion.div
                className="flex items-center justify-between p-4 border-b border-white/10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center space-x-3">
                    <motion.div
                        className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center"
                        animate={engine.boostActive ? {
                            boxShadow: [
                                '0 0 20px rgba(255, 59, 48, 0.6)',
                                '0 0 40px rgba(255, 59, 48, 0.8)',
                                '0 0 20px rgba(255, 59, 48, 0.6)'
                            ]
                        } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <Heart className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Открытия</h1>
                        {engine.boostActive && (
                            <p className="text-xs text-orange-400">🔥 Буст активен</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {isPremium && (
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={engine.activateBoost}
                            disabled={engine.boostActive}
                            className="text-orange-400"
                        >
                            <Zap className="w-4 h-4 mr-1" />
                            Буст
                        </AnimatedButton>
                    )}
                    <AnimatedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => engine.setShowFilters(true)}
                        data-onboarding="filters-button"
                    >
                        <Settings className="w-4 h-4" />
                    </AnimatedButton>
                </div>
            </motion.div>

            {/* Swipe Limit Progress */}
            {engine.swipeStatus && !engine.swipeStatus.is_vip && (
                <motion.div
                    className="px-4 py-2 bg-gray-800/50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Свайпы сегодня</span>
                        <span className="text-xs font-semibold text-white">
                            {engine.swipeStatus.remaining} / {engine.swipeStatus.total}
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(engine.swipeStatus.remaining / engine.swipeStatus.total) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </motion.div>
            )}

            {/* Cards Stack */}
            <div className="flex-1 relative p-4">
                <AnimatePresence>
                    {engine.visibleProfiles.length === 0 && engine.currentIndex === 0 ? (
                        <ProfileSkeleton />
                    ) : engine.visibleProfiles.length === 0 ? (
                        <motion.div
                            className="flex flex-col items-center justify-center h-full"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <GlassCard className="p-8 text-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center mx-auto mb-4">
                                    <Heart className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Больше нет профилей</h3>
                                <p className="text-gray-400 mb-4">Попробуйте расширить фильтры поиска или вернитесь позже</p>
                                <AnimatedButton onClick={() => engine.setShowFilters(true)} variant="primary">
                                    Настроить фильтры
                                </AnimatedButton>
                            </GlassCard>
                        </motion.div>
                    ) : (
                        engine.visibleProfiles.map((profile, index) => (
                            <motion.div
                                key={profile.id}
                                className="absolute inset-0"
                                style={{ zIndex: engine.visibleProfiles.length - index }}
                                initial={{ scale: 0.95 - index * 0.05, y: index * 10, opacity: 1 - index * 0.2 }}
                                animate={{ scale: 0.95 - index * 0.05, y: index * 10, opacity: 1 - index * 0.2 }}
                                exit={{ opacity: 0, x: 0, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
                            >
                                <SwipeCard profile={profile} onSwipe={engine.handleSwipe} isTop={index === 0} />
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Action Buttons */}
            {engine.visibleProfiles.length > 0 && (
                <ActionButtons
                    onPass={() => engine.handleManualAction('pass')}
                    onLike={() => engine.handleManualAction('like')}
                    onSuperLike={() => engine.handleManualAction('superlike')}
                    onUndo={engine.handleUndo}
                    superLikesLeft={engine.superLikesLeft}
                    undoEnabled={engine.undoHistory.length > 0}
                    undoPending={engine.undoMutation.isPending}
                />
            )}

            {/* Super Likes Counter */}
            <motion.div
                className="absolute top-20 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
            >
                ⭐ {engine.superLikesLeft}
            </motion.div>

            {/* Filters Modal */}
            <AnimatePresence>
                {engine.showFilters && (
                    <FiltersModal
                        filters={engine.filters}
                        onFiltersChange={engine.updateFilters}
                        onClose={() => engine.setShowFilters(false)}
                        isPremium={isPremium}
                    />
                )}
            </AnimatePresence>

            {/* Swipe Limit Modal */}
            <SwipeLimitModal
                isOpen={engine.showLimitModal}
                onClose={() => engine.setShowLimitModal(false)}
                onUpgradeToVIP={() => engine.router.push('/profile/premium')}
                onBuySwipes={engine.handleBuySwipes}
                resetTime={engine.swipeStatus?.reset_at ? new Date(engine.swipeStatus.reset_at).toLocaleTimeString() : '00:00'}
            />

            {/* Onboarding */}
            <TooltipGuide currentPage="discover" />

            {engine.swipeStatus && !engine.swipeStatus.is_vip && engine.swipeStatus.remaining === 0 && (
                <ContextualTooltip
                    stepId="swipe_limit_reached"
                    title="Хочешь больше?"
                    message="Свайпы закончились на сегодня. Попробуй VIP для безлимитных свайпов!"
                    trigger="auto"
                    delay={1000}
                />
            )}

            {engine.toast && <Toast message={engine.toast.message} type={engine.toast.type} onClose={() => engine.setToast(null)} />}
        </div>
    );
};
