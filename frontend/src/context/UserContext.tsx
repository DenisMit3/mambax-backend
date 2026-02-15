"use client";

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/api';
import { wsService } from '@/services/websocket';
import { notificationService } from '@/services/notificationService';

// Define minimal user interface needed for context
// Expand as needed based on UserResponse
interface UXPreferences {
    sounds_enabled: boolean;
    haptic_enabled: boolean;
    reduced_motion: boolean;
}

interface User {
    id: string;
    name: string;
    username?: string;
    email?: string;
    photo?: string;
    photos?: string[];
    stars_balance: number;
    is_vip: boolean;
    ux_preferences?: UXPreferences;
}

interface UserContextType {
    user: User | null;
    refreshUser: () => Promise<void>;
    updateBalance: (newBalance: number) => void;
    updateUXPreferences: (prefs: Partial<UXPreferences>) => Promise<void>;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
    user: null,
    refreshUser: async () => { },
    updateBalance: () => { },
    updateUXPreferences: async () => { },
    isLoading: true
});

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();

    const { data: user = null, isLoading, refetch } = useQuery({
        queryKey: ['user', 'me'],
        queryFn: async () => {
            const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
            if (!token) {
                return null;
            }
            try {
                const data = await authService.getMe();
                if (data) {
                    // Ensure stars_balance is present
                    const u = data as User & { stars_balance?: number };
                    if (typeof u.stars_balance === 'undefined') u.stars_balance = 0;
                    return u as User;
                }
                return null;
            } catch (error) {
                console.error("Failed to fetch user context", error);
                return null;
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    useEffect(() => {
        // Listen for real-time balance updates
        const handleBalanceUpdate = (data: { balance?: number }) => {
            if (typeof data.balance === 'number') {
                queryClient.setQueryData(['user', 'me'], (oldUser: User | null) => {
                    if (!oldUser) return null;
                    return { ...oldUser, stars_balance: data.balance };
                });
            }
        };

        wsService.on("balance_update", handleBalanceUpdate);

        return () => {
            wsService.off("balance_update", handleBalanceUpdate);
        };
    }, [queryClient]);

    // Connect wsService + register push when user is authenticated
    const wsConnectedRef = useRef(false);
    useEffect(() => {
        if (!user) {
            if (wsConnectedRef.current) {
                wsService.disconnect();
                wsConnectedRef.current = false;
            }
            return;
        }

        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        if (token && !wsConnectedRef.current) {
            wsService.connect(token);
            wsConnectedRef.current = true;

            // Register push notifications (asks permission once)
            notificationService.register().catch(() => {});
        }

        return () => {
            wsService.disconnect();
            wsConnectedRef.current = false;
        };
    }, [user]);

    const updateBalance = (newBalance: number) => {
        queryClient.setQueryData(['user', 'me'], (oldUser: User | null) => {
            if (!oldUser) return null;
            return { ...oldUser, stars_balance: newBalance };
        });
    };

    const refreshUser = async () => {
        await refetch();
    };

    const updateUXPreferences = async (prefs: Partial<UXPreferences>) => {
        if (!user) return;

        const updatedPrefs = {
            ...(user.ux_preferences || {
                sounds_enabled: true,
                haptic_enabled: true,
                reduced_motion: false
            }),
            ...prefs
        };

        try {
            // Optimistic update
            queryClient.setQueryData(['user', 'me'], (old: User | null) => {
                if (!old) return null;
                return { ...old, ux_preferences: updatedPrefs };
            });

            await authService.updateProfile({ ux_preferences: updatedPrefs });
        } catch (error) {
            console.error("Failed to update UX preferences", error);
            // Revert on error
            await refetch();
        }
    };

    return (
        <UserContext.Provider value={{ user, refreshUser, updateBalance, updateUXPreferences, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}
