'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, MapPin, Heart, X, Star, Zap, RotateCcw } from 'lucide-react';

import { useTelegram } from '@/lib/telegram';
import { SwipeCard } from './SwipeCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { usePrefetchProfiles, useUndoSwipe, useSwipeStatus } from '@/hooks/useDiscovery';
import { useHaptic } from '@/hooks/useHaptic';
import { useSoundService } from '@/hooks/useSoundService';
import { SwipeLimitModal } from './SwipeLimitModal';
import { ProfileSkeleton } from './ProfileSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipGuide } from '@/components/onboarding/TooltipGuide';
import { ContextualTooltip } from '@/components/onboarding/ContextualTooltip';
import { httpClient } from '@/lib/http-client';
import { Toast } from '@/components/ui/Toast';

interface Profile {
    id: string;
    name: string;
    age: number;
    bio: string;
    photos: string[];
    distance: number;
    isVerified: boolean;
    aiCompatibility: number;
    isOnline: boolean;
    lastSeen?: string;
    interests: string[];
    profession: string;
    education: string;
}

interface DiscoveryFilters {
    ageRange: [number, number];
    maxDistance: number;
    interests: string[];
    verifiedOnly: boolean;
    onlineOnly: boolean;
    minCompatibility: number;
}

interface DiscoveryEngineProps {
    profiles: Profile[];
    onSwipe: (direction: 'left' | 'right' | 'up', profileId: string) => void;
    onFiltersChange: (filters: DiscoveryFilters) => void;
    userLocation: { lat: number; lng: number };
    isPremium: boolean;
}

