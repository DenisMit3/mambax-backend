'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // PERF: Increased staleTime to 5 minutes for better caching
                staleTime: 5 * 60 * 1000, // 5 minutes
                // PERF-014: Garbage collection after 10 minutes to prevent memory leaks
                gcTime: 10 * 60 * 1000,
                retry: 1,
                // PERF-014: Reduce unnecessary refetches
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
