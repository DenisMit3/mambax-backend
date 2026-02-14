'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { httpClient } from '@/lib/http-client';

/**
 * Hook that ensures the user is authenticated.
 * 
 * Flow:
 * 1. Check localStorage for existing JWT token
 * 2. If no token but Telegram initData available → silent re-auth
 * 3. If still no token → redirect to /auth/phone
 * 
 * Returns { isAuthed, isChecking } for loading states.
 */
export function useRequireAuth() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            console.log('[AUTH-FLOW] useRequireAuth: starting check');
            // 1. Already have a token?
            if (httpClient.isAuthenticated()) {
                console.log('[AUTH-FLOW] useRequireAuth: token exists, authed=true');
                if (!cancelled) {
                    setIsAuthed(true);
                    setIsChecking(false);
                }
                return;
            }

            // 2. No token — try Telegram initData
            const initData = (typeof window !== 'undefined')
                ? (window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '')
                : '';

            console.log('[AUTH-FLOW] useRequireAuth: no token, initData length=', initData.length);

            if (initData && initData.trim()) {
                try {
                    console.log('[AUTH-FLOW] useRequireAuth: calling telegramLogin...');
                    await authService.telegramLogin(initData);
                    console.log('[AUTH-FLOW] useRequireAuth: telegramLogin done, isAuthenticated=', httpClient.isAuthenticated());
                    if (httpClient.isAuthenticated() && !cancelled) {
                        setIsAuthed(true);
                        setIsChecking(false);
                        return;
                    }
                } catch (e) {
                    console.error('[AUTH-FLOW] useRequireAuth: telegramLogin failed:', e);
                    // Re-auth failed, fall through to redirect
                }
            }

            // 3. No auth possible — redirect
            console.log('[AUTH-FLOW] useRequireAuth: no auth, redirecting to /auth/phone');
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
