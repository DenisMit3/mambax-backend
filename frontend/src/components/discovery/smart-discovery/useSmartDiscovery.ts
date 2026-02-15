'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { User } from './types';

export function useSmartDiscovery(
    users: User[],
    onSwipe: (userId: string, direction: 'like' | 'pass' | 'superlike') => void,
) {
    const activeUsers = (users && users.length > 0) ? users : [];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'stack' | 'grid'>('stack');
    const [expandedProfile, setExpandedProfile] = useState<User | null>(null);
    const [lastDirection, setLastDirection] = useState<'left' | 'right' | 'up' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Motion values
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // 3D Tilt
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const rotateY = useTransform(x, [-200, 200], [-10, 10]);
    const rotateX = useTransform(y, [-200, 200], [10, -10]);

    // Elastic stack
    const nextCardScale = useTransform(x, [-200, 0, 200], [1, 0.95, 1], { clamp: false });
    const nextCardOpacity = useTransform(x, [-200, 0, 200], [0.8, 0.6, 0.8]);

    const controls = useAnimation();

    // Swipe feedback
    const likeOpacity = useTransform(x, [50, 150], [0, 1]);
    const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);
    const superLikeOpacity = useTransform(y, [-50, -100], [0, 1]);
    const likeScale = useTransform(x, [0, 150], [1.5, 1]);
    const nopeScale = useTransform(x, [0, -150], [1.5, 1]);

    // Infinite loop
    const safeIndex = activeUsers.length > 0 ? currentIndex % activeUsers.length : 0;
    const currentProfile = activeUsers.length > 0 ? activeUsers[safeIndex] : null;
    const nextProfile = activeUsers.length > 0 ? activeUsers[(safeIndex + 1) % activeUsers.length] : null;

    // Reset index periodically
    useEffect(() => {
        if (currentIndex >= activeUsers.length * 10 && activeUsers.length > 0) {
            setCurrentIndex(0);
        }
    }, [currentIndex, activeUsers.length]);

    // Reset controls when profile changes
    useEffect(() => {
        x.set(0);
        y.set(0);
        controls.set({ x: 0, y: 0, rotate: 0, opacity: 1 });
    }, [currentProfile, controls, x, y]);

    const swipe = useCallback(async (direction: 'left' | 'right' | 'up') => {
        if (!currentProfile || isAnimating) return;

        setLastDirection(direction);
        setIsAnimating(true);

        let targetX = 0;
        let targetY = 0;
        let rotateEnd = 0;

        if (expandedProfile) setExpandedProfile(null);

        if (direction === 'right') {
            targetX = window.innerWidth + 100;
            rotateEnd = 20;
            onSwipe(currentProfile.id, 'like');
        } else if (direction === 'left') {
            targetX = -window.innerWidth - 100;
            rotateEnd = -20;
            onSwipe(currentProfile.id, 'pass');
        } else if (direction === 'up') {
            targetY = -window.innerHeight - 100;
            onSwipe(currentProfile.id, 'superlike');
        }

        try {
            await controls.start({
                x: targetX,
                y: targetY,
                rotate: rotateEnd,
                opacity: 0,
                transition: { duration: 0.3, ease: 'easeIn' }
            });
            setCurrentIndex((prev) => prev + 1);
        } catch (e) {
            console.error("Swipe animation error:", e);
            setCurrentIndex((prev) => prev + 1);
        } finally {
            setIsAnimating(false);
        }
    }, [currentProfile, isAnimating, expandedProfile, onSwipe, controls]);

    const handleDragEnd = useCallback(async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (isAnimating) return;

        const threshold = 100;
        const velocity = info.velocity.x;

        if (info.offset.x > threshold || velocity > 500) {
            await swipe('right');
        } else if (info.offset.x < -threshold || velocity < -500) {
            await swipe('left');
        } else if (info.offset.y < -threshold) {
            await swipe('up');
        } else {
            controls.start({ x: 0, y: 0 });
        }
    }, [isAnimating, swipe, controls]);

    return {
        activeUsers,
        currentIndex,
        setCurrentIndex,
        viewMode,
        setViewMode,
        expandedProfile,
        setExpandedProfile,
        currentProfile,
        nextProfile,
        swipe,
        handleDragEnd,
        // Motion
        x, y, rotate, rotateX, rotateY,
        nextCardScale, nextCardOpacity,
        controls,
        likeOpacity, nopeOpacity, superLikeOpacity,
        likeScale, nopeScale,
    };
}
