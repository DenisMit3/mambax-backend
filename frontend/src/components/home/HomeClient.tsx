'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, UserProfile } from '@/services/api';

import { useRouter } from 'next/navigation';
import { useTelegram } from '@/lib/telegram';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { MatchModal } from '@/components/discovery/MatchModal';
import { FALLBACK_AVATAR } from '@/lib/constants';
import { Toast } from '@/components/ui/Toast';
import { ShieldCheck, X } from 'lucide-react';
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
    loading: () => <div className="h-dvh w-full flex items-center justify-center bg-black text-white">Загрузка...</div>,
    ssr: false // Discovery is highly client-dependent (geo, etc)
});

function VerificationBanner({ onDismiss }: { onDismiss: () => void }) {
    const router = useRouter();
    return (
        <div className="absolute top-2 left-3 right-3 z-50">
            <div className="bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-xl rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">Пройдите верификацию</p>
                    <p className="text-slate-400 text-xs mt-0.5">Верифицированные профили получают больше лайков</p>
                    <button
                        onClick={() => router.push('/verification')}
                        className="mt-2 px-4 py-1.5 bg-cyan-500 text-white text-xs font-bold rounded-lg active:scale-95 transition"
                    >
                        Пройти
                    </button>
                </div>
                <button onClick={onDismiss} className="text-slate-500 hover:text-white transition p-1">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export function HomeClient() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, hapticFeedback } = useTelegram();
    const { isAuthed, isChecking } = useRequireAuth();
    useGeolocation(!isAuthed); // Centralized geo — cached, sends to backend once
    
    // Реальные данные: суперлайки и буст
    const [superLikesLeft, setSuperLikesLeft] = useState(0);
    const [boostActive, setBoostActive] = useState(false);
    const [matchData, setMatchData] = useState<{ isOpen: boolean; user?: UserProfile; partner?: UserProfile } | null>(null);
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
    const [showVerificationBanner, setShowVerificationBanner] = useState(false);

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

    // 0. Update Location on Mount — handled by useGeolocation hook (centralized, cached)

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
        queryKey: ['user', 'me'],
        queryFn: authService.getMe,
        retry: false,
        staleTime: 1000 * 30, // 30s - shorter to pick up is_complete changes faster
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
            if (me.is_complete !== true) {
                // Guard: don't redirect back if we just came from onboarding (cache might be stale)
                const justCompleted = sessionStorage.getItem('onboarding_completed');
                if (justCompleted) {
                    sessionStorage.removeItem('onboarding_completed');
                    return;
                }
                router.replace('/onboarding');
            }
        }
    }, [me, router]);

    // Verification banner: show if not verified and not dismissed within 24h
    useEffect(() => {
        if (me && me.is_verified === false) {
            const dismissed = localStorage.getItem('verification_banner_dismissed');
            if (dismissed) {
                const ts = parseInt(dismissed, 10);
                if (Date.now() - ts < 24 * 60 * 60 * 1000) return;
            }
            setShowVerificationBanner(true);
        }
    }, [me]);

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
                    <div
                        className="w-20 h-20 border-2 border-primary-red/20 rounded-full border-t-primary-red animate-spin"
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
                <div
                    className="w-16 h-16 border-2 border-blue-500/30 rounded-full border-t-blue-500 animate-spin"
                />
                <p className="text-gray-400 mt-4 text-sm">Загружаем ещё анкеты...</p>
            </div>
        );
    }

    return (
        <>
            {showVerificationBanner && (
                <VerificationBanner onDismiss={() => {
                    setShowVerificationBanner(false);
                    localStorage.setItem('verification_banner_dismissed', Date.now().toString());
                }} />
            )}
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
