'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserDetail } from './types';

// Получение токена авторизации
const getAuthHeaders = () => {
    const token = (() => { try { return localStorage.getItem('token'); } catch { return null; } })();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

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
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                setUser(await response.json());
            } else {
                setFetchError(`Не удалось загрузить пользователя (HTTP ${response.status})`);
                setUser(null);
            }
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
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}/action`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ action }),
            });
            if (response.ok) fetchUserDetails();
        } catch (error) {
            console.error('Error performing action:', error);
        }
    }, [userId, fetchUserDetails]);

    const handleUpdateStars = useCallback(async (amount: number, action: 'add' | 'remove', reason: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}/stars`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ amount, action, reason }),
            });
            if (response.ok) {
                fetchUserDetails();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating stars:', error);
            return false;
        }
    }, [userId, fetchUserDetails]);

    const handleGdprExport = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}/gdpr-export`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gdpr_export_${userId}.json`;
                a.click();
                URL.revokeObjectURL(url);
                return true;
            }
            return false;
        } catch (error) {
            console.error('GDPR export error:', error);
            return false;
        }
    }, [userId]);

    return { user, loading, fetchError, fetchUserDetails, handleAction, handleUpdateStars, handleGdprExport };
}
