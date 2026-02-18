'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LazyMotion, domAnimation } from 'framer-motion'; // PERF-016: Lazy load framer-motion
import { BottomNav } from '@/components/layout/BottomNav';
import QueryProvider from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BadgeEarnedToast } from '@/components/ui/BadgeEarnedToast';
import { NotificationToast } from '@/components/ui/NotificationToast';
import { UserProvider } from '@/context/UserContext';
import { useTelegram } from '@/lib/telegram';
import { measurePerformance } from '@/lib/performance';
// Remote logger disabled — no backend endpoint
// import { initRemoteLogger } from '@/utils/remoteLogger';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { webApp, supportsBackButton } = useTelegram();
    const isAdmin = pathname?.startsWith('/admin');
    const isVerification = pathname?.startsWith('/verification');
    const isOnboarding = pathname?.startsWith('/onboarding');
    const isAuth = pathname?.startsWith('/auth');

    // Register push notifications for authenticated users
    usePushNotifications();

    // Explicitly hide global nav where pages handle it themselves (to avoid duplicates)
    // Only hide on individual Chat pages (which has input bar), NOT the chat list
    // /chat/123 matches, /chat does NOT match
    const isChatRoom = pathname ? /^\/chat\/[^/]+/.test(pathname) : false;

    // Legacy hide logic + new duplicate prevention
    const hideNav = isVerification || isOnboarding || isAuth;

    // Show Nav on Home, Likes, Profile, Search, Chat List. Hide on Chat Room.
    const showGlobalNav = !hideNav && !isChatRoom;

    // PERF: Register Service Worker and measure performance
    useEffect(() => {
        // Remote logger disabled
        // initRemoteLogger();
        
        // Register PWA Service Worker
        let intervalId: ReturnType<typeof setInterval> | undefined;

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    // Check for updates periodically
                    intervalId = setInterval(() => registration.update(), 60 * 60 * 1000);
                })
                .catch(() => {
                    // SW registration failed silently
                });
        }
        
        // PERF: Measure Core Web Vitals
        measurePerformance();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    // SECURITY: Clear SW cache on auth changes (logout/login)
    useEffect(() => {
        const clearSwCache = () => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' });
            }
        };

        // Listen for auth change events
        window.addEventListener('auth-logout', clearSwCache);
        window.addEventListener('auth-login', clearSwCache);

        return () => {
            window.removeEventListener('auth-logout', clearSwCache);
            window.removeEventListener('auth-login', clearSwCache);
        };
    }, []);
    
    // PERF: Prefetch critical routes for faster navigation
    useEffect(() => {
        router.prefetch('/chat');
        router.prefetch('/profile');
        router.prefetch('/discover');
        router.prefetch('/likes');
    }, [router]);

    // Telegram Back Button Management (requires version 6.1+)
    useEffect(() => {
        if (!webApp || !supportsBackButton) return;

        // Pages that are "top-level" and shouldn't show a back button
        const topLevelPaths = ['/', '/discover', '/likes', '/chat', '/profile'];
        const isTopLevel = topLevelPaths.includes(pathname || '');

        if (isTopLevel) {
            webApp.BackButton.hide();
        } else {
            webApp.BackButton.show();
        }

        const handleBack = () => {
            router.back();
        };

        webApp.BackButton.onClick(handleBack);
        return () => {
            webApp.BackButton.offClick(handleBack);
        };
    }, [pathname, webApp, router, supportsBackButton]);

    if (isAdmin) {
        // Full screen layout for admin
        return (
            <ErrorBoundary>
                <QueryProvider>{children}</QueryProvider>
            </ErrorBoundary>
        );
    }

    // Mobile layout for user app
    return (
        <ErrorBoundary>
            <QueryProvider>
                <UserProvider>
                {/* PERF-016: LazyMotion reduces framer-motion bundle by ~30KB */}
                {/* NOTE: strict mode disabled - requires replacing all 'motion' with 'm' across 70+ files */}
                <LazyMotion features={domAnimation}>
                    {/* Desktop Background - Dark gradient like onboarding */}
                    <div className="fixed inset-0 bg-[#0f0f11] z-0" />

                    {/* Subtle ambient glow */}
                    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.05) 0%, transparent 70%)' }} />
                        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(219,39,119,0.05) 0%, transparent 70%)' }} />
                    </div>

                    <BadgeEarnedToast />
                    <NotificationToast />

                    {/* iPhone-style Mobile Container */}
                    <div className="fixed inset-0 flex items-center justify-center z-10">
                        <div className="w-full h-full sm:h-[90dvh] sm:max-w-[420px] bg-black sm:rounded-[3rem] sm:border-[8px] sm:border-[#1c1c1e] sm:shadow-2xl relative flex flex-col overflow-hidden">
                            <div className={`flex-1 w-full min-h-0 ${isChatRoom ? 'overflow-hidden' : 'overflow-y-auto'} scrollbar-hide relative`} style={showGlobalNav ? { paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' } : undefined}>
                                {children}
                            </div>

                            {showGlobalNav && (
                                <div className="absolute bottom-0 left-0 right-0 z-50 sm:rounded-b-[2.5rem] overflow-hidden">
                                    <BottomNav />
                                </div>
                            )}
                        </div>
                    </div>
                </LazyMotion>
                </UserProvider>
            </QueryProvider>
        </ErrorBoundary>
    );
}
