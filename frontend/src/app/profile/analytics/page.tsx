'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';
import { authService } from '@/services/api';
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Тип данных аналитики профиля
interface AnalyticsData {
    profileViews: {
        total: number;
        change: number;
        chartData: { date: string; views: number }[];
    };
    likes: {
        received: number;
        sent: number;
        matches: number;
        changeReceived: number;
        changeSent: number;
        changeMatches: number;
    };
    superLikes: {
        received: number;
        sent: number;
        changeReceived: number;
        changeSent: number;
    };
    messages: {
        sent: number;
        received: number;
        responseRate: number;
        changeSent: number;
        changeReceived: number;
        changeResponseRate: number;
    };
    peakActivity: {
        day: string;
        hour: string;
        engagement: number;
    };
    demographics: {
        ageGroups: { range: string; percentage: number }[];
        locations: { city: string; percentage: number }[];
    };
}

export default function AnalyticsPage() {
    const router = useRouter();
    const { isAuthed, isChecking } = useRequireAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Загрузка аналитики и профиля пользователя
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [analyticsRes, profileRes] = await Promise.all([
                authService.getAnalytics(),
                authService.getMe(),
            ]);
            setData(analyticsRes.data);
            setIsPremium(profileRes.data.subscription_tier !== 'free');
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Не удалось загрузить аналитику';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthed) return;
        fetchData();
    }, [isAuthed, fetchData]);

    // Состояние загрузки
    if (loading || isChecking) {
        return (
            <main className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm">Загрузка аналитики...</p>
                </div>
            </main>
        );
    }

    // Состояние ошибки
    if (error || !data) {
        return (
            <main className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-red-400 text-lg">😔 {error || 'Данные недоступны'}</p>
                    <button
                        onClick={fetchData}
                        className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors"
                    >
                        Попробовать снова
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main>
            <AdvancedAnalyticsDashboard
                data={data}
                isPremium={isPremium}
                onUpgradeToPremium={() => router.push('/profile/premium')}
            />
        </main>
    );
}
