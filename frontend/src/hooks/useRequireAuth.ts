'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook that checks for auth token and redirects to /auth/phone if missing.
 * Returns { isAuthed, isChecking } so pages can show a loading skeleton.
 */
export function useRequireAuth() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) {
            router.replace('/auth/phone');
        } else {
            setIsAuthed(true);
        }
        setIsChecking(false);
    }, [router]);

    return { isAuthed, isChecking };
}
