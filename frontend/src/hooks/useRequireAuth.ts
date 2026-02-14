'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';

/**
 * Hook that checks for auth token and redirects to /auth/phone if missing.
 * If no token but Telegram initData is available, attempts silent re-auth first.
 * Returns { isAuthed, isChecking } so pages can show a loading skeleton.
 */
export function useRequireAuth() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            const accessToken = localStorage.getItem('accessToken');
            const legacyToken = localStorage.getItem('token');
            const token = accessToken || legacyToken;
            
            // DEBUG: Log state for remote debugging
            console.log('[useRequireAuth] CHECK:', {
                hasAccessToken: !!accessToken,
                hasLegacyToken: !!legacyToken,
                tokenLen: token ? token.length : 0,
                path: window.location.pathname,
                allKeys: Object.keys(localStorage),
            });

            if (token) {
                if (!cancelled) {
                    setIsAuthed(true);
                    setIsChecking(false);
                }
                return;
            }

            // No token — try silent re-auth via Telegram initData
            const tgWebApp = window.Telegram?.WebApp?.initData || '';
            const tgSession = sessionStorage.getItem('tg_init_data') || '';
            const initData = tgWebApp || tgSession;
            
            console.log('[useRequireAuth] NO TOKEN, trying re-auth:', {
                hasTgWebApp: !!tgWebApp,
                tgWebAppLen: tgWebApp.length,
                hasTgSession: !!tgSession,
                tgSessionLen: tgSession.length,
                authRedirectReason: sessionStorage.getItem('auth_redirect_reason'),
            });

            if (initData && initData.trim()) {
                console.log('[useRequireAuth] Attempting Telegram re-auth...');
                try {
                    const result = await authService.telegramLogin(initData);
                    const newToken = localStorage.getItem('accessToken');
                    console.log('[useRequireAuth] Re-auth result:', {
                        hasAccessToken: !!result?.access_token,
                        storedToken: !!newToken,
                    });
                    if (newToken && !cancelled) {
                        console.log('[useRequireAuth] Re-auth SUCCESS');
                        setIsAuthed(true);
                        setIsChecking(false);
                        return;
                    }
                } catch (e) {
                    console.error('[useRequireAuth] Re-auth FAILED:', e);
                }
            }

            // No token and re-auth failed — redirect
            console.log('[useRequireAuth] REDIRECTING to /auth/phone');
            if (!cancelled) {
                router.replace('/auth/phone');
                setIsChecking(false);
            }
        };

        check();
        return () => { cancelled = true; };
    }, [router]);

    return { isAuthed, isChecking };
}
