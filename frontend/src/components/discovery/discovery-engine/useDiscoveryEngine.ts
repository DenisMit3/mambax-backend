'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrefetchProfiles, useUndoSwipe, useSwipeStatus } from '@/hooks/useDiscovery';
import { useHaptic } from '@/hooks/useHaptic';
import { useSoundService } from '@/hooks/useSoundService';
import { httpClient } from '@/lib/http-client';
import { Profile, DiscoveryFilters } from './types';

export function useDiscoveryEngine(
    profiles: Profile[],
    onSwipe: (direction: 'left' | 'right' | 'up', profileId: string) => void,
    onFiltersChange: (filters: DiscoveryFilters) => void,
    isPremium: boolean,
) {
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
    const boostTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [superLikesLeft, setSuperLikesLeft] = useState(isPremium ? 5 : 1);

    const { data: swipeStatus, refetch: refetchStatus } = useSwipeStatus();
    const { refetch: prefetchProfiles } = usePrefetchProfiles();
    const undoMutation = useUndoSwipe();
    const [profileQueue, setProfileQueue] = useState<Profile[]>(profiles);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [undoHistory, setUndoHistory] = useState<Profile[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Sync local queue when prop profiles change
    useEffect(() => {
        if (profiles.length > 0) {
            setProfileQueue(prev => {
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
        if (swipeStatus && !swipeStatus.is_vip && swipeStatus.remaining <= 0) {
            setShowLimitModal(true);
            return;
        }

        haptic.medium();

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

        await refetchStatus();
    }, [onSwipe, haptic, soundService, superLikesLeft, swipeStatus, currentIndex, profileQueue, refetchStatus]);

    const handleUndo = async () => {
        try {
            haptic.heavy();
            await undoMutation.mutateAsync();
            setCurrentIndex(prev => Math.max(0, prev - 1));
            setUndoHistory(prev => prev.slice(1));
            haptic.success();
        } catch (error: unknown) {
            const err = error as Error;
            setToast({ message: err.message, type: 'error' });
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

        if (boostTimerRef.current) clearTimeout(boostTimerRef.current);
        boostTimerRef.current = setTimeout(() => {
            setBoostActive(false);
            boostTimerRef.current = null;
        }, 30 * 60 * 1000);
    };

    useEffect(() => {
        return () => {
            if (boostTimerRef.current) clearTimeout(boostTimerRef.current);
        };
    }, []);

    const updateFilters = (newFilters: Partial<DiscoveryFilters>) => {
        const updatedFilters = { ...filters, ...newFilters };
        setFilters(updatedFilters);
        onFiltersChange(updatedFilters);
    };

    const visibleProfiles = profileQueue.slice(currentIndex, currentIndex + 3);

    const handleBuySwipes = async () => {
        await httpClient.post("/api/swipes/buy-pack");
        await refetchStatus();
        setShowLimitModal(false);
    };

    return {
        currentIndex,
        showFilters, setShowFilters,
        filters,
        boostActive,
        superLikesLeft,
        swipeStatus,
        undoMutation,
        profileQueue,
        showLimitModal, setShowLimitModal,
        undoHistory,
        toast, setToast,
        visibleProfiles,
        handleSwipe,
        handleUndo,
        handleManualAction,
        activateBoost,
        updateFilters,
        handleBuySwipes,
        router,
    };
}
