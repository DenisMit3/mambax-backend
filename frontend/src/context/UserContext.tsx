"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/api';
import { wsService } from '@/services/websocket';

// Define minimal user interface needed for context
// Expand as needed based on UserResponse
interface User {
    id: string;
    name: string;
    username?: string;
    email?: string;
    photo?: string;
    photos?: string[];
    stars_balance: number;
    is_vip: boolean;
    // Add other fields as necessary
}

interface UserContextType {
    user: User | null;
    refreshUser: () => Promise<void>;
    updateBalance: (newBalance: number) => void;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
    user: null,
    refreshUser: async () => { },
    updateBalance: () => { },
    isLoading: true
});

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();

    const { data: user = null, isLoading, refetch } = useQuery({
        queryKey: ['user', 'me'],
        queryFn: async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                return null;
            }
            try {
                const data = await authService.getMe();
                if (data) {
                    // Ensure stars_balance is present
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const u = data as any;
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleBalanceUpdate = (data: any) => {
            console.log("Balance update received:", data);
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

    const updateBalance = (newBalance: number) => {
        queryClient.setQueryData(['user', 'me'], (oldUser: User | null) => {
            if (!oldUser) return null;
            return { ...oldUser, stars_balance: newBalance };
        });
    };

    const refreshUser = async () => {
        await refetch();
    };

    return (
        <UserContext.Provider value={{ user, refreshUser, updateBalance, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}
