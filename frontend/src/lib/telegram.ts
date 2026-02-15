import { useCallback, useEffect, useMemo, useState } from 'react';

interface WebAppUser {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        query_id?: string;
        user?: WebAppUser;
        auth_date: number;
        hash: string;
        start_param?: string;
    };
    version: string;
    ready: () => void;
    expand: () => void;
    close: () => void;
    BackButton: {
        isVisible: boolean;
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
    };
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        show: () => void;
        hide: () => void;
        enable: () => void;
        disable: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
        showProgress: (leaveActive: boolean) => void;
        hideProgress: () => void;
        setParams: (params: Record<string, unknown>) => void;
    };
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
        secondary_bg_color?: string;
    };
    colorScheme: 'light' | 'dark';
    viewportHeight: number;
    viewportStableHeight: number;
    isExpanded: boolean;
    disableVerticalSwipes?: () => void;
    safeAreaInset?: { top: number; bottom: number; left: number; right: number };

    // CloudStorage (Hardware/Hardcore feature)
    CloudStorage: {
        setItem: (key: string, value: string, callback?: (err: Error | null, stored: boolean) => void) => void;
        getItem: (key: string, callback: (err: Error | null, value: string) => void) => void;
        getItems: (keys: string[], callback: (err: Error | null, values: Record<string, string>) => void) => void;
        removeItem: (key: string, callback?: (err: Error | null, removed: boolean) => void) => void;
    };
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
        __h5LogDone?: boolean;
    }
}

// Flag to track if Telegram was already initialized
let telegramHookInitialized = false;

export const useTelegram = () => {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            setWebApp(tg);

            // Save initData to sessionStorage so it survives page navigations
            if (tg.initData && tg.initData.length > 0) {
                try { sessionStorage.setItem('tg_init_data', tg.initData); } catch(e) { console.warn('SessionStorage write failed:', e); }
            }

            // Only call ready/expand once across all hook instances
            if (!telegramHookInitialized) {
                tg.ready();
                tg.expand();
                tg.disableVerticalSwipes?.();
                telegramHookInitialized = true;
            }

            // Set theme colors (safe to call multiple times)
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0A0A0B');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#FFFFFF');

            // Viewport height CSS variable for Telegram Mini App
            document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportStableHeight}px`);

            // Safe area insets
            if (tg.safeAreaInset) {
                document.documentElement.style.setProperty('--safe-area-bottom', `${tg.safeAreaInset.bottom}px`);
            }

            // VisualViewport fallback for keyboard handling
            let scheduled = false;
            const setVVH = () => {
                const h = window.visualViewport?.height ?? window.innerHeight;
                document.documentElement.style.setProperty('--vvh', `${Math.round(h)}px`);
            };
            const scheduleVVH = () => {
                if (scheduled) return;
                scheduled = true;
                requestAnimationFrame(() => { scheduled = false; setVVH(); });
            };
            setVVH();
            window.visualViewport?.addEventListener('resize', scheduleVVH);
            window.visualViewport?.addEventListener('scroll', scheduleVVH);
        }
    }, []);

    // Мемоизация hapticFeedback — предотвращает пересоздание объекта на каждый рендер
    const hapticFeedback = useMemo(() => ({
        light: () => webApp?.HapticFeedback.impactOccurred('light'),
        medium: () => webApp?.HapticFeedback.impactOccurred('medium'),
        heavy: () => webApp?.HapticFeedback.impactOccurred('heavy'),
        success: () => webApp?.HapticFeedback.notificationOccurred('success'),
        error: () => webApp?.HapticFeedback.notificationOccurred('error'),
        selection: () => webApp?.HapticFeedback.selectionChanged(),
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') =>
            webApp?.HapticFeedback.impactOccurred(style),
        notificationOccurred: (type: 'error' | 'success' | 'warning') =>
            webApp?.HapticFeedback.notificationOccurred(type)
    }), [webApp]);

    // Мемоизация проверки версии
    const isVersionAtLeast = useCallback((minVersion: string): boolean => {
        if (!webApp?.version) return false;
        const current = webApp.version.split('.').map(Number);
        const required = minVersion.split('.').map(Number);
        for (let i = 0; i < required.length; i++) {
            if ((current[i] || 0) > required[i]) return true;
            if ((current[i] || 0) < required[i]) return false;
        }
        return true;
    }, [webApp]);

    // Мемоизация всего return-объекта — предотвращает бесконечные ре-рендеры
    return useMemo(() => ({
        webApp,
        hapticFeedback,
        user: webApp?.initDataUnsafe?.user,
        initData: webApp?.initData || (typeof window !== 'undefined' ? sessionStorage.getItem('tg_init_data') : null) || '',
        isReady: !!webApp,
        version: webApp?.version,
        isVersionAtLeast,
        // BackButton requires version 6.1+
        supportsBackButton: isVersionAtLeast('6.1'),
    }), [webApp, hapticFeedback, isVersionAtLeast]);
};
