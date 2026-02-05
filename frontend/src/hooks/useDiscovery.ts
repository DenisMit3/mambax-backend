import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/api';

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
            // The API might return { items: [] } or just []
            // Based on DiscoverPage: setProfiles(data) -> implies data is Profile[]
            // But api.ts says: return response.json() from /feed
            // Let's assume it returns an array for now based on existing usage
            return data as unknown as Profile[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });
}

export function useSwipeStatus() {
    return useQuery({
        queryKey: ['swipe-status'],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("/api_proxy/swipe-status", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch swipe status");
            return res.json() as Promise<SwipeStatus>;
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
            const token = localStorage.getItem("token");
            const res = await fetch("/api_proxy/discover/prefetch?limit=10", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Prefetch failed");
            return res.json() as Promise<Profile[]>;
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
            const token = localStorage.getItem("token");
            const res = await fetch("/api_proxy/undo-swipe", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || "Undo failed");
            }
            return res.json();
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
            const token = localStorage.getItem("token");
            const res = await fetch("/api_proxy/discover/daily-picks", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch daily picks");
            const data = await res.json();
            return data.picks as Profile[];
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 часа
    });
}

export function useSmartFilters() {
    return useQuery({
        queryKey: ['smart-filters'],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            const res = await fetch("/api_proxy/discover/smart-filters", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch smart filters");
            return res.json();
        },
        staleTime: 1000 * 60 * 30, // 30 минут
    });
}
