'use client';

import { useEffect, useRef } from 'react';
import { notificationsApi } from '@/services/api/notifications';

/**
 * Hook to register push notifications via Web Push API.
 * Subscribes the user's browser to push notifications so they
 * receive alerts even when the site is closed.
 */
export function usePushNotifications() {
    const registered = useRef(false);

    useEffect(() => {
        if (registered.current) return;
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) return;

        registered.current = true;

        (async () => {
            try {
                // 1. Get VAPID public key from backend
                const { publicKey } = await notificationsApi.getVapidKey();
                if (!publicKey) return;

                // 2. Wait for service worker to be ready
                const registration = await navigator.serviceWorker.ready;

                // 3. Check existing subscription
                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    // 4. Request notification permission
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') return;

                    // 5. Subscribe to push
                    const urlBase64ToUint8Array = (base64String: string) => {
                        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
                        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                        const rawData = window.atob(base64);
                        const outputArray = new Uint8Array(rawData.length);
                        for (let i = 0; i < rawData.length; ++i) {
                            outputArray[i] = rawData.charCodeAt(i);
                        }
                        return outputArray;
                    };

                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicKey),
                    });
                }

                // 6. Send subscription to backend
                const subJson = subscription.toJSON();
                if (subJson.endpoint && subJson.keys) {
                    await notificationsApi.subscribePush({
                        endpoint: subJson.endpoint,
                        keys: {
                            p256dh: subJson.keys.p256dh!,
                            auth: subJson.keys.auth!,
                        },
                    });
                }
            } catch (err) {
                // Silently fail — push is optional
                console.debug('[Push] Registration failed:', err);
            }
        })();
    }, []);
}
