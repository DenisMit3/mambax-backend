
import { authService } from "./api";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const notificationService = {
    async register() {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        try {
            // Register SW
            const registration = await navigator.serviceWorker.register('/sw.js');

            // Check permission
            if (Notification.permission === 'denied') {
                console.log("Notifications blocked");
                return;
            }

            // Ask permission if default
            if (Notification.permission === 'default') {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') return;
            }

            // Get VAPID Key
            const data = await authService.getVapidKey();
            const publicKey = data.publicKey;

            if (!publicKey) {
                console.warn("No VAPID public key content");
                return;
            }

            const convertedVapidKey = urlBase64ToUint8Array(publicKey);

            // Subscribe
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // Send to backend
            const keys = subscription.toJSON().keys;
            if (keys && keys.p256dh && keys.auth) {
                await authService.subscribePush({
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: keys.p256dh,
                        auth: keys.auth
                    }
                });
                console.log("Push subscribed successfully");
            }

        } catch (e) {
            console.error("Push registration error", e);
        }
    }
};
