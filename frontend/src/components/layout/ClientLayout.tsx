'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import QueryProvider from '@/providers/QueryProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTelegram } from '@/lib/telegram';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { webApp } = useTelegram();
    const isAdmin = pathname?.startsWith('/admin');
    const isVerification = pathname?.startsWith('/verification');
    const isOnboarding = pathname?.startsWith('/onboarding');
    const isAuth = pathname?.startsWith('/auth');

    // Explicitly hide global nav where pages handle it themselves (to avoid duplicates)
    // Only hide on individual Chat pages (which has input bar), NOT the chat list
    // /chat/123 matches, /chat does NOT match
    const isChatRoom = pathname ? /^\/chat\/[^/]+/.test(pathname) : false;

    // Legacy hide logic + new duplicate prevention
    const hideNav = isVerification || isOnboarding || isAuth;

    // Show Nav on Home, Likes, Profile, Search, Chat List. Hide on Chat Room.
    const showGlobalNav = !hideNav && !isChatRoom;

    useEffect(() => {
        // Register PWA Service Worker
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW Registered:', registration);
                })
                .catch(err => {
                    console.log('SW Registration failed:', err);
                });
        }
    }, []);

    // Telegram Back Button Management
    useEffect(() => {
        if (!webApp) return;

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
    }, [pathname, webApp, router]);

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
                {/* Desktop Background - Dark gradient like onboarding */}
                <div className="fixed inset-0 bg-[#0f0f11] z-0" />

                {/* Subtle ambient glow */}
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-pink-600/5 rounded-full blur-[130px]" />
                </div>

                {/* iPhone-style Mobile Container */}
                <div className="fixed inset-0 flex items-center justify-center z-10">
                    <div className="w-full h-full sm:h-[90vh] sm:max-w-[420px] bg-black sm:rounded-[3rem] sm:border-[8px] sm:border-[#1c1c1e] sm:shadow-2xl relative flex flex-col overflow-hidden transform">
                        <div className={`flex-1 w-full min-h-0 overflow-y-auto scrollbar-hide relative ${showGlobalNav ? 'pb-28' : ''}`}>
                            {children}
                        </div>

                        {showGlobalNav && (
                            <div className="absolute bottom-0 left-0 right-0 z-50 sm:rounded-b-[2.5rem] overflow-hidden">
                                <BottomNav />
                            </div>
                        )}
                    </div>
                </div>
            </QueryProvider>
        </ErrorBoundary>
    );
}
