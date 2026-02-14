'use client';

import { useEffect } from 'react';

/**
 * PERF: Service Worker Registration Component
 * Registers SW for API response caching and push notifications
 */
export function RegisterServiceWorker() {
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    // Check for updates periodically
                    intervalId = setInterval(() => {
                        reg.update();
                    }, 60 * 60 * 1000); // Check every hour
                })
                .catch(err => console.error('SW registration failed:', err));
        }
        return () => clearInterval(intervalId);
    }, []);
    
    return null;
}
