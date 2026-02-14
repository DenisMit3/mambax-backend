'use client';

import { useState, useEffect, useCallback } from 'react';
import { httpClient } from '@/lib/http-client';
import { UserDetail } from './types';

interface UseUserActionsReturn {
    user: UserDetail | null;
    loading: boolean;
    fetchError: string | null;
    fetchUserDetails: () => Promise<void>;
    handleAction: (action: string) => Promise<void>;
    handleUpdateStars: (amount: number, action: 'add' | 'remove', reason: string) => Promise<boolean>;
    handleGdprExport: () => Promise<boolean>;
}

/** Хук для загрузки данных пользователя и выполнения действий */
export function useUserActions(userId: string): UseUserActionsReturn {
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchUserDetails = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const data = await httpClient.get<UserDetail>(`/admin/users/${userId}`);
            setUser(data);
        } catch (error) {
            console.error('Error fetching user:', error);
            setFetchError('Ошибка сети. Проверьте подключение и попробуйте снова.');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        let cancelled = false;
        fetchUserDetails().then(() => { if (cancelled) return; });
        return () => { cancelled = true; };
    }, [fetchUserDetails]);

    const handleAction = useCallback(async (action: string) => {
        if (!confirm(`Вы уверены, что хотите выполнить "${action}" для этого пользователя?`)) return;
        try {
            await httpClient.post(`/admin/users/${userId}/action`, { action });
            fetchUserDetails();
        } catch (error) {
            console.error('Error performing action:', error);
        }
    }, [userId, fetchUserDetails]);

    const handleUpdateStars = useCallback(async (amount: number, action: 'add' | 'remove', reason: string): Promise<boolean> => {
        try {
            await httpClient.post(`/admin/users/${userId}/stars`, { amount, action, reason });
            fetchUserDetails();
            return true;
        } catch (error) {
            console.error('Error updating stars:', error);
            return false;
        }
    }, [userId, fetchUserDetails]);

    const handleGdprExport = useCallback(async (): Promise<boolean> => {
        try {
            const data = await httpClient.get(`/admin/users/${userId}/gdpr-export`);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gdpr_export_${userId}.json`;
            a.click();
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('GDPR export error:', error);
            return false;
        }
    }, [userId]);

    return { user, loading, fetchError, fetchUserDetails, handleAction, handleUpdateStars, handleGdprExport };
}
