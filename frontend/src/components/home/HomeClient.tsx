'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, UserProfile } from '@/services/api';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTelegram } from '@/lib/telegram';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { MatchModal } from '@/components/discovery/MatchModal';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { Toast } from '@/components/ui/Toast';
// Photo URL prefix — uses Next.js proxy to avoid exposing backend URL
const PHOTO_BASE = '/api_proxy';

// FIX (UX): Deterministic hash function for stable compatibility scores
// Instead of random(), use hash of user ID for consistency between re-renders
const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

const SmartDiscoveryEngine = dynamic(() => import('@/components/discovery/SmartDiscoveryEngine').then(mod => mod.SmartDiscoveryEngine), {
    loading: () => <div className="h-screen w-full flex items-center justify-center bg-black text-white">Загрузка...</div>,
    ssr: false // Discovery is highly client-dependent (geo, etc)
});

export function HomeClient() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, hapticFeedback } = useTelegram();
    const { isAuthed, isChecking } = useRequireAuth();
    
    // Реальные данные: суперлайки и буст
    const [superLikesLeft, setSuperLikesLeft] = useState(0);
    const [boostActive, setBoostActive] = useState(false);
    const [matchData, setMatchData] = useState<{ isOpen: boolean; user?: UserProfile; partner?: UserProfile } | null>(null);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    // Filters state - ideally persist this in URL or LocalStorage
    const [filters, setFilters] = useState({
        ageRange: [18, 50] as [number, number],
        maxDistance: 50,
        interests: [] as string[],
        onlineOnly: false,
        verifiedOnly: false
    });

    // Cached profiles for infinite loop effect - load from localStorage
    const [cachedProfiles, setCachedProfiles] = useState<UserProfile[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cachedProfiles_v3');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    return [];
                }
            }
        }
        return [];
    });

    // 0. Update Location on Mount
    useEffect(() => {
        if (isAuthed && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    authService.updateLocation(
                        position.coords.latitude,
                        position.coords.longitude
                    ).catch(console.error);
                },
                (err) => { /* Location access denied or unavailable */ },
                { timeout: 10000, maximumAge: 60000 }
            );
        }
    }, [isAuthed]);

    // 0.1 Загрузка данных суперлайков и буста
    useEffect(() => {
        if (!isAuthed) return;
        let cancelled = false;
        const fetchExtra = async () => {
            try {
                const [superlikeInfo, boostStatus] = await Promise.all([
                    authService.getSuperlikeInfo(),
                    authService.getBoostStatus(),
                ]);
                if (!cancelled) {
                    setSuperLikesLeft(superlikeInfo.remaining);
                    setBoostActive(boostStatus.is_active);
                }
            } catch (e) {
                if (!cancelled) console.error('[Home] Failed to fetch superlike/boost info', e);
            }
        };
        fetchExtra();
        return () => { cancelled = true; };
    }, [isAuthed]);

    // 0.2 Check Profile Status (Onboarding Guard)
    const { data: me, error: meError } = useQuery({
        queryKey: ['me'],
        queryFn: authService.getMe,
        retry: false,
        staleTime: 1000 * 60 * 5,
        enabled: isAuthed // Only fetch if authenticated
    });

    useEffect(() => {
        if (meError) {
            const e = meError as Error & { response?: { status?: number }; status?: number; statusCode?: number };
            if (e?.response?.status === 401 || e?.status === 401 || e?.statusCode === 401) {
                // Don't clear token here — http-client handles 401 re-auth automatically
                console.warn('[Home] meError 401 — http-client should have handled re-auth');
            }
        }
    }, [meError, router]);

    useEffect(() => {
        if (me) {
            // Trust backend's is_complete flag — it's set during onboarding completion
            if (me.is_complete !== true) {
                router.replace('/onboarding');
            }
        }
    }, [me, router]);

    // 1. Fetch Feed
    const { data: profiles, isLoading, error, refetch } = useQuery({
        queryKey: ['feed', filters],
        queryFn: async () => {
            try {
                console.log('[FEED] fetching profiles with filters:', JSON.stringify(filters));
                // Currently API definition in services/api.ts might need update to support all filters.
                // We pass what we can or rely on default backend logic for now.
                const res = await authService.getProfiles({
                    limit: 50 // Increased for better UX
                });

                // API returns paginated response: { items: [...], next_cursor, has_more }
                const apiRes = res as { items?: UserProfile[] };
                const profiles = apiRes?.items || (Array.isArray(res) ? res : []);
                console.log('[FEED] got', profiles.length, 'profiles, raw type:', typeof res, Array.isArray(res) ? 'array' : 'object');

                // Helper to resolve photo URLs (uses API_BASE constant from top of file)
                const resolvePhotoUrl = (url: string): string => {
                    if (!url) return FALLBACK_AVATAR;
                    // If it's a relative path to static files, prepend proxy URL
                    // /api/photos/ — проксируется через Next.js rewrite, оставляем как есть
                    if (url.startsWith('/api/photos/')) {
                        return url;
                    }
                    if (url.startsWith('/static/') || url.startsWith('/uploads/')) {
                        return `${PHOTO_BASE}${url}`;
                    }
                    // Already absolute URL (http:// or https://)
                    return url;
                };

                // Transform API response to match SmartDiscoveryEngine's expected User format
                // if there are discrepancies. 
                return (Array.isArray(profiles) ? profiles : []).map((p: UserProfile) => ({
                    ...p,
                    bio: p.bio || "",
                    // Transform photo URLs to full URLs
                    photos: (p.photos || []).map(resolvePhotoUrl),
                    // Synthesize missing frontend-only props if needed
                    isOnline: p.is_active,
                    verificationBadge: p.is_verified ? ('verified' as const) : undefined,
                    // FIX (UX): Use deterministic hash instead of random() for stable scores
                    compatibility: p.compatibility_score || (80 + (hashCode(p.id || '') % 20)),
                    distance: p.distance_km || 0,
                    lastSeen: p.last_seen ? new Date(p.last_seen) : undefined
                }));
            } catch (err) {
                console.error("Feed fetch error", err);
                throw err;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 mins
        retry: 1,
        enabled: isAuthed
    });

    useEffect(() => {
        if (error) {
            const e = error as Error & { response?: { status?: number }; status?: number; statusCode?: number; message?: string };
            // Check various common error structures
            if (e?.response?.status === 401 || e?.status === 401 || e?.statusCode === 401 || e?.message?.includes('401')) {
                // Don't clear token here — http-client handles 401 re-auth automatically
                console.warn('[Home] feed error 401 — http-client should have handled re-auth');
            }
        }
    }, [error, router]);

    // 2. Swipe Mutation
    const swipeMutation = useMutation({
        mutationFn: async ({ userId, direction }: { userId: string, direction: 'like' | 'pass' | 'superlike' }) => {
            const action = direction === 'pass' ? 'dislike' : direction;
            return await authService.swipe(userId, action as 'like' | 'dislike' | 'superlike');
        },
        onSuccess: (_, variables) => {
            // Optimistic update handled by UI state in SmartDiscoveryEngine usually,
            // but we can also update cache if needed.
            // For now, we trust the UI to remove the card.
            if (variables.direction !== 'pass') {
                hapticFeedback.impactOccurred('medium');

                // Show Match Modal if it's a match
                const result = _ as { is_match?: boolean };
                if (result.is_match) {
                    // Find the user we just swiped
                    const partner = profiles?.find(p => p.id === variables.userId);
                    if (partner) {
                        setMatchData({
                            isOpen: true,
                            user: me,
                            partner: partner
                        });
                    }
                }
            }
        },
        onError: (err) => {
            console.error("Swipe failed", err);
            // Optionally trigger toast
        }
    });

    const handleSwipe = async (userId: string, direction: 'like' | 'pass' | 'superlike') => {
        swipeMutation.mutate({ userId, direction });

        // If we are running low on profiles (handled in Query usually, but basic check here)
        // In a perfect world, we use Infinite Query.
    };

    // Cache profiles when we get them, save to localStorage for persistence
    useEffect(() => {
        setCachedProfiles(prev => {
            const isValid = Array.isArray(profiles) && profiles.length > 0;
            if (!isValid) return prev;

            // Keep only unique profiles by ID
            const newCache = [...profiles]; // Replace cache with fresh batch to avoid stale URLs
            if (typeof window !== 'undefined') {
                localStorage.setItem('cachedProfiles_v3', JSON.stringify(newCache));
            }
            return newCache;
        });
    }, [profiles]);

    // Auto-reload from cache when profiles run out (infinite loop)
    useEffect(() => {
        if (!isLoading && profiles && profiles.length === 0 && cachedProfiles.length > 0) {
            // Profiles exhausted - reset query data with cached (shuffled) profiles
            const timer = setTimeout(() => {
                // Shuffle cached profiles for variety
                const shuffled = [...cachedProfiles].sort(() => Math.random() - 0.5);
                queryClient.setQueryData(['feed', filters], shuffled);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [profiles, isLoading, cachedProfiles, queryClient, filters]);

    // Handle Loading
    if (isChecking || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-black p-6">
                <div className="relative">
                    <motion.div
                        className="w-20 h-20 border-2 border-primary-red/20 rounded-full border-t-primary-red"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="mt-8 text-center text-primary-red font-mono text-[10px] uppercase tracking-[0.3em]">
                        Загрузка анкет...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-black text-white p-6 text-center">
                <h2 className="text-xl font-bold mb-2">Ошибка подключения</h2>
                <p className="text-gray-400 mb-6">Не удалось загрузить анкеты. Проверьте интернет.</p>
                <button
                    onClick={() => refetch()}
                    className="px-6 py-3 bg-slate-800 rounded-full font-semibold active:scale-95 transition-transform"
                >
                    Повторить
                </button>
            </div>
        );
    }


    // Empty State - show loading spinner while refetching
    if (!profiles || profiles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-black text-white p-6 text-center">
                <motion.div
                    className="w-16 h-16 border-2 border-blue-500/30 rounded-full border-t-blue-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="text-gray-400 mt-4 text-sm">Загружаем ещё анкеты...</p>
            </div>
        );
    }

    return (
        <>
            <SmartDiscoveryEngine
                users={profiles}
                filters={filters}
                onSwipe={handleSwipe}
                onFilterChange={setFilters}
                onStartChat={async (userId: string) => {
                    try {
                        const result = await authService.startChat(userId);
                        router.push(`/chat/${result.match_id}`);
                    } catch (e) {
                        console.error("Failed to start chat", e);
                        setToast({message: "Не удалось начать чат", type: 'error'});
                    }
                }}
                isPremium={me?.subscription_tier !== 'free'}
                superLikesLeft={superLikesLeft}
                boostActive={boostActive}
                onUpgradeToPremium={() => router.push('/profile/premium')}
                onUseBoost={async () => {
                    try {
                        await authService.activateBoost(1);
                        setBoostActive(true);
                    } catch (e) {
                        console.error('Boost failed', e);
                    }
                }}
            />

            {matchData && (
                <MatchModal
                    isOpen={matchData.isOpen}
                    onClose={() => setMatchData(null)}
                    onStartChat={async () => {
                        if (matchData.partner) {
                            try {
                                const result = await authService.startChat(matchData.partner.id);
                                router.push(`/chat/${result.match_id}`);
                            } catch (e) {
                                console.error("Failed to start chat from match modal", e);
                            }
                        }
                    }}
                    userAvatar={matchData.user?.photos?.[0]}
                    matchAvatar={matchData.partner?.photos?.[0]}
                    matchName={matchData.partner?.name || 'Partner'}
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
