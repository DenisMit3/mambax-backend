import { useEffect, useState } from 'react';

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
        setParams: (params: any) => void;
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

    // CloudStorage (Hardware/Hardcore feature)
    CloudStorage: {
        setItem: (key: string, value: string, callback?: (err: any, stored: boolean) => void) => void;
        getItem: (key: string, callback: (err: any, value: string) => void) => void;
        getItems: (keys: string[], callback: (err: any, values: any) => void) => void;
        removeItem: (key: string, callback?: (err: any, removed: boolean) => void) => void;
    };
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

export const useTelegram = () => {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            setWebApp(tg);

            tg.ready();
            tg.expand();

            // Set theme colors
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0A0A0B');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#FFFFFF');
        }
    }, []);

    const hapticFeedback = {
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
    };

    return {
        webApp,
        hapticFeedback,
        user: webApp?.initDataUnsafe?.user,
        initData: webApp?.initData,
        isReady: !!webApp,
    };
};