export const DiscoveryEngine = ({
    profiles,
    onSwipe,
    onFiltersChange,
    userLocation,
    isPremium
}: DiscoveryEngineProps) => {
    // const { hapticFeedback } = useTelegram(); // Replaced by useHaptic
    const haptic = useHaptic();
    const soundService = useSoundService();
    const router = useRouter();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<DiscoveryFilters>({
        ageRange: [18, 35],
        maxDistance: 50,
        interests: [],
        verifiedOnly: false,
        onlineOnly: false,
        minCompatibility: 0,
    });
    const [boostActive, setBoostActive] = useState(false);
    const [superLikesLeft, setSuperLikesLeft] = useState(isPremium ? 5 : 1);

    const { data: swipeStatus, refetch: refetchStatus } = useSwipeStatus();
    const { refetch: prefetchProfiles } = usePrefetchProfiles();
    const undoMutation = useUndoSwipe();
    const [profileQueue, setProfileQueue] = useState<Profile[]>(profiles);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [undoHistory, setUndoHistory] = useState<Profile[]>([]);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    // Sync local queue when prop profiles change
    useEffect(() => {
        if (profiles.length > 0) {
            setProfileQueue(prev => {
                // If we already have profiles, only add ones we don't have
                const newOnly = profiles.filter(p => !prev.some(existing => existing.id === p.id));
                return [...prev, ...newOnly];
            });
        }
    }, [profiles]);

    // Prefetch next profiles when nearing end of queue
    useEffect(() => {
        if (currentIndex >= profileQueue.length - 3 && profileQueue.length > 0) {
            prefetchProfiles().then(({ data }) => {
                if (data && Array.isArray(data)) {
                    const newProfiles = data as unknown as Profile[];
                    setProfileQueue(prev => {
                        const newOnly = newProfiles.filter(p => !prev.some(existing => existing.id === p.id));
                        return [...prev, ...newOnly];
                    });
                }
            });
        }
    }, [currentIndex, prefetchProfiles, profileQueue.length]);



    const handleSwipe = useCallback(async (direction: 'left' | 'right' | 'up', profileId: string) => {
        // Проверить лимит перед свайпом
        if (swipeStatus && !swipeStatus.is_vip && swipeStatus.remaining <= 0) {
            setShowLimitModal(true);
            return;
        }

        haptic.medium();

        // Сохранить в историю для Undo
        const swipedProfile = profileQueue[currentIndex];
        setUndoHistory(prev => [swipedProfile, ...prev].slice(0, 5));

        if (direction === 'up' && superLikesLeft > 0) {
            setSuperLikesLeft(prev => prev - 1);
        }

        onSwipe(direction, profileId);
        setCurrentIndex(prev => prev + 1);

        if (direction === 'right' || direction === 'up') {
            soundService.playMatch();
        } else {
            soundService.playWhoosh();
        }

        // Обновить статус свайпов
        await refetchStatus();
    }, [onSwipe, haptic, soundService, superLikesLeft, swipeStatus, currentIndex, profileQueue, refetchStatus]);

    const handleUndo = async () => {
        try {
            haptic.heavy();
            const result = await undoMutation.mutateAsync();

            // Вернуть карточку в стек
            setCurrentIndex(prev => Math.max(0, prev - 1));
            setUndoHistory(prev => prev.slice(1));

            haptic.success();
        } catch (error: unknown) {
            // Показать ошибку (нужен VIP или лимит исчерпан)
            const err = error as Error;
            setToast({message: err.message, type: 'error'});
        }
    };

    const handleManualAction = (action: 'pass' | 'like' | 'superlike') => {
        if (currentIndex >= profileQueue.length) return;

        const currentProfile = profileQueue[currentIndex];

        switch (action) {
            case 'pass':
                haptic.light();
                handleSwipe('left', currentProfile.id);
                break;
            case 'like':
                haptic.medium();
                handleSwipe('right', currentProfile.id);
                break;
            case 'superlike':
                if (superLikesLeft > 0) {
                    haptic.heavy();
                    handleSwipe('up', currentProfile.id);
                } else {
                    haptic.error();
                }
                break;
        }
    };

    const activateBoost = () => {
        if (!isPremium) return;

        setBoostActive(true);
        haptic.success();

        // Boost lasts 30 minutes
        setTimeout(() => {
            setBoostActive(false);
        }, 30 * 60 * 1000);
    };

    const updateFilters = (newFilters: Partial<DiscoveryFilters>) => {
        const updatedFilters = { ...filters, ...newFilters };
        setFilters(updatedFilters);
        onFiltersChange(updatedFilters);
    };

    const visibleProfiles = profileQueue.slice(currentIndex, currentIndex + 3);

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
                        animate={boostActive ? {
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
                        <h1 className="text-lg font-bold text-white">��ткрытия</h1>
                        {boostActive && (
                            <p className="text-xs text-orange-400">🔥 Буст активен</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {isPremium && (
                        <AnimatedButton
                            variant="ghost"
                            size="sm"
                            onClick={activateBoost}
                            disabled={boostActive}
                            className="text-orange-400"
                        >
                            <Zap className="w-4 h-4 mr-1" />
                            Буст
                        </AnimatedButton>
                    )}

                    <AnimatedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(true)}
                        data-onboarding="filters-button"
                    >
                        <Settings className="w-4 h-4" />
                    </AnimatedButton>
                </div>
            </motion.div>

            {/* Swipe Limit Progress Bar */}
            {swipeStatus && !swipeStatus.is_vip && (
                <motion.div
                    className="px-4 py-2 bg-gray-800/50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">
                            Свайпы сегодня
                        </span>
                        <span className="text-xs font-semibold text-white">
                            {swipeStatus.remaining} / {swipeStatus.total}
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(swipeStatus.remaining / swipeStatus.total) * 100}%`
                            }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </motion.div>
            )}

            {/* Cards Stack */}
            <div className="flex-1 relative p-4">
                <AnimatePresence>
                    {visibleProfiles.length === 0 && currentIndex === 0 ? (
                        <ProfileSkeleton />
                    ) : visibleProfiles.length === 0 ? (
                        <motion.div
                            className="flex flex-col items-center justify-center h-full"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <GlassCard className="p-8 text-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center mx-auto mb-4">
                                    <Heart className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    Больше нет профилей
                                </h3>
                                <p className="text-gray-400 mb-4">
                                    Попробуйте расширить фильтры поиска или вернитесь позже
                                </p>
                                <AnimatedButton
                                    onClick={() => setShowFilters(true)}
                                    variant="primary"
                                >
                                    Настроить фильтры
                                </AnimatedButton>
                            </GlassCard>
                        </motion.div>
                    ) : (
                        visibleProfiles.map((profile, index) => (
                            <motion.div
                                key={profile.id}
                                className="absolute inset-0"
                                style={{ zIndex: visibleProfiles.length - index }}
                                initial={{
                                    scale: 0.95 - index * 0.05,
                                    y: index * 10,
                                    opacity: 1 - index * 0.2
                                }}
                                animate={{
                                    scale: 0.95 - index * 0.05,
                                    y: index * 10,
                                    opacity: 1 - index * 0.2
                                }}
                                exit={{
                                    opacity: 0,
                                    x: 0,
                                    rotate: 0
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 30,
                                    mass: 0.8
                                }}
                            >
                                <SwipeCard
                                    profile={profile}
                                    onSwipe={handleSwipe}
                                    isTop={index === 0}
                                />
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Action Buttons */}
            {visibleProfiles.length > 0 && (
                <motion.div
                    className="flex items-center justify-center space-x-6 p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {/* Undo Button */}
                    <motion.button
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${undoHistory.length > 0
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                            : 'bg-gray-600 opacity-50'
                            }`}
                        whileHover={undoHistory.length > 0 ? { scale: 1.1 } : {}}
                        whileTap={undoHistory.length > 0 ? { scale: 0.9 } : {}}
                        onClick={handleUndo}
                        disabled={undoHistory.length === 0 || undoMutation.isPending}
                    >
                        <RotateCcw className="w-5 h-5 text-white" />
                    </motion.button>

                    {/* Pass Button */}
                    <motion.button
                        className="w-14 h-14 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center shadow-lg"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleManualAction('pass')}
                    >
                        <X className="w-6 h-6 text-white" />
                    </motion.button>

                    {/* Super Like Button */}
                    <motion.button
                        data-onboarding="superlike-button"
                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${superLikesLeft > 0
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                            : 'bg-gray-600 opacity-50'
                            }`}
                        whileHover={superLikesLeft > 0 ? { scale: 1.1 } : {}}
                        whileTap={superLikesLeft > 0 ? { scale: 0.9 } : {}}
                        onClick={() => handleManualAction('superlike')}
                        disabled={superLikesLeft === 0}
                    >
                        <Star className="w-5 h-5 text-white" />
                    </motion.button>

                    {/* Like Button */}
                    <motion.button
                        data-onboarding="like-button"
                        className="w-14 h-14 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleManualAction('like')}
                    >
                        <Heart className="w-6 h-6 text-white" />
                    </motion.button>
                </motion.div>
            )}

            {/* Super Likes Counter */}
            <motion.div
                className="absolute top-20 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
            >
                ⭐ {superLikesLeft}
            </motion.div>

            {/* Filters Modal */}
            <AnimatePresence>
                {showFilters && (
                    <FiltersModal
                        filters={filters}
                        onFiltersChange={updateFilters}
                        onClose={() => setShowFilters(false)}
                        isPremium={isPremium}
                    />
                )}
            </AnimatePresence>

            {/* Swipe Limit Modal */}
            <SwipeLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                onUpgradeToVIP={() => {
                    // Navigate to premium page
                    router.push('/profile/premium');
                }}
                onBuySwipes={async () => {
                    // Buy swipes logic - используем httpClient
                    await httpClient.post("/api/swipes/buy-pack");
                    await refetchStatus();
                    setShowLimitModal(false);
                }}
                resetTime={swipeStatus?.reset_at ? new Date(swipeStatus.reset_at).toLocaleTimeString() : '00:00'}
            />

            {/* Onboarding Guides */}
            <TooltipGuide currentPage="discover" />

            {/* Contextual Tooltip при достижении лимита */}
            {swipeStatus && !swipeStatus.is_vip && swipeStatus.remaining === 0 && (
                <ContextualTooltip
                    stepId="swipe_limit_reached"
                    title="Хочешь больше?"
                    message="Свайпы закончились на сегодня. Попробуй VIP для безлимитных свайпов!"
                    trigger="auto"
                    delay={1000}
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

// Filters Modal Component
interface FiltersModalProps {
    filters: DiscoveryFilters;
    onFiltersChange: (filters: Partial<DiscoveryFilters>) => void;
    onClose: () => void;
    isPremium: boolean;
}

const FiltersModal = ({ filters, onFiltersChange, onClose, isPremium }: FiltersModalProps) => {
    const { hapticFeedback } = useTelegram();

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Фильтры поиска</h2>
                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Age Range */}
                    <div>
                        <label className="block text-white font-semibold mb-3">
                            Возраст: {filters.ageRange[0]} - {filters.ageRange[1]}
                        </label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="range"
                                min="18"
                                max="65"
                                value={filters.ageRange[0]}
                                onChange={(e) => {
                                    const newMin = parseInt(e.target.value);
                                    onFiltersChange({
                                        ageRange: [newMin, Math.max(newMin, filters.ageRange[1])]
                                    });
                                    hapticFeedback.light();
                                }}
                                className="flex-1"
                            />
                            <input
                                type="range"
                                min="18"
                                max="65"
                                value={filters.ageRange[1]}
                                onChange={(e) => {
                                    const newMax = parseInt(e.target.value);
                                    onFiltersChange({
                                        ageRange: [Math.min(filters.ageRange[0], newMax), newMax]
                                    });
                                    hapticFeedback.light();
                                }}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    {/* Distance */}
                    <div>
                        <label className="block text-white font-semibold mb-3">
                            Расстояние: {filters.maxDistance} км
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={filters.maxDistance}
                            onChange={(e) => {
                                onFiltersChange({ maxDistance: parseInt(e.target.value) });
                                hapticFeedback.light();
                            }}
                            className="w-full"
                        />
                    </div>

                    {/* Premium Filters */}
                    {isPremium && (
                        <>
                            <div>
                                <label className="block text-white font-semibold mb-3">
                                    Минимальная совместимость: {filters.minCompatibility}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={filters.minCompatibility}
                                    onChange={(e) => {
                                        onFiltersChange({ minCompatibility: parseInt(e.target.value) });
                                        hapticFeedback.light();
                                    }}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={filters.verifiedOnly}
                                        onChange={(e) => {
                                            onFiltersChange({ verifiedOnly: e.target.checked });
                                            hapticFeedback.light();
                                        }}
                                        className="w-5 h-5 rounded"
                                    />
                                    <span className="text-white">Только верифицированные</span>
                                </label>

                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={filters.onlineOnly}
                                        onChange={(e) => {
                                            onFiltersChange({ onlineOnly: e.target.checked });
                                            hapticFeedback.light();
                                        }}
                                        className="w-5 h-5 rounded"
                                    />
                                    <span className="text-white">Только онлайн</span>
                                </label>
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-8">
                    <AnimatedButton
                        variant="primary"
                        className="w-full"
                        onClick={onClose}
                    >
                        Применить фильтры
                    </AnimatedButton>
                </div>
            </motion.div>
        </motion.div>
    );
};
