import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/api';
import { httpClient } from '@/lib/http-client';

export interface Profile {
    id: string;
    name: string;
    age: number;
    bio?: string;
    photos: string[];
    common_interests?: string[];
    compatibility_score?: number;
    ai_reasoning?: string;
}

export interface SwipeStatus {
    remaining: number;
    daily_remaining: number;
    bonus_swipes: number;
    stars_balance: number;
    can_buy_swipes: boolean;
    swipe_pack_price: number;
    swipe_pack_count: number;
    is_vip: boolean;
    total: number;
    reset_at: string;
}

export function useProfiles() {
    return useQuery({
        queryKey: ['profiles', 'feed'],
        queryFn: async () => {
            const data = await authService.getProfiles();
            // FIX: API returns PaginatedResponse<UserProfile> with { items: [...] }
            // Extract items array from paginated response
            const apiResponse = data as any;
            const profiles = apiResponse?.items || (Array.isArray(data) ? data : []);
            return profiles as Profile[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });
}

export function useSwipeStatus() {
    return useQuery({
        queryKey: ['swipe-status'],
        queryFn: async () => {
            // Используем httpClient вместо прямого fetch
            return httpClient.get<SwipeStatus>("/api/swipes/status");
        },
        // Refetch often as swipes change
        refetchInterval: 30000,
    });
}

export function useLikeMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, isSuper = false }: { userId: string; isSuper?: boolean }) => {
            return authService.likeUser(userId, isSuper);
        },
        onSuccess: () => {
            // Invalidate swipe status to update counts
            queryClient.invalidateQueries({ queryKey: ['swipe-status'] });
        },
    });
}

export function usePrefetchProfiles() {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['profiles', 'prefetch'],
        queryFn: async () => {
            // Используем httpClient вместо прямого fetch
            return httpClient.get<Profile[]>("/api/discover/prefetch?limit=10");
        },
        staleTime: 1000 * 60 * 2, // 2 минуты
        refetchOnWindowFocus: false,
        enabled: false // Вызывается вручную
    });
}

export function useUndoSwipe() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            // Используем httpClient вместо прямого fetch
            return httpClient.post("/api/undo-swipe");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            queryClient.invalidateQueries({ queryKey: ['swipe-status'] });
        }
    });
}

export function useDailyPicks() {
    return useQuery({
        queryKey: ['daily-picks'],
        queryFn: async () => {
            // Используем httpClient вместо прямого fetch
            const data = await httpClient.get<{ picks: Profile[] }>("/api/discover/daily-picks");
            return data.picks as Profile[];
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 часа
    });
}

export function useSmartFilters() {
    return useQuery({
        queryKey: ['smart-filters'],
        queryFn: async () => {
            // Используем httpClient вместо прямого fetch
            return httpClient.get("/api/discover/smart-filters");
        },
        staleTime: 1000 * 60 * 30, // 30 минут
    });
}
