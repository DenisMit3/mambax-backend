"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
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
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setIsLoading(false);
                return;
            }
            const data = await authService.getMe();
            if (data) {
                // Ensure stars_balance is present
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const u = data as any;
                if (typeof u.stars_balance === 'undefined') u.stars_balance = 0;
                setUser(u);
            }
        } catch (e) {
            console.error("Failed to fetch user context", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();

        // Listen for real-time balance updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleBalanceUpdate = (data: any) => {
            console.log("Balance update received:", data);
            if (typeof data.balance === 'number') {
                setUser(prev => prev ? { ...prev, stars_balance: data.balance } : null);
            }
        };

        wsService.on("balance_update", handleBalanceUpdate);

        return () => {
            wsService.off("balance_update", handleBalanceUpdate);
        };
    }, []);

    const updateBalance = (newBalance: number) => {
        if (user) {
            setUser({ ...user, stars_balance: newBalance });
        }
    };

    return (
        <UserContext.Provider value={{ user, refreshUser, updateBalance, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}
