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
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            if (token) {
                if (!cancelled) {
                    setIsAuthed(true);
                    setIsChecking(false);
                }
                return;
            }

            // No token — try silent re-auth via Telegram initData
            const initData = window.Telegram?.WebApp?.initData || sessionStorage.getItem('tg_init_data') || '';
            if (initData && initData.trim()) {
                console.log('[useRequireAuth] No token, attempting Telegram re-auth...');
                try {
                    await authService.telegramLogin(initData);
                    const newToken = localStorage.getItem('accessToken');
                    if (newToken && !cancelled) {
                        console.log('[useRequireAuth] Re-auth success');
                        setIsAuthed(true);
                        setIsChecking(false);
                        return;
                    }
                } catch (e) {
                    console.error('[useRequireAuth] Re-auth failed:', e);
                }
            }

            // No token and re-auth failed — redirect
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
