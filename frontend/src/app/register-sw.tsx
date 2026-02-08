'use client';

import { useEffect } from 'react';

/**
 * PERF: Service Worker Registration Component
 * Registers SW for API response caching and push notifications
 */
export function RegisterServiceWorker() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    console.log('SW registered:', reg.scope);
                    
                    // Check for updates periodically
                    setInterval(() => {
                        reg.update();
                    }, 60 * 60 * 1000); // Check every hour
                })
                .catch(err => console.error('SW registration failed:', err));
        }
    }, []);
    
    return null;
}
